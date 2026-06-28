# Ledger – Einnahmen-Dashboard

Ein persönliches Dashboard für Hauptarbeit (Festanstellung), Minijob (603-€-Basis)
und Kleingewerbe (Klientenarbeit). Läuft komplett im Browser, die Daten werden
lokal auf deinem Gerät gespeichert (localStorage).

---

## Live stellen auf GitHub Pages – komplett im Browser, ohne Installation

### 1. Repository anlegen
1. Auf https://github.com einloggen (oder kostenlos registrieren).
2. Oben rechts auf **+** → **New repository**.
3. Einen Namen vergeben, z.B. `ledger-dashboard`.
4. Auf **public** stellen (nötig für kostenlose GitHub Pages).
5. **Create repository**.

### 2. Dateien hochladen
1. Im neuen, leeren Repository auf **uploading an existing file** klicken
   (oder **Add file → Upload files**).
2. Alle Dateien und Ordner aus diesem Projekt per Drag & Drop in das Fenster ziehen.
   Wichtig: auch den Ordner `.github` muss mit hochgeladen werden (er enthält den
   automatischen Deploy). Falls dein Computer versteckte Ordner ausblendet und
   `.github` nicht mitgezogen wird, siehe **Hinweis** unten.
3. Unten auf **Commit changes** klicken.

### 3. GitHub Pages aktivieren
1. Im Repository oben auf **Settings**.
2. Links auf **Pages**.
3. Unter **Build and deployment → Source** den Eintrag **GitHub Actions** wählen.
4. Fertig. Der Deploy startet automatisch.

### 4. Adresse abrufen
1. Oben im Repository auf den Reiter **Actions** – dort läuft der Deploy
   (dauert ca. 1–2 Minuten, grüner Haken = fertig).
2. Danach unter **Settings → Pages** erscheint oben deine Adresse, etwa:
   `https://DEIN-NAME.github.io/ledger-dashboard/`
3. Diese URL kannst du auf Handy, Laptop und Rechner öffnen und als Lesezeichen
   oder Startbildschirm-Symbol speichern.

---

## Hinweis: Falls der Ordner `.github` nicht mit hochgeladen wurde
Dann den Deploy-Ablauf einmal von Hand anlegen:
1. Im Repository **Add file → Create new file**.
2. Als Dateiname exakt eingeben: `.github/workflows/deploy.yml`
   (die Schrägstriche legen die Ordner automatisch an).
3. Den Inhalt aus der Datei `.github/workflows/deploy.yml` dieses Projekts
   hineinkopieren.
4. **Commit changes** – danach Schritt 3 oben (Pages aktivieren).

---

## Wichtig zur Datenspeicherung
Die Daten liegen **lokal im jeweiligen Browser** (localStorage). Das heißt:
- Auf jedem Gerät hast du eigene Daten; sie werden **nicht** automatisch
  zwischen Handy, Laptop und Rechner synchronisiert.
- Wenn du den Browser-Speicher / die Website-Daten löschst, sind die Einträge weg.

Wenn du später eine geräteübergreifende Synchronisierung möchtest, lässt sich das
ergänzen (dafür wäre ein kleiner Online-Datenspeicher nötig).

---

## Lokal testen (optional, nur falls gewünscht)
Voraussetzung: Node.js installiert.
```
npm install
npm run dev
```
Dann die angezeigte Adresse (z.B. http://localhost:5173) im Browser öffnen.
