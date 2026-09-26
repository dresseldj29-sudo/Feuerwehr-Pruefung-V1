const API_URL =
    localStorage.getItem("API_URL") || "";


async function loadPruefungen() {

    const container =
        document.getElementById("pruefungen");


    if (!API_URL) {

        container.innerHTML = `

            <div class="feature">

                <h2>
                    ⚠️ Backend noch nicht verbunden
                </h2>

                <p>
                    Die Website ist installiert.
                    Sobald das Backend verbunden ist,
                    erscheinen hier deine Prüfungen.
                </p>

            </div>

        `;

        return;
    }


    try {

        const response =
            await fetch(
                API_URL + "/api/pruefungen"
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error || "Serverfehler"
            );

        }


        if (!data.length) {

            container.innerHTML = `

                <div class="feature">

                    <h2>
                        Noch keine Prüfungen
                    </h2>

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
                    Prüfungs-Code:
                    <strong>
                        ${escapeHTML(pruefung.code)}
                    </strong>
                </p>

                <p>
                    Fragen:
                    ${pruefung.fragen_anzahl}
                </p>

                <p>
                    Erstellt:
                    ${escapeHTML(pruefung.erstellt_am)}
                </p>

                <br>

                <a
                    class="button primary small-button"
                    href="pruefung.html?code=${encodeURIComponent(pruefung.code)}"
                >
                    🔗 Prüfung öffnen
                </a>

                <a
                    class="button secondary small-button"
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

                <h2>
                    ❌ Fehler
                </h2>

                <p>
                    ${escapeHTML(error.message)}
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
