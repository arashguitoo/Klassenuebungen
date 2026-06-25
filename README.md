# Klassenspiele · Lern Deutsch mit Arash

Eine wachsende Sammlung interaktiver Unterrichtsspiele. Startseite ist `index.html`
mit Filter nach Thema und Niveau.

## Ordnerstruktur

```
/  (Repo-Root)
├─ index.html                      ← Startseite (Spiele-Übersicht)
├─ situation-01-buerobedarf.html   ← Bürobedarf bestellen
├─ aa-telefon.html                 ← Am Apparat (Agentur für Arbeit)
├─ bewerbungsspiel.html            ← Bewerbungsspiel (Mehrspieler/online)
├─ millionaer.html                 ← Wer wird Millionär: Mein Beruf (Team-Quiz/online)
├─ neu-in-der-firma.html           ← Neu in der Firma (Rollenspiel Abteilungen/online)
└─ forumbeitrag-werkstatt.html     ← Forumsbeitrag-Werkstatt (Team-Schreibspiel/online)
```

Jedes Spiel ist eine eigenständige HTML-Datei (kein Build, kein Server, keine
Unterordner nötig). Goatcounter-Analytics ist überall eingebunden
(aguitoo.goatcounter.com).

Hinweis: **Bewerbungsspiel** und **Wer wird Millionär** nutzen Firebase für den
Mehrspieler-Modus (Beitritt per Spielcode, Echtzeit-Sync) und benötigen daher
eine Internetverbindung. Die anderen Spiele laufen vollständig lokal.

## So spielt man „Wer wird Millionär: Mein Beruf"

1. Lehrkraft öffnet `millionaer.html` → **Spielleitung (Beamer)** → Spiel erstellen.
   Ein vierstelliger Spielcode erscheint.
2. Jedes Team öffnet `millionaer.html` am eigenen Gerät → **Team-Gerät** →
   Spielcode + Teamname (optional Mitglieder mit Komma) eingeben.
3. Spielleitung dreht das **Glücksrad** (bestimmt z. B. doppelte Punkte oder eine
   Mitmach-Runde), stellt dann die Frage. Alle Teams antworten gleichzeitig am Gerät.
4. „Auflösen" zeigt die Lösung und vergibt Punkte (richtig + Tempo). Bei
   Mitmach-Runden vergibt die Spielleitung die Punkte manuell (+/−).
5. „Weiter" steigt die Geldleiter hinauf; „Spiel beenden" zeigt den Endstand.

Aufgabentypen: Multiple Choice, Wortpaare, Reihenfolge, Lückentext, Wortsalat,
Zuordnung und Mitmach-Runden (jedes Mitglied einzeln).

## Auf GitHub Pages veröffentlichen

1. Den **Inhalt** dieses Pakets ins Repository legen (Root-Ebene).
2. Repo-Einstellungen → Pages → Branch `main` / Ordner `/ (root)` aktivieren.
3. Seite ist erreichbar unter `https://<benutzername>.github.io/<repo>/`.

## Neues Spiel hinzufügen

1. Die HTML-Datei des Spiels ins Repo-Root legen, z.B. `situation-02-xyz.html`.
2. In `index.html` im `GAMES`-Array (oben im `<script>`) einen Eintrag ergänzen:

```js
{
  title:"Spielname",
  desc:"Kurze Beschreibung für die Kachel.",
  url:"situation-02-xyz.html",
  topic:"Beruf & Bewerbung",   // ein Thema aus der THEMEN-Liste
  levels:["B1","B2"],          // ein oder mehrere Niveaus
  players:"Paare",             // z.B. Paare, Teams, Gruppe
  emoji:"🎲",
  color1:"#0d7268", color2:"#0a564f",  // Banner-Verlauf
  added:"2026-06-23"           // neueste Spiele stehen oben
}
```

3. Neues Thema gewünscht? In `index.html` die `THEMEN`-Liste erweitern –
   dann erscheint automatisch ein Filter dafür.

## Aktuelle Spiele

| Spiel | Thema | Niveau | Form |
|---|---|---|---|
| Wer wird Millionär: Mein Beruf | Spiel & Quiz | B2 | Teams (online) |
| Neu in der Firma | Kommunikation | B1/B2 | Gruppe (online) |
| Forumsbeitrag-Werkstatt | Kommunikation | B2 | Teams (online) |
| Bewerbungsspiel | Beruf & Bewerbung | B1 | Gruppe (online) |
| Am Apparat (Agentur für Arbeit) | Beruf & Bewerbung | B1/B2 | Paare / Rotation |
| Bürobedarf bestellen | Beruf & Bewerbung | B1/B2 | Teams |
