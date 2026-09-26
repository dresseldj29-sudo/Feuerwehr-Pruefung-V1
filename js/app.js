function getApiUrl() {
    return localStorage.getItem("API_URL") || "";
}


function openExam() {

    const code = prompt(
        "Bitte Prüfungs-Code eingeben:"
    );

    if (!code) {
        return;
    }

    window.location.href =
        "pruefung.html?code=" +
        encodeURIComponent(code.trim());

}
