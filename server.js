"use strict";
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, "feuerwehr-pruefung.sqlite"));
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS exams (
 id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, title TEXT NOT NULL,
 type TEXT NOT NULL, difficulty TEXT NOT NULL, pass_percent INTEGER NOT NULL,
 duration INTEGER NOT NULL, questions TEXT NOT NULL, created_at TEXT NOT NULL,
 published INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS attempts (
 id TEXT PRIMARY KEY, exam_id TEXT NOT NULL, first_name TEXT NOT NULL,
 last_name TEXT NOT NULL, department TEXT NOT NULL, answers TEXT NOT NULL DEFAULT '[]',
 points INTEGER NOT NULL DEFAULT 0, max_points INTEGER NOT NULL DEFAULT 0,
 percent INTEGER NOT NULL DEFAULT 0, passed INTEGER NOT NULL DEFAULT 0,
 submitted_at TEXT, created_at TEXT NOT NULL,
 FOREIGN KEY(exam_id) REFERENCES exams(id)
);
`);
app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(session({
 secret: process.env.SESSION_SECRET || "change-this-session-secret-before-production",
 resave: false, saveUninitialized: false,
 cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 8 * 60 * 60 * 1000 }
}));
app.use(express.static(__dirname));
const adminUser = process.env.ADMIN_USERNAME || "ausbilder";
const adminPassword = process.env.ADMIN_PASSWORD || "";
const requireAdmin = (req,res,next) => req.session && req.session.admin ? next() : res.status(401).json({error:"Bitte zuerst als Ausbilder anmelden."});
const safeExam = row => ({ id:row.id, code:row.code, title:row.title, type:row.type, difficulty:row.difficulty, passPercent:row.pass_percent, duration:row.duration, questions:JSON.parse(row.questions), createdAt:row.created_at, published:!!row.published });
const makeId = () => require("crypto").randomUUID();
const makeCode = () => require("crypto").randomBytes(3).toString("hex").toUpperCase();

app.get("/api/health", (req,res) => res.json({ok:true, service:"Feuerwehr-Pruefung-V1"}));
app.post("/api/admin/login", async (req,res) => {
 const {username,password} = req.body || {};
 if (!adminPassword) return res.status(503).json({error:"ADMIN_PASSWORD ist auf dem Server noch nicht gesetzt."});
 const okUser = typeof username === "string" && username === adminUser;
 const okPass = typeof password === "string" && await bcrypt.compare(password, await bcrypt.hash(adminPassword, 10));
 if (!okUser || !okPass) return res.status(401).json({error:"Benutzername oder Passwort falsch."});
 req.session.admin = true;
 req.session.username = adminUser;
 res.json({ok:true,username:adminUser});
});
app.get("/api/admin/me", (req,res) => res.json({authenticated:!!(req.session && req.session.admin),username:req.session?.username || null}));
app.post("/api/admin/logout", (req,res) => req.session.destroy(() => res.json({ok:true})));

app.get("/api/exams/:code", (req,res) => {
 const row = db.prepare("SELECT * FROM exams WHERE code=? AND published=1").get(String(req.params.code).toUpperCase());
 if (!row) return res.status(404).json({error:"Prüfungscode nicht gefunden."});
 const exam = safeExam(row);
 exam.questions = exam.questions.map(({question,options,type}) => ({question,options,type}));
 res.json(exam);
});
app.get("/api/admin/exams", requireAdmin, (req,res) => {
 const rows = db.prepare("SELECT * FROM exams ORDER BY created_at DESC").all();
 res.json(rows.map(row => ({...safeExam(row),attemptCount:db.prepare("SELECT COUNT(*) n FROM attempts WHERE exam_id=? AND submitted_at IS NOT NULL").get(row.id).n})));
});
app.post("/api/admin/exams", requireAdmin, (req,res) => {
 const b=req.body||{};
 const title=String(b.title||"").trim(), questions=Array.isArray(b.questions)?b.questions:[];
 if (!title || !questions.length || questions.length>100) return res.status(400).json({error:"Titel und mindestens eine Frage sind erforderlich (max. 100)."});
 const cleaned=[];
 for (const q of questions) {
  const question=String(q.question||"").trim(), options=Array.isArray(q.options)?q.options.map(x=>String(x).trim()).filter(Boolean):[];
  const answer=Number(q.answer);
  if (!question || options.length<2 || !Number.isInteger(answer) || answer<0 || answer>=options.length) return res.status(400).json({error:"Jede Frage benötigt mindestens zwei Antwortmöglichkeiten und eine gültige richtige Antwort."});
  cleaned.push({type:"mc",question,options,answer});
 }
 const id=makeId(); let code=makeCode();
 while(db.prepare("SELECT 1 FROM exams WHERE code=?").get(code)) code=makeCode();
 const now=new Date().toISOString();
 db.prepare("INSERT INTO exams (id,code,title,type,difficulty,pass_percent,duration,questions,created_at,published) VALUES (?,?,?,?,?,?,?,?,?,1)")
 .run(id,code,title,String(b.type||"Feuerwehr"),String(b.difficulty||"Mittel"),Math.min(100,Math.max(1,Number(b.passPercent)||70)),Math.min(300,Math.max(1,Number(b.duration)||30)),JSON.stringify(cleaned),now);
 res.status(201).json({id,code,title,questionCount:cleaned.length});
});
app.delete("/api/admin/exams/:id", requireAdmin, (req,res) => {
 const id=req.params.id;
 db.prepare("DELETE FROM attempts WHERE exam_id=?").run(id);
 const result=db.prepare("DELETE FROM exams WHERE id=?").run(id);
 if (!result.changes) return res.status(404).json({error:"Prüfung nicht gefunden."});
 res.json({ok:true});
});
app.post("/api/attempts", (req,res) => {
 const b=req.body||{}, code=String(b.code||"").toUpperCase();
 const row=db.prepare("SELECT * FROM exams WHERE code=? AND published=1").get(code);
 if(!row) return res.status(404).json({error:"Prüfungscode nicht gefunden."});
 const firstName=String(b.firstName||"").trim(), lastName=String(b.lastName||"").trim(), department=String(b.department||"").trim();
 if(!firstName||!lastName||!department) return res.status(400).json({error:"Bitte alle Teilnehmerdaten ausfüllen."});
 const id=makeId(), now=new Date().toISOString();
 db.prepare("INSERT INTO attempts (id,exam_id,first_name,last_name,department,created_at) VALUES (?,?,?,?,?,?)").run(id,row.id,firstName,lastName,department,now);
 const exam=safeExam(row);
 res.status(201).json({attemptId:id,exam:{id:exam.id,title:exam.title,code:exam.code,duration:exam.duration,questions:exam.questions.map(({question,options})=>({question,options}))}});
});
app.post("/api/attempts/:id/submit", (req,res) => {
 const attempt=db.prepare("SELECT * FROM attempts WHERE id=?").get(req.params.id);
 if(!attempt) return res.status(404).json({error:"Teilnahme nicht gefunden."});
 if(attempt.submitted_at) return res.status(409).json({error:"Diese Prüfung wurde bereits abgegeben."});
 const exam=db.prepare("SELECT * FROM exams WHERE id=?").get(attempt.exam_id);
 if(!exam) return res.status(404).json({error:"Prüfung nicht gefunden."});
 const questions=JSON.parse(exam.questions), answers=Array.isArray(req.body?.answers)?req.body.answers:[];
 let points=0;
 const details=questions.map((q,i)=>{const a=Number(answers[i]);const correct=Number.isInteger(a)&&a===q.answer;if(correct)points++;return {question:q.question,selected:Number.isInteger(a)?a:null,correctAnswer:q.answer,correct};});
 const max=questions.length, percent=Math.round(points/max*100), passed=percent>=exam.pass_percent, submitted=new Date().toISOString();
 db.prepare("UPDATE attempts SET answers=?,points=?,max_points=?,percent=?,passed=?,submitted_at=? WHERE id=?")
 .run(JSON.stringify(details),points,max,percent,passed?1:0,submitted,attempt.id);
 res.json({id:attempt.id,points,maxPoints:max,percent,passed});
});
app.get("/api/teilnehmer/:id", (req,res) => {
 const row=db.prepare("SELECT a.*,e.title exam_title,e.pass_percent FROM attempts a JOIN exams e ON e.id=a.exam_id WHERE a.id=?").get(req.params.id);
 if(!row) return res.status(404).json({error:"Ergebnis nicht gefunden."});
 if(!row.submitted_at) return res.status(409).json({error:"Prüfung wurde noch nicht abgegeben."});
 res.json({id:row.id,vorname:row.first_name,nachname:row.last_name,feuerwehr:row.department,titel:row.exam_title,punkte:row.points,maxPunkte:row.max_points,prozent:row.percent,bestanden:!!row.passed,details:JSON.parse(row.answers),submittedAt:row.submitted_at});
});
app.get("/api/auswertung/:id", requireAdmin, (req,res) => {
 const exam=db.prepare("SELECT * FROM exams WHERE id=?").get(req.params.id);
 if(!exam) return res.status(404).json({error:"Prüfung nicht gefunden."});
 const rows=db.prepare("SELECT * FROM attempts WHERE exam_id=? AND submitted_at IS NOT NULL ORDER BY submitted_at DESC").all(exam.id);
 const average=rows.length?Math.round(rows.reduce((n,r)=>n+r.percent,0)/rows.length):0;
 res.json({exam:safeExam(exam),stats:{teilnehmer:rows.length,durchschnitt:average,bestanden:rows.filter(r=>r.passed).length},teilnehmer:rows.map(r=>({id:r.id,vorname:r.first_name,nachname:r.last_name,feuerwehr:r.department,punkte:r.points,max_punkte:r.max_points,prozent:r.percent,bestanden:!!r.passed,submittedAt:r.submitted_at}))});
});
app.get("*", (req,res) => res.sendFile(path.join(__dirname,"index.html")));
app.listen(PORT,"0.0.0.0",()=>console.log("Feuerwehr-Pruefung-V1 läuft auf Port "+PORT));
