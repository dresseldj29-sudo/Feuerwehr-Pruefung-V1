const API_URL =
    localStorage.getItem("API_URL") || "";

const params =
    new URLSearchParams(window.location.search);

const code =
    params.get("code");

let exam = null;

let currentQuestion = 0;

let answers = [];


async function startExam() {

    const vorname =
        document.getElementById("vorname").value.trim();

    const nachname =
        document.getElementById("nachname").value.trim();

    const feuerwehr =
        document.getElementById("feuerwehr").value.trim();


    if (!vorname || !nachname || !feuerwehr) {

        alert(
            "Bitte Vorname, Nachname und Feuerwehr eingeben."
        );

        return;

    }


    if (!API_URL) {

        alert(
            "Backend ist noch nicht verbunden."
        );

        return;

    }


    try {

        const response =
            await fetch(
                API_URL +
                "/api/pruefungen/code/" +
                encodeURIComponent(code)
            );


        if (!response.ok) {
            throw new Error(
                "Prüfung nicht gefunden."
            );
        }


        exam =
            await response.json();


        answers =
            new Array(
                exam.questions.length
            ).fill(null);


        document
            .getElementById("teilnehmer")
            .style.display = "none";


        document
            .getElementById("exam")
            .style.display = "block";


        showQuestion();


    } catch (error) {

        alert(error.message);

    }

}


function showQuestion() {

    const q =
        exam.questions[currentQuestion];


    let html = `

        <div class="badge">
            Frage ${currentQuestion + 1}
            /
            ${exam.questions.length}
        </div>

        <h1>
            ${escapeHTML(q.question)}
        </h1>

    `;


    if (q.type === "multiple") {

        q.options.forEach(
            (option, index) => {

                html += `

                    <label class="answer">

                        <input
                            type="radio"
                            name="answer"
                            value="${index}"
                            ${answers[currentQuestion] === index
                                ? "checked"
                                : ""}
                            onchange="saveAnswer(${index})"
                        >

                        ${escapeHTML(option)}

                    </label>

                `;

            }
        );

    }


    if (q.type === "truefalse") {

        html += `

            <label class="answer">

                <input
                    type="radio"
                    name="answer"
                    value="true"
                    onchange="saveAnswer(true)"
                >

                Richtig

            </label>


            <label class="answer">

                <input
                    type="radio"
                    name="answer"
                    value="false"
                    onchange="saveAnswer(false)"
                >

                Falsch

            </label>

        `;

    }


    if (q.type === "text") {

        html += `

            <textarea
                id="textAnswer"
                placeholder="Deine Antwort..."
                oninput="saveTextAnswer()"
            >${answers[currentQuestion] || ""}</textarea>

        `;

    }


    document.getElementById("question")
        .innerHTML = html;

}


function saveAnswer(answer) {

    answers[currentQuestion] =
        answer;

}


function saveTextAnswer() {

    answers[currentQuestion] =
        document.getElementById("textAnswer")
            .value;

}


function nextQuestion() {

    if (
        currentQuestion <
        exam.questions.length - 1
    ) {

        currentQuestion++;

        showQuestion();

    } else {

        submitExam();

    }

}


function previousQuestion() {

    if (currentQuestion > 0) {

        currentQuestion--;

        showQuestion();

    }

}


async function submitExam() {

    if (!confirm(
        "Prüfung wirklich abgeben?"
    )) {

        return;

    }


    const participant = {

        vorname:
            document.getElementById("vorname").value,

        nachname:
            document.getElementById("nachname").value,

        feuerwehr:
            document.getElementById("feuerwehr").value,

        code,
        answers

    };


    try {

        const response =
            await fetch(
                API_URL + "/api/teilnehmer/abgabe",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(participant)
                }
            );


        const data =
            await response.json();


        if (!response.ok) {
            throw new Error(
                data.error || "Fehler"
            );
        }


        window.location.href =
            "ergebnis.html?id=" +
            encodeURIComponent(data.id);


    } catch (error) {

        alert(error.message);

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
