"use strict";
const express = require("express");
const session = require("express-session");
const FileStore = require("session-file-store")(session);
const helmet = require("helmet");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(path.join(DATA_DIR, "sessions"), { recursive: true });
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

db.exec(`
CREATE TABLE IF NOT EXISTS question_bank (
 id TEXT PRIMARY KEY, topic TEXT NOT NULL, question TEXT NOT NULL, options TEXT NOT NULL,
 answer INTEGER NOT NULL, explanation TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT 'Grundlagen-Fragenkatalog',
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS learning_answers (
 learner_key TEXT NOT NULL, question_id TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
 correct_count INTEGER NOT NULL DEFAULT 0, last_correct INTEGER NOT NULL DEFAULT 0,
 updated_at TEXT NOT NULL, PRIMARY KEY(learner_key, question_id)
);
CREATE TABLE IF NOT EXISTS materials (
 id TEXT PRIMARY KEY, original_name TEXT NOT NULL, stored_name TEXT NOT NULL,
 mime_type TEXT NOT NULL, size INTEGER NOT NULL, uploaded_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS study_groups (
 code TEXT PRIMARY KEY, name TEXT NOT NULL, topic TEXT NOT NULL, host_key TEXT NOT NULL,
 current_question INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS study_group_members (
 code TEXT NOT NULL, learner_key TEXT NOT NULL, display_name TEXT NOT NULL,
 joined_at TEXT NOT NULL, PRIMARY KEY(code, learner_key),
 FOREIGN KEY(code) REFERENCES study_groups(code) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS study_group_answers (
 code TEXT NOT NULL, learner_key TEXT NOT NULL, question_id TEXT NOT NULL,
 answer INTEGER NOT NULL, correct INTEGER NOT NULL, answered_at TEXT NOT NULL,
 PRIMARY KEY(code, learner_key, question_id)
);
`);
const starterQuestions = [
["Grundlagen","Welche Notrufnummer gilt in Deutschland für Feuerwehr und Rettungsdienst?",["110","112","115","116117"],1,"Über 112 erreichst du Feuerwehr und Rettungsdienst."],
["Grundlagen","Was bedeutet die Abkürzung FwDV?",["Feuerwehr-Dienstvorschrift","Fahrzeug-Daten-Verzeichnis","Führungsdienst-Verordnung","Feuerwehr- und Wasser-Dienst"],0,"FwDV steht für Feuerwehr-Dienstvorschrift."],
["Grundlagen","Wer trägt an der Einsatzstelle die Verantwortung für die Leitung?",["Der Fahrzeugführer des ersten Privatwagens","Die Einsatzleitung","Der Melder","Der Maschinist"],1,"Die Einsatzleitung führt und koordiniert den Einsatz."],
["Grundlagen","Was ist vor dem Betreten eines verrauchten Raumes besonders wichtig?",["Alleinarbeit","Auftrag, Atemschutz und Sicherungstrupp sicherstellen","Fenster schließen und sofort hineingehen","Nur eine Taschenlampe mitnehmen"],1,"Innenangriffe erfolgen nur nach Auftrag und den geltenden Atemschutzregeln."],
["Grundlagen","Welche Farbe hat ein übliches Feuerwehr-Warn-/Überjacken-Element häufig?",["Signalgelb","Violett","Braun","Schwarz"],0,"Warnfarben erhöhen die Sichtbarkeit; konkrete PSA richtet sich nach Norm und Ausstattung."],
["Funk","Was ist beim Sprechfunk besonders wichtig?",["Möglichst lange Durchsagen","Kurz, klar und eindeutig sprechen","Gleichzeitig mit anderen sprechen","Abkürzungen erfinden"],1,"Funkdisziplin sorgt für verständliche und sichere Kommunikation."],
["Funk","Was sollte vor einer Funkdurchsage geprüft werden?",["Ob der Funkkanal frei ist","Ob das Blaulicht an ist","Ob die Fahrzeugtür offen ist","Ob das Handy geladen ist"],0,"Vor dem Senden auf laufenden Funkverkehr achten."],
["Funk","Was bedeutet eine Rückmeldung im Einsatzfunk?",["Eine Rückgabe des Fahrzeugs","Eine Information zum Auftrag oder Status","Das Ende jeder Funkverbindung","Eine private Nachricht"],1,"Rückmeldungen informieren die Führung über Lage und Auftragsstatus."],
["Atemschutz","Wer darf einen Pressluftatmer im Einsatz tragen?",["Jede Einsatzkraft ohne Einweisung","Nur entsprechend ausgebildete und geeignete Kräfte","Nur der Gruppenführer","Nur der Maschinist"],1,"Atemschutzgeräteträger benötigen Ausbildung, Eignung und regelmäßige Übungen."],
["Atemschutz","Welche Aufgabe hat der Sicherheitstrupp?",["Getränke verteilen","Atemschutztrupps im Notfall unterstützen und retten","Verkehr regeln","Schläuche reinigen"],1,"Der Sicherheitstrupp steht für Notfälle bereit und muss einsatzbereit sein."],
["Atemschutz","Was muss ein Atemschutztrupp vor dem Einsatz sicherstellen?",["Nur die Funklautstärke","Geräteprüfung, Luftvorrat, Kommunikation und Sicherung","Nur die Handschuhe","Nichts, wenn es eilig ist"],1,"Die Einsatzkurzprüfung und die festgelegten Sicherheitsmaßnahmen sind zwingend."],
["Löschlehre","Welche drei Faktoren bilden das Verbrennungsdreieck?",["Wasser, Schaum, Pulver","Brennstoff, Sauerstoff, Wärme","Rauch, Flamme, Asche","Holz, Metall, Kunststoff"],1,"Eine Verbrennung benötigt Brennstoff, Sauerstoff und eine ausreichende Zündtemperatur."],
["Löschlehre","Welche Wirkung hat Wasser bei vielen Bränden hauptsächlich?",["Kühlung","Farbänderung","Sauerstoffzufuhr","Erhöhung der Temperatur"],0,"Wasser entzieht dem Brand Wärme."],
["Löschlehre","Was ist bei einem Fettbrand unbedingt zu vermeiden?",["Deckel auflegen","Geeigneten Fettbrandlöscher einsetzen","Wasser hineinschütten","Wärmequelle abschalten, wenn gefahrlos möglich"],2,"Wasser kann eine Fettexplosion mit Stichflamme auslösen."],
["Löschlehre","Was bedeutet die Brandklasse A?",["Brände von festen, glutbildenden Stoffen","Brände von Flüssigkeiten","Brände von Gasen","Brände von Metallen"],0,"Brandklasse A umfasst z. B. Holz, Papier und Textilien."],
["Löschlehre","Welche Brandklasse umfasst brennbare Flüssigkeiten?",["A","B","C","D"],1,"Brandklasse B umfasst flüssige oder flüssig werdende Stoffe."],
["Technische Hilfe","Was ist bei einem Verkehrsunfall mit eingeklemmter Person zuerst wichtig?",["Sofort ohne Absprache schneiden","Eigenschutz, Lageerkundung und Absicherung","Nur das Fahrzeug fotografieren","Batterie grundsätzlich ignorieren"],1,"Sicherheit, Erkundung, Stabilisierung und abgestimmte Rettung sind zentral."],
["Technische Hilfe","Warum wird ein Unfallfahrzeug stabilisiert?",["Damit es sauber aussieht","Um unkontrollierte Bewegungen während der Rettung zu verhindern","Damit die Hupe funktioniert","Um die Farbe zu schützen"],1,"Stabilisierung schützt Betroffene und Einsatzkräfte."],
["Technische Hilfe","Was ist beim Umgang mit Airbags zu beachten?",["Auslösebereiche und Sicherheitsabstände beachten","Airbags immer mit der Hand drücken","Kabel beliebig durchtrennen","Keine besonderen Regeln"],0,"Nicht ausgelöste Rückhaltesysteme können eine Gefahr darstellen."],
["Gefahren","Was bedeutet GAMS als Merkhilfe im Gefahrguteinsatz?",["Gefahr erkennen, Absperren, Menschenrettung, Spezialkräfte anfordern","Gerät aufnehmen, Motor starten, Schlauch legen","Gruppe alarmieren, Material sortieren","Gefahr messen, Atemschutz ablegen"],0,"GAMS beschreibt erste grundlegende Maßnahmen bei Gefahrgutlagen."],
["Gefahren","Was ist bei unbekannten Gefahrstoffen sinnvoll?",["Stoff direkt berühren","Abstand halten, erkunden lassen und Fachkräfte hinzuziehen","Mit Wasser abspülen","Ohne Schutz hineingehen"],1,"Unbekannte Stoffe werden nicht ohne geeignete Schutzmaßnahmen berührt."],
["Erste Hilfe","Was ist bei einer bewusstlosen Person mit normaler Atmung grundsätzlich zu tun?",["Allein lassen","Stabile Seitenlage und Atmung überwachen","Sofort etwas zu trinken geben","Aufrecht hinstellen"],1,"Atemwege freihalten, stabile Seitenlage und regelmäßige Kontrolle."],
["Erste Hilfe","Was ist bei einem Kreislaufstillstand zu tun?",["Abwarten","Notruf/Unterstützung veranlassen und Wiederbelebung beginnen","Wasser geben","Person laufen lassen"],1,"Schnell mit CPR beginnen und AED einsetzen, sobald verfügbar."],
["Einsatzstellenhygiene","Warum ist Einsatzstellenhygiene wichtig?",["Nur wegen des Geruchs","Um Kontaminationsverschleppung und Gesundheitsrisiken zu reduzieren","Damit Ausrüstung glänzt","Sie ist nur im Winter nötig"],1,"Kontaminierte Kleidung und Geräte müssen sachgerecht behandelt werden."],
["Fahrzeugkunde","Welche Aufgabe hat der Maschinist typischerweise?",["Nur Fotos machen","Fahrzeug und Aggregate bedienen sowie auftragsbezogene Aufgaben übernehmen","Allein die Einsatzleitung ersetzen","Pressearbeit"],1,"Der Maschinist bedient u. a. Fahrzeug und Pumpen nach Auftrag."],
["Schlauchkunde","Wofür steht ein C-Schlauch im üblichen deutschen Feuerwehrschlauchsystem?",["Kleinere Schlauchdimension als B","Größer als A","Ein Saugschlauch ausschließlich","Ein Druckluftschlauch"],0,"C-Schläuche sind im Regelfall kleiner dimensioniert als B-Schläuche."],
["Knoten","Wofür wird der Mastwurf typischerweise verwendet?",["Zum Befestigen an einem Gegenstand","Zum Verbinden elektrischer Leitungen","Zum Abdichten eines Schlauchs","Zum Öffnen einer Tür"],0,"Der Mastwurf dient unter anderem zum Befestigen an einem Gegenstand."],
["Unfallverhütung","Was hat bei jedem Feuerwehrdienst Vorrang?",["Schnelligkeit um jeden Preis","Eigenschutz und Sicherheit","Möglichst wenig Kommunikation","Alleinarbeit"],1,"Kein Einsatzerfolg rechtfertigt vermeidbare Gefährdung."],
["Führung","Was gehört zur Erkundung?",["Lage feststellen, Gefahren erkennen und Informationen weitergeben","Nur Fahrzeug zählen","Nur Zuschauer befragen","Sofort abrücken"],0,"Erkundung ist Grundlage für Entschluss und Einsatzmaßnahmen."],
["Rechtsgrundlagen","Welche Regelwerke sind für den Feuerwehrdienst maßgeblich?",["Nur private Internetforen","Je nach Bundesland Gesetze, Dienstvorschriften, Unfallverhütung und örtliche Regelungen","Nur Fahrzeughandbücher","Ausschließlich mündliche Absprachen"],1,"Die konkrete Rechtslage und Dienstvorschriften unterscheiden sich teilweise nach Bundesland."]
];
const seed = db.prepare("INSERT OR IGNORE INTO question_bank (id,topic,question,options,answer,explanation,source,created_at) VALUES (?,?,?,?,?,?,?,?)");
for (let i=0;i<starterQuestions.length;i++){const q=starterQuestions[i];seed.run("basis-"+String(i+1).padStart(3,"0"),q[0],q[1],JSON.stringify(q[2]),q[3],q[4],"Grundlagen-Fragenkatalog (Lernfragen)",new Date().toISOString());}

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(session({
 store: new FileStore({ path: path.join(DATA_DIR, "sessions"), ttl: 8 * 60 * 60, retries: 0 }),
 secret: process.env.SESSION_SECRET || "change-this-session-secret-before-production",
 resave: false, saveUninitialized: false,
 cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 8 * 60 * 60 * 1000 }
}));
app.use("/data", (req,res) => res.sendStatus(404));
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
 const details=questions.map((q,i)=>{const raw=answers[i];const a=raw===null||raw===undefined||raw===""?-1:Number(raw);const correct=Number.isInteger(a)&&a===q.answer;if(correct)points++;return {question:q.question,selected:Number.isInteger(a)&&a>=0?a:null,correctAnswer:q.answer,correct};});
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

const multer = require("multer");
const materialsDir = path.join(DATA_DIR, "materials");
fs.mkdirSync(materialsDir, {recursive:true});
const upload = multer({storage:multer.diskStorage({destination:materialsDir,filename:(req,file,cb)=>cb(null,require("crypto").randomUUID()+path.extname(file.originalname).toLowerCase())}),limits:{fileSize:20*1024*1024},fileFilter:(req,file,cb)=>{const ext=path.extname(file.originalname).toLowerCase();cb(null,[".pdf",".txt",".docx",".pptx",".md"].includes(ext));}});
const cleanLearner = v => String(v||"").replace(/[^a-zA-Z0-9_-]/g,"").slice(0,80);
app.get("/api/questions",(req,res)=>{const topic=String(req.query.topic||"");const rows=db.prepare("SELECT * FROM question_bank WHERE (?='' OR topic=?) ORDER BY topic,id").all(topic,topic);res.json(rows.map(q=>({id:q.id,topic:q.topic,question:q.question,options:JSON.parse(q.options),explanation:q.explanation,source:q.source})));});
app.post("/api/learning/answer",(req,res)=>{const b=req.body||{},key=cleanLearner(b.learnerKey),id=String(b.questionId||"");if(!key||!id)return res.status(400).json({error:"Lernprofil oder Frage fehlt."});const q=db.prepare("SELECT answer FROM question_bank WHERE id=?").get(id);if(!q)return res.status(404).json({error:"Frage nicht gefunden."});const correct=Number(b.answer)===q.answer,now=new Date().toISOString();db.prepare(`INSERT INTO learning_answers (learner_key,question_id,attempts,correct_count,last_correct,updated_at) VALUES (?,?,1,?,?,?) ON CONFLICT(learner_key,question_id) DO UPDATE SET attempts=attempts+1,correct_count=correct_count+excluded.correct_count,last_correct=excluded.last_correct,updated_at=excluded.updated_at`).run(key,id,correct?1:0,correct?1:0,now);res.json({correct,explanation:db.prepare("SELECT explanation FROM question_bank WHERE id=?").get(id).explanation});});
app.get("/api/learning/progress",(req,res)=>{const key=cleanLearner(req.query.learnerKey);if(!key)return res.status(400).json({error:"Lernprofil fehlt."});const total=db.prepare("SELECT COUNT(*) n FROM question_bank").get().n;const row=db.prepare("SELECT COUNT(*) practiced,SUM(last_correct) correct,SUM(CASE WHEN last_correct=0 THEN 1 ELSE 0 END) open FROM learning_answers WHERE learner_key=?").get(key);const history=db.prepare("SELECT question_id,attempts,correct_count,last_correct,updated_at FROM learning_answers WHERE learner_key=?").all(key);res.json({total,practiced:row.practiced||0,correct:row.correct||0,open:Math.max(0,total-(row.correct||0)),history});});
app.post("/api/admin/questions",requireAdmin,(req,res)=>{const b=req.body||{},question=String(b.question||"").trim(),options=Array.isArray(b.options)?b.options.map(x=>String(x).trim()):[],answer=Number(b.answer);if(!question||options.length<2||!Number.isInteger(answer)||answer<0||answer>=options.length)return res.status(400).json({error:"Frage, mindestens zwei Antworten und richtige Lösung angeben."});const id=makeId();db.prepare("INSERT INTO question_bank (id,topic,question,options,answer,explanation,source,created_at) VALUES (?,?,?,?,?,?,?,?)").run(id,String(b.topic||"Eigene Fragen"),question,JSON.stringify(options),answer,String(b.explanation||""),"Ausbilder",new Date().toISOString());res.status(201).json({id});});
app.get("/api/admin/materials",requireAdmin,(req,res)=>res.json(db.prepare("SELECT id,original_name,mime_type,size,uploaded_at FROM materials ORDER BY uploaded_at DESC").all()));
app.post("/api/admin/materials",requireAdmin,upload.single("material"),(req,res)=>{if(!req.file)return res.status(400).json({error:"Bitte PDF, DOCX, PPTX, TXT oder MD hochladen."});const id=makeId();db.prepare("INSERT INTO materials (id,original_name,stored_name,mime_type,size,uploaded_at) VALUES (?,?,?,?,?,?)").run(id,req.file.originalname,req.file.filename,req.file.mimetype,req.file.size,new Date().toISOString());res.status(201).json({id,name:req.file.originalname});});
app.get("/api/admin/materials/:id/download",requireAdmin,(req,res)=>{const m=db.prepare("SELECT * FROM materials WHERE id=?").get(req.params.id);if(!m)return res.sendStatus(404);res.download(path.join(materialsDir,m.stored_name),m.original_name);});
app.delete("/api/admin/materials/:id",requireAdmin,(req,res)=>{const m=db.prepare("SELECT * FROM materials WHERE id=?").get(req.params.id);if(!m)return res.sendStatus(404);try{fs.unlinkSync(path.join(materialsDir,m.stored_name));}catch{}db.prepare("DELETE FROM materials WHERE id=?").run(m.id);res.json({ok:true});});
app.post("/api/groups",(req,res)=>{const b=req.body||{},key=cleanLearner(b.learnerKey),name=String(b.name||"Lerngruppe").trim().slice(0,80);if(!key)return res.status(400).json({error:"Lernprofil fehlt."});let code=require("crypto").randomBytes(3).toString("hex").toUpperCase();while(db.prepare("SELECT 1 FROM study_groups WHERE code=?").get(code))code=require("crypto").randomBytes(3).toString("hex").toUpperCase();db.prepare("INSERT INTO study_groups (code,name,topic,host_key,created_at) VALUES (?,?,?,?,?)").run(code,name,String(b.topic||"Alle Themen"),key,new Date().toISOString());db.prepare("INSERT INTO study_group_members (code,learner_key,display_name,joined_at) VALUES (?,?,?,?)").run(code,key,String(b.displayName||"Ausbilder").slice(0,60),new Date().toISOString());res.status(201).json({code,name});});
app.post("/api/groups/join",(req,res)=>{const b=req.body||{},code=String(b.code||"").toUpperCase(),key=cleanLearner(b.learnerKey);const g=db.prepare("SELECT * FROM study_groups WHERE code=?").get(code);if(!g||!key)return res.status(404).json({error:"Lerngruppe nicht gefunden oder Lernprofil fehlt."});db.prepare("INSERT OR REPLACE INTO study_group_members (code,learner_key,display_name,joined_at) VALUES (?,?,?,?)").run(code,key,String(b.displayName||"Teilnehmer").slice(0,60),new Date().toISOString());res.json({code,name:g.name});});
app.get("/api/groups/:code",(req,res)=>{const code=String(req.params.code).toUpperCase(),g=db.prepare("SELECT * FROM study_groups WHERE code=?").get(code);if(!g)return res.sendStatus(404);const members=db.prepare("SELECT display_name FROM study_group_members WHERE code=? ORDER BY joined_at").all(code);res.json({code:g.code,name:g.name,topic:g.topic,currentQuestion:g.current_question,members});});
app.post("/api/groups/:code/next",(req,res)=>{const code=String(req.params.code).toUpperCase(),g=db.prepare("SELECT * FROM study_groups WHERE code=?").get(code);if(!g)return res.sendStatus(404);db.prepare("UPDATE study_groups SET current_question=current_question+1 WHERE code=?").run(code);res.json({currentQuestion:g.current_question+1});});

app.get("*", (req,res) => res.sendFile(path.join(__dirname,"index.html")));
app.listen(PORT,"0.0.0.0",()=>console.log("Feuerwehr-Pruefung-V1 läuft auf Port "+PORT));
