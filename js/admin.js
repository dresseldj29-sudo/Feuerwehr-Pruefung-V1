```javascript
// ============================================================
// FEUERWEHR PRÜFUNGSPLATTFORM
// ADMIN LOGIN
// ============================================================

// ============================================================
// ADMIN ZUGANGSDATEN
// ============================================================

const OWNER_EMAIL = "Ausbilder@gmail.com";
const OWNER_PASSWORD = "Admin";


// ============================================================
// API
// ============================================================

const API_URL =
    localStorage.getItem("API_URL") ||
    "http://localhost:3000";


// ============================================================
// ELEMENTE
// ============================================================

const loginBereich =
    document.getElementById("loginBereich");

const adminBereich =
    document.getElementById("adminBereich");

const loginForm =
    document.getElementById("adminLoginForm");

const adminEmail =
    document.getElementById("adminEmail");

const adminPassword =
    document.getElementById("adminPassword");

const loginFehler =
    document.getElementById("loginFehler");

const ausloggenButton =
    document.getElementById("ausloggenButton");

const neuePruefungButton =
    document.getElementById("neuePruefungButton");

const pruefungenListe =
    document.getElementById("pruefungenListe");

const adminStatus =
    document.getElementById("adminStatus");


// ============================================================
// LOGIN STATUS
// ============================================================

let adminAngemeldet = false;


// ============================================================
// SEITE STARTEN
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        // ----------------------------------------------------
        // IMMER ZUERST LOGIN ZEIGEN
        // ----------------------------------------------------

        adminAngemeldet = false;

        zeigeLogin();
    }
);


// ============================================================
// LOGIN
// ============================================================

loginForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        const email =
            adminEmail.value.trim();

        const password =
            adminPassword.value;


        // ----------------------------------------------------
        // ALTE FEHLERMELDUNG AUSBLENDEN
        // ----------------------------------------------------

        loginFehler.style.display =
            "none";


        // ----------------------------------------------------
        // E-MAIL PRÜFEN
        // ----------------------------------------------------

        if (
            email.toLowerCase() !==
            OWNER_EMAIL.toLowerCase()
        ) {

            zeigeLoginFehler(
                "❌ Falsche E-Mail-Adresse oder falsches Passwort."
            );

            adminPassword.value = "";

            return;
        }


        // ----------------------------------------------------
        // PASSWORT PRÜFEN
        // ----------------------------------------------------

        if (
            password !==
            OWNER_PASSWORD
        ) {

            zeigeLoginFehler(
                "❌ Falsche E-Mail-Adresse oder falsches Passwort."
            );

            adminPassword.value = "";

            return;
        }


        // ----------------------------------------------------
        // LOGIN ERFOLGREICH
        // ----------------------------------------------------

        adminAngemeldet = true;


        // Felder leeren

        adminEmail.value = "";
        adminPassword.value = "";


        // Admin-Bereich anzeigen

        zeigeAdminBereich();


        // Prüfungen laden

        await ladePruefungen();
    }
);


// ============================================================
// LOGIN ANZEIGEN
// ============================================================

function zeigeLogin() {

    adminBereich.style.display =
        "none";

    loginBereich.style.display =
        "flex";
}


// ============================================================
// ADMIN BEREICH ANZEIGEN
// ============================================================

function zeigeAdminBereich() {

    // Nur anzeigen, wenn wirklich angemeldet

    if (!adminAngemeldet) {

        zeigeLogin();

        return;
    }


    loginBereich.style.display =
        "none";

    adminBereich.style.display =
        "block";
}


// ============================================================
// LOGIN FEHLER
// ============================================================

function zeigeLoginFehler(
    text
) {

    loginFehler.textContent =
        text;

    loginFehler.style.display =
        "block";
}


// ============================================================
// ABMELDEN
// ============================================================

ausloggenButton.addEventListener(
    "click",
    () => {

        // Login zurücksetzen

        adminAngemeldet = false;


        // Admin-Bereich sofort verstecken

        adminBereich.style.display =
            "none";


        // Login anzeigen

        loginBereich.style.display =
            "flex";


        // Felder leeren

        adminEmail.value = "";
        adminPassword.value = "";


        loginFehler.style.display =
            "none";


        adminEmail.focus();
    }
);


// ============================================================
// NEUE PRÜFUNG
// ============================================================

neuePruefungButton.addEventListener(
    "click",
    () => {

        if (!adminAngemeldet) {

            zeigeLogin();

            return;
        }


        window.location.href =
            "erstellen.html";
    }
);


// ============================================================
// PRÜFUNGEN LADEN
// ============================================================

async function ladePruefungen() {

    // --------------------------------------------------------
    // SICHERHEITSPRÜFUNG
    // --------------------------------------------------------

    if (!adminAngemeldet) {

        zeigeLogin();

        return;
    }


    pruefungenListe.innerHTML = `
        <div class="loading-admin">
            Prüfungen werden geladen...
        </div>
    `;


    try {

        const response =
            await fetch(
                `${API_URL}/api/pruefungen`
            );


        const data =
            await response.json();


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


        renderPruefungen(
            pruefungen
        );


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
// PRÜFUNGEN ANZEIGEN
// ============================================================

function renderPruefungen(
    pruefungen
) {

    if (!adminAngemeldet) {

        zeigeLogin();

        return;
    }


    if (!pruefungen.length) {

        pruefungenListe.innerHTML = `
            <div class="empty-admin">

                <h3>
                    Noch keine Prüfungen vorhanden.
                </h3>

                <p>
                    Erstelle deine erste Feuerwehr-Prüfung
                    mit der KI.
                </p>

            </div>
        `;

        return;
    }


    pruefungenListe.innerHTML =
        "";


    pruefungen.forEach(
        (pruefung) => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "admin-card";


            const erstellt =
                pruefung.created_at
                    ? new Date(
                        pruefung.created_at
                    ).toLocaleString(
                        "de-DE"
                    )
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

                    <strong>
                        ${escapeHtml(code)}
                    </strong>

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


            pruefungenListe.appendChild(
                card
            );
        }
    );
}


// ============================================================
// TEILNEHMER-LINK
// ============================================================

function oeffnePruefung(
    code
) {

    if (!adminAngemeldet) {

        zeigeLogin();

        return;
    }


    const link =
        `${window.location.origin}` +
        `${window.location.pathname.replace(
            "admin.html",
            "pruefung.html"
        )}` +
        `?code=${encodeURIComponent(
            code
        )}`;


    if (
        navigator.clipboard
    ) {

        navigator.clipboard
            .writeText(link)
            .then(
                () => {

                    zeigeAdminStatus(
                        `Teilnehmer-Link kopiert: ${link}`,
                        "success"
                    );
                }
            )
            .catch(
                () => {

                    prompt(
                        "Teilnehmer-Link:",
                        link
                    );
                }
            );

    } else {

        prompt(
            "Teilnehmer-Link:",
            link
        );
    }
}


// ============================================================
// AUSWERTUNG
// ============================================================

function oeffneAuswertung(
    id
) {

    if (!adminAngemeldet) {

        zeigeLogin();

        return;
    }


    window.location.href =
        `auswertung.html?id=${encodeURIComponent(
            id
        )}`;
}


// ============================================================
// STATUS
// ============================================================

function zeigeAdminStatus(
    text,
    type
) {

    adminStatus.textContent =
        text;

    adminStatus.className =
        `admin-status ${type}`;


    setTimeout(
        () => {

            adminStatus.className =
                "admin-status";

        },
        6000
    );
}


// ============================================================
// HTML SICHER MACHEN
// ============================================================

function escapeHtml(
    value
) {

    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}


// ============================================================
// JAVASCRIPT SICHER MACHEN
// ============================================================

function escapeJs(
    value
) {

    return String(value)
        .replaceAll(
            "\\",
            "\\\\"
        )
        .replaceAll(
            "'",
            "\\'"
        )
        .replaceAll(
            '"',
            '\\"'
        )
        .replaceAll(
            "\n",
            "\\n"
        )
        .replaceAll(
            "\r",
            "\\r"
        );
}
```
