<!DOCTYPE html>
<html lang="de">

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>Admin – Feuerwehr Prüfung</title>

    <link rel="stylesheet" href="css/style.css">

</head>

<body>

<header class="topbar">

    <div class="logo">
        🚒 Feuerwehr Prüfung
    </div>

    <nav>
        <a href="index.html">Start</a>
    </nav>

</header>


<main class="admin-page">

<div class="admin-container">

    <div class="badge">
        🔐 ADMIN-BEREICH
    </div>

    <h1>
        Prüfungen verwalten
    </h1>

    <p>
        Erstelle Prüfungen aus deinem Unterrichtsmaterial
        und verwalte anschließend die Ergebnisse.
    </p>


    <div class="admin-actions">

        <a
            href="erstellen.html"
            class="button primary"
        >
            🤖 Prüfung mit KI erstellen
        </a>

    </div>


    <h2 class="section-title">
        Meine Prüfungen
    </h2>


    <div id="pruefungen">

        <div class="loading">
            Prüfungen werden geladen...
        </div>

    </div>

</div>

</main>


<script src="js/admin.js"></script>

</body>
</html>
