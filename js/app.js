function openExam() {

    const code = prompt(
        "Bitte gib den Prüfungs-Code ein:"
    );

    if (!code) {
        return;
    }

    window.location.href =
        "pruefung.html?code=" +
        encodeURIComponent(code.trim());

}
