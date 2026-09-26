const API_URL =
    localStorage.getItem("API_URL") || "";


const params =
    new URLSearchParams(
        window.location.search
    );


const code =
    params.get("code");


let exam = null;

let currentQuestion = 0;

let answers = [];

let participant = null;

let timerInterval = null;

let remainingSeconds = 0;


async function startExam() {

    const vorname =
        document
            .getElementById("vorname")
            .value
            .trim();


    const nachname =
        document
            .getElementById("nachname")
            .value
            .trim();


    const feuerwehr =
        document
            .getElementById("feuerwehr")
            .value
            .trim();


    if (
        !vorname ||
        !nachname ||
        !feuerwehr
    ) {

        alert(
            "Bitte Vorname, Nachname und Feuerwehr eingeben."
        );

        return;

    }


    if (!code) {

        alert(
            "Kein Prüfungs-Code vorhanden."
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


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Prüfung nicht gefunden."
            );

        }


        exam = data;


        participant = {

            vorname,

            nachname,

            feuerwehr

        };


        answers =
            new Array(
                exam.questions.length
            ).fill(null);


        currentQuestion = 0;


        remainingSeconds =
            Number(exam.zeitlimit) * 60;


        document
            .getElementById("teilnehmer")
            .style.display = "none";


        document
            .getElementById("exam")
            .style.display = "block";


        document
            .getElementById("questionTotal")
            .textContent =
            exam.questions.length;


        showQuestion();

        startTimer();


    } catch (error) {

        alert(
            error.message
        );

    }

}


function showQuestion() {

    const q =
        exam.questions[
            currentQuestion
        ];


    document
        .getElementById("questionNumber")
        .textContent =
        currentQuestion + 1;


    const percentage =
        (
            (currentQuestion + 1) /
            exam.questions.length
        ) * 100;


    document
        .getElementById("progressBar")
        .style.width =
        percentage + "%";


    let html = `

        <h1 class="question-title">

            ${escapeHTML(q.question)}

        </h1>

    `;


    if (
        q.type === "multiple"
    ) {

        q.options.forEach(
            (option, index) => {

                const checked =
                    answers[
                        currentQuestion
                    ] === index
                        ? "checked"
                        : "";


                html += `

                    <label class="answer">

                        <input
                            type="radio"
                            name="answer"
                            value="${index}"
                            ${checked}
                            onchange="saveAnswer(${index})"
                        >

                        ${escapeHTML(option)}

                    </label>

                `;

            }
        );

    }


    if (
        q.type === "truefalse"
    ) {

        const answer =
            answers[
                currentQuestion
            ];


        html += `

            <label class="answer">

                <input
                    type="radio"
                    name="answer"
                    value="true"
                    ${answer === true ? "checked" : ""}
                    onchange="saveAnswer(true)"
                >

                Richtig

            </label>


            <label class="answer">

                <input
                    type="radio"
                    name="answer"
                    value="false"
                    ${answer === false ? "checked" : ""}
                    onchange="saveAnswer(false)"
                >

                Falsch

            </label>

        `;

    }


    if (
        q.type === "text"
    ) {

        html += `

            <textarea
                id="textAnswer"
                placeholder="Deine Antwort..."
                oninput="saveTextAnswer()"
            >${escapeHTML(
                answers[currentQuestion] || ""
            )}</textarea>

        `;

    }


    document
        .getElementById("question")
        .innerHTML = html;


    const button =
        document.getElementById(
            "nextButton"
        );


    button.textContent =
        currentQuestion ===
        exam.questions.length - 1
            ? "Prüfung abgeben"
            : "Weiter →";

}


function saveAnswer(answer) {

    answers[
        currentQuestion
    ] = answer;

}


function saveTextAnswer() {

    const element =
        document.getElementById(
            "textAnswer"
        );


    if (element) {

        answers[
            currentQuestion
        ] = element.value;

    }

}


function nextQuestion() {

    if (
        currentQuestion <
        exam.questions.length - 1
    ) {

        currentQuestion++;

        showQuestion();

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    } else {

        submitExam();

    }

}


function previousQuestion() {

    if (
        currentQuestion > 0
    ) {

        currentQuestion--;

        showQuestion();

    }

}


function startTimer() {

    updateTimer();


    timerInterval =
        setInterval(() => {

            remainingSeconds--;

            updateTimer();


            if (
                remainingSeconds <= 0
            ) {

                clearInterval(
                    timerInterval
                );


                alert(
                    "Die Prüfungszeit ist abgelaufen."
                );


                submitExam(
                    true
                );

            }

        }, 1000);

}


function updateTimer() {

    const minutes =
        Math.floor(
            remainingSeconds / 60
        );


    const seconds =
        remainingSeconds % 60;


    document
        .getElementById("timer")
        .textContent =
        "⏱ " +
        String(minutes)
            .padStart(2, "0") +
        ":" +
        String(seconds)
            .padStart(2, "0");


    if (
        remainingSeconds <= 60
    ) {

        document
            .getElementById("timer")
            .className =
            "danger";

    }

}


async function submitExam(
    automatic = false
) {

    if (!automatic) {

        const unanswered =
            answers.filter(
                answer =>
                    answer === null ||
                    answer === undefined ||
                    answer === ""
            ).length;


        if (unanswered > 0) {

            const confirmResult =
                confirm(
                    "Du hast noch " +
                    unanswered +
                    " unbeantwortete Frage(n). Trotzdem abgeben?"
                );


            if (!confirmResult) {

                return;

            }

        }


        if (
            !confirm(
                "Prüfung wirklich abgeben?"
            )
        ) {

            return;

        }

    }


    clearInterval(
        timerInterval
    );


    try {

        const response =
            await fetch(
                API_URL +
                "/api/teilnehmer/abgabe",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            code,

                            vorname:
                                participant.vorname,

                            nachname:
                                participant.nachname,

                            feuerwehr:
                                participant.feuerwehr,

                            answers

                        })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Fehler bei der Abgabe."
            );

        }


        window.location.href =
            "ergebnis.html?id=" +
            encodeURIComponent(
                data.id
            );


    } catch (error) {

        alert(
            error.message
        );

    }

}


function escapeHTML(value) {

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
