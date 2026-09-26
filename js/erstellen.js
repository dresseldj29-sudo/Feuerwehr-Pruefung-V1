const API_URL =
    localStorage.getItem("API_URL") || "";


let examData = {

    typ: "",

    material: "",

    titel: "",

    anzahl: 20,

    schwierigkeit: "Mittel",

    grenze: 70,

    zeit: 30

};


function selectType(type) {

    examData.typ = type;

    showStep(2);

}


function showStep(step) {

    document
        .querySelectorAll(".wizard-step")
        .forEach(element => {

            element.style.display = "none";

        });


    const selected =
        document.getElementById(
            "step" + step
        );


    if (selected) {

        selected.style.display =
            "block";

    }


    document
        .getElementById("stepNumber")
        .textContent = step;

}


function goToSettings() {

    const material =
        document
            .getElementById("material")
            .value
            .trim();


    if (!material) {

        alert(
            "Bitte zuerst Unterrichtsmaterial eingeben."
        );

        return;

    }


    examData.material =
        material;


    showStep(3);

}


function showCreateStep() {

    examData.titel =
        document
            .getElementById("titel")
            .value
            .trim();


    examData.anzahl =
        Number(
            document
                .getElementById("anzahl")
                .value
        );


    examData.schwierigkeit =
        document
            .getElementById("schwierigkeit")
            .value;


    examData.grenze =
        Number(
            document
                .getElementById("grenze")
                .value
        );


    examData.zeit =
        Number(
            document
                .getElementById("zeit")
                .value
        );


    if (!examData.titel) {

        alert(
            "Bitte einen Prüfungstitel eingeben."
        );

        return;

    }


    showStep(4);

}


async function createExam() {

    const status =
        document.getElementById("aiStatus");

    const button =
        document.getElementById("createButton");


    if (!API_URL) {

        status.innerHTML = `

            <h2>
                ⚠️ Backend fehlt
            </h2>

            <p>
                Bitte zuerst das Backend einrichten
                und die Backend-Adresse verbinden.
            </p>

        `;

        return;

    }


    button.disabled = true;


    status.innerHTML = `

        <h2>
            🤖 KI arbeitet...
        </h2>

        <p>
            Unterrichtsmaterial wird analysiert.
        </p>

        <p>
            Fragen werden erstellt.
        </p>

        <p>
            Antworten werden geprüft.
        </p>

    `;


    try {

        const response =
            await fetch(
                API_URL +
                "/api/ki/pruefung",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            examData
                        )

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Fehler bei der KI."
            );

        }


        showStep(5);


        document
            .getElementById("result")
            .innerHTML = `

                <div class="feature">

                    <h2>
                        ✅ Prüfung erstellt
                    </h2>

                    <p>
                        Titel:
                        <strong>
                            ${escapeHTML(data.titel)}
                        </strong>
                    </p>

                    <p>
                        Fragen:
                        ${data.questions.length}
                    </p>

                    <p>
                        Prüfungs-Code:
                        <strong>
                            ${escapeHTML(data.code)}
                        </strong>
                    </p>

                    <br>

                    <p>
                        Teilnehmer-Link:
                    </p>

                    <input
                        readonly
                        value="${escapeHTML(data.link)}"
                    >

                    <br><br>

                    <button
                        class="button primary"
                        onclick="copyLink('${escapeJS(data.link)}')"
                    >
                        📋 Link kopieren
                    </button>

                    <a
                        class="button secondary"
                        href="admin.html"
                    >
                        🔐 Zum Admin-Bereich
                    </a>

                </div>

            `;


    } catch (error) {

        button.disabled = false;


        status.innerHTML = `

            <h2>
                ❌ Fehler
            </h2>

            <p>
                ${escapeHTML(error.message)}
            </p>

        `;

    }

}


async function copyLink(link) {

    try {

        await navigator.clipboard.writeText(link);

        alert(
            "Link wurde kopiert."
        );

    } catch {

        prompt(
            "Link kopieren:",
            link
        );

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


function escapeJS(value) {

    return String(value)

        .replaceAll("\\", "\\\\")

        .replaceAll("'", "\\'")

        .replaceAll("\n", "\\n")

        .replaceAll("\r", "");

}
