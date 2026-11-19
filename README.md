# Feuerwehr-Pruefung-V1

Digitale Feuerwehr-Prüfungsplattform mit Express-Backend und SQLite-Datenbank.

## Lokal starten
1. Node.js 20 oder neuer installieren.
2. `npm install`
3. Umgebungsvariablen setzen: `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SESSION_SECRET`.
4. `npm start`
5. Browser: http://localhost:3000

## Railway
- Build: `npm install`
- Start: `npm start`
- Port: `3000` (Railway stellt `PORT` bereit)
- Volume-Mount: `/data`
- Variablen: `DATA_DIR=/data`, `ADMIN_USERNAME=ausbilder`, ein starkes `ADMIN_PASSWORD`, ein zufälliges `SESSION_SECRET`, `NODE_ENV=production`.

Datenbank: `$DATA_DIR/feuerwehr-pruefung.sqlite`. Ohne gemountetes Volume gehen Daten bei einem Container-Neustart verloren.

## Hinweise
Die Fragen werden aus Sätzen des eingefügten Materials als Entwurf erzeugt. Das ist keine echte KI und keine Garantie für fachliche Richtigkeit. Ausbilder müssen Fragen und Antwortmöglichkeiten vor dem Einsatz kontrollieren.
