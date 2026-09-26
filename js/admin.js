const API_URL = localStorage.getItem("API_URL") || "";

async function loadPruefungen() {

    const container =
        document.getElementById("pruefungen");

    if (!API_URL) {

        container.innerHTML = `
            <div class="feature">

                <h2>Backend noch nicht verbunden</h2>

                <p>
                    Das Frontend funktioniert bereits.
                    Nach Einrichtung des Backends werden
                    hier deine Prüfungen angezeigt.
                </p>

            </div>
        `;

        return;
    }

    try {

        const response =
            await fetch(API_URL + "/api/pruefungen");

        if (!response.ok) {
            throw new Error("Serverfehler");
        }

        const data = await response.json();

        if (!data.length) {

            container.innerHTML = `
                <div class="feature">
                    <h2>Noch keine Prüfungen</h2>
                    <p>
                        Erstelle deine erste Prüfung.
                    </p>
                </div>
            `;

            return;
        }

        container.innerHTML = "";

        data.forEach(pruefung => {

            const div =
                document.createElement("div");

            div.className = "feature";

            div.innerHTML = `

                <h2>
                    ${escapeHTML(pruefung.titel)}
                </h2>

                <p>
                    Code:
                    <strong>
                        ${escapeHTML(pruefung.code)}
                    </strong>
                </p>

                <br>

                <a
                    class="button primary"
                    href="auswertung.html?id=${pruefung.id}"
                >
                    📊 Auswertung
                </a>

            `;

            container.appendChild(div);

        });

    } catch (error) {

        container.innerHTML = `
            <div class="feature">

                <h2>⚠️ Server nicht erreichbar</h2>

                <p>
                    Bitte überprüfe die Backend-Verbindung.
                </p>

            </div>
        `;

    }

}


function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


loadPruefungen();
