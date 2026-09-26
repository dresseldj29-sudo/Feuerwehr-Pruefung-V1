```javascript
// ============================================================
// FEUERWEHR PRÜFUNGSPLATTFORM
// ADMIN CLIENT
// ============================================================

const API_URL =
    localStorage.getItem("API_URL") ||
    "http://localhost:3000";


// ============================================================
// ELEMENTE
// ============================================================

const loginBereich = document.getElementById("loginBereich");
const adminBereich = document.getElementById("adminBereich");

const loginForm = document.getElementById("adminLoginForm");

const adminEmail = document.getElementById("adminEmail");
const adminPassword = document.getElementById("adminPassword");

const loginFehler = document.getElementById("loginFehler");

const ausloggenButton =
    document.getElementById("ausloggenButton");

const neuePruefungButton =
    document.getElementById("neuePruefungButton");

const pruefungenListe =
    document.getElementById("pruefungenListe");

const adminStatus =
    document.getElementById("adminStatus");


// ============================================================
// TOKEN
// ============================================================

let adminToken =
    sessionStorage.getItem("FEUERWEHR_ADMIN_TOKEN");


// ============================================================
// START
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {

    if (adminToken) {

        const gueltig = await pruefeAdminToken();

        if (gueltig) {

            zeigeAdminBereich();

            await ladePruefungen();

            return;
        }

        sessionStorage.removeItem("FEUERWEHR_ADMIN_TOKEN");
        adminToken = null;
    }

    zeigeLogin();
});


// ============================================================
// LOGIN
// ============================================================

loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    loginFehler.style.display = "none";

    const email =
        adminEmail.value.trim();

    const password =
        adminPassword.value;


    if (!email || !password) {

        zeigeLoginFehler(
            "Bitte E-Mail und Passwort eingeben."
        );

        return;
    }


    try {

        const response = await fetch(
            `${API_URL}/api/admin/login`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email,
                    password
                })
            }
        );


        const data = await response.json();


        if (!response.ok) {

            zeigeLoginFehler(
                data.error ||
                "E-Mail oder Passwort ist falsch."
            );

            return;
        }


        if (!data.token) {

            zeigeLoginFehler(
                "Der Server hat kein Login-Token zurückgegeben."
            );

            return;
        }


        adminToken = data.token;

        sessionStorage.setItem(
            "FEUERWEHR_ADMIN_TOKEN",
            adminToken
        );


        adminEmail.value = "";
        adminPassword.value = "";


        zeigeAdminBereich();

        await ladePruefungen();


    } catch (error) {

        console.error(error);

        zeigeLoginFehler(
            "Der Server ist nicht erreichbar."
        );
    }
});


// ============================================================
// TOKEN PRÜFEN
// ============================================================

async function pruefeAdminToken() {

    try {

        const response = await fetch(
            `${API_URL}/api/admin/me`,
            {
                method: "GET",

                headers: {
                    "Authorization":
                        `Bearer ${adminToken}`
                }
            }
        );


        return response.ok;

    } catch (error) {

        console.error(error);

        return false;
    }
}


// ============================================================
// ADMIN BEREICH ZEIGEN
// ============================================================

function zeigeAdminBereich() {

    loginBereich.style.display = "none";

    adminBereich.style.display = "block";
}


// ============================================================
// LOGIN ZEIGEN
// ============================================================

function zeigeLogin() {

    loginBereich.style.display = "flex";

    adminBereich.style.display = "none";
}


// ============================================================
// LOGIN FEHLER
// ============================================================

function zeigeLoginFehler(text) {

    loginFehler.textContent = text;

    loginFehler.style.display = "block";
}


// ============================================================
// ABMELDEN
// ============================================================

ausloggenButton.addEventListener(
    "click",
    async () => {

        adminToken = null;

        sessionStorage.removeItem(
            "FEUERWEHR_ADMIN_TOKEN"
        );

        zeigeLogin();

        loginFehler.style.display = "none";

        adminEmail.focus();
    }
);


// ============================================================
// NEUE PRÜFUNG
// ============================================================

neuePruefungButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "erstellen.html";
    }
);


// ============================================================
// PRÜFUNGEN LADEN
// ============================================================

async function ladePruefungen() {

    pruefungenListe.innerHTML = `
        <div class="loading-admin">
            Prüfungen werden geladen...
        </div>
    `;


    try {

        const response = await fetch(
            `${API_URL}/api/pruefungen`,
            {
                method: "GET",

                headers: {
                    "Authorization":
                        `Bearer ${adminToken}`
                }
            }
        );


        if (response.status === 401) {

            adminTokenAbgelaufen();

            return;
        }


        const data = await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Prüfungen konnten nicht geladen werden."
            );
        }


        const pruefungen =
            Array.isArray(data)
                ? data
                : data.pruefungen || [];


        renderPruefungen(pruefungen);


    } catch (error) {

        console.error(error);

        pruefungenListe.innerHTML = `
            <div class="empty-admin">
                ❌ Prüfungen konnten nicht geladen werden.
            </div>
        `;

        zeigeAdminStatus(
            error.message,
            "error"
        );
    }
}


// ============================================================
// PRÜFUNGEN DARSTELLEN
// ============================================================

function renderPruefungen(pruefungen) {

    if (!pruefungen.length) {

        pruefungenListe.innerHTML = `
            <div class="empty-admin">

                <h3>Noch keine Prüfungen vorhanden.</h3>

                <p>
                    Erstelle deine erste Feuerwehr-Prüfung
                    mit der KI.
                </p>

            </div>
        `;

        return;
    }


    pruefungenListe.innerHTML = "";


    pruefungen.forEach((pruefung) => {

        const card =
            document.createElement("div");

        card.className =
            "admin-card";


        const erstellt =
            pruefung.created_at
                ? new Date(
                    pruefung.created_at
                ).toLocaleString("de-DE")
                : "Unbekannt";


        const frageAnzahl =
            pruefung.questions
                ? pruefung.questions.length
                : (
                    pruefung.fragenanzahl ||
                    pruefung.question_count ||
                    0
                );


        const code =
            pruefung.code ||
            pruefung.pruefungscode ||
            "";


        card.innerHTML = `

            <h3>
                🚒 ${escapeHtml(
                    pruefung.title ||
                    "Unbenannte Prüfung"
                )}
            </h3>

            <div class="admin-card-info">
                🔑 Prüfungscode:
                <strong>${escapeHtml(code)}</strong>
            </div>

            <div class="admin-card-info">
                ❓ Fragen:
                ${frageAnzahl}
            </div>

            <div class="admin-card-info">
                📅 Erstellt:
                ${escapeHtml(erstellt)}
            </div>

            <div class="admin-card-actions">

                <button
                    class="admin-button"
                    onclick="oeffnePruefung('${escapeJs(code)}')"
                >
                    🔗 Teilnehmer-Link
                </button>

                <button
                    class="admin-button secondary"
                    onclick="oeffneAuswertung('${escapeJs(
                        pruefung.id || code
                    )}')"
                >
                    📊 Auswertung
                </button>

            </div>
        `;


        pruefungenListe.appendChild(card);
    });
}


// ============================================================
// TEILNEHMER-LINK
// ============================================================

function oeffnePruefung(code) {

    const link =
        `${window.location.origin}` +
        `${window.location.pathname.replace(
            "admin.html",
            "pruefung.html"
        )}` +
        `?code=${encodeURIComponent(code)}`;


    navigator.clipboard
        .writeText(link)
        .then(() => {

            zeigeAdminStatus(
                `Teilnehmer-Link kopiert: ${link}`,
                "success"
            );

        })
        .catch(() => {

            prompt(
                "Teilnehmer-Link:",
                link
            );
        });
}


// ============================================================
// AUSWERTUNG
// ============================================================

function oeffneAuswertung(id) {

    window.location.href =
        `auswertung.html?id=${encodeURIComponent(id)}`;
}


// ============================================================
// TOKEN ABGELAUFEN
// ============================================================

function adminTokenAbgelaufen() {

    adminToken = null;

    sessionStorage.removeItem(
        "FEUERWEHR_ADMIN_TOKEN"
    );

    zeigeLogin();

    zeigeLoginFehler(
        "Deine Anmeldung ist nicht mehr gültig. Bitte erneut anmelden."
    );
}


// ============================================================
// STATUS
// ============================================================

function zeigeAdminStatus(text, type) {

    adminStatus.textContent = text;

    adminStatus.className =
        `admin-status ${type}`;


    setTimeout(() => {

        adminStatus.className =
            "admin-status";

    }, 6000);
}


// ============================================================
// HTML SICHER MACHEN
// ============================================================

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// ============================================================
// JAVASCRIPT SICHER MACHEN
// ============================================================

function escapeJs(value) {

    return String(value)
        .replaceAll("\\", "\\\\")
        .replaceAll("'", "\\'")
        .replaceAll('"', '\\"')
        .replaceAll("\n", "\\n")
        .replaceAll("\r", "\\r");
}
```
