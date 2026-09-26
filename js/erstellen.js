const API_URL =
    localStorage.getItem("API_URL") || "";

let examData = {

    typ: "",
    material: "",
    titel: "",
    anzahl: 20,
    schwierigkeit: "Mittel",
    grenze: 70

};


function selectType(type) {

    examData.typ = type;

    nextStep(2);

}


function nextStep(step) {

    document
        .querySelectorAll(".wizard-step")
        .forEach(element => {

            element.style.display = "none";

        });


    const selected =
        document.getElementById("step" + step);

    if (selected) {
        selected.style.display = "block";
    }


    document.getElementById("stepNumber")
        .textContent = step;


    if (step === 3) {

        examData.material =
            document.getElementById("material").value;

    }


    if (step === 4) {

        examData.titel =
            document.getElementById("titel").value;

        examData.anzahl =
            Number(document.getElementById("anzahl").value);

        examData.schwierigkeit =
            document.getElementById("schwierigkeit").value;

        examData.grenze =
            Number(document.getElementById("grenze").value);

    }

}


async function createExam() {

    const status =
        document.getElementById("aiStatus");

    if (!examData.material.trim()) {

        status.innerHTML =
            "<p>⚠️ Bitte Unterrichtsmaterial eingeben.</p>";

        return;

    }


    if (!API_URL) {

        status.innerHTML = `
            <div class="feature">

                <h2>⚠️ Backend fehlt</h2>

                <p>
                    Die Website ist fertig eingerichtet.
                    Jetzt muss noch das Backend verbunden werden,
                    damit die KI wirklich Prüfungen erstellen kann.
                </p>

            </div>
        `;

        return;

    }


    status.innerHTML = `
        <div class="feature">

            <h2>🤖 Prüfung wird erstellt...</h2>

            <p>
                Unterrichtsmaterial wird analysiert.
            </p>

        </div>
    `;


    try {

        const response = await fetch(
            API_URL + "/api/ki/pruefung",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(examData)

            }
        );


        const data =
            await response.json();


        if (!response.ok) {
            throw new Error(
                data.error || "Fehler"
            );
        }


        document
            .querySelectorAll(".wizard-step")
            .forEach(element => {

                element.style.display = "none";

            });


        document
            .getElementById("step5")
            .style.display = "block";


        document
            .getElementById("stepNumber")
            .textContent = "5";


        document
            .getElementById("result")
            .innerHTML = `

                <div class="feature">

                    <h2>
                        ✅ Prüfung erstellt
                    </h2>

                    <p>
                        ${data.questions.length}
                        Fragen wurden erstellt.
                    </p>

                    <br>

                    <a
                        class="button primary"
                        href="admin.html"
                    >
                        Zum Admin-Bereich
                    </a>

                </div>

            `;


    } catch (error) {

        status.innerHTML = `
            <div class="feature">

                <h2>❌ Fehler</h2>

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
