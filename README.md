# Klassenspiele · Lern Deutsch mit Arash

Eine wachsende Sammlung interaktiver Unterrichtsspiele. Startseite ist `index.html`
mit Filter nach Thema und Niveau.

## Ordnerstruktur

```
/  (Repo-Root)
├─ index.html                      ← Startseite (Spiele-Übersicht)
├─ situation-01-buerobedarf.html   ← Spiel: Bürobedarf bestellen
└─ aa-telefon.html                 ← Spiel: Am Apparat (Agentur für Arbeit)
```

Jedes Spiel ist eine eigenständige HTML-Datei (kein Build, kein Server, keine
Unterordner nötig). Goatcounter-Analytics ist überall eingebunden
(aguitoo.goatcounter.com).

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
  added:"2026-06-10"           // neueste Spiele stehen oben
}
```

3. Neues Thema gewünscht? In `index.html` die `THEMEN`-Liste erweitern –
   dann erscheint automatisch ein Filter dafür.

## Aktuelle Spiele

| Spiel | Thema | Niveau | Form |
|---|---|---|---|
| Am Apparat (Agentur für Arbeit) | Beruf & Bewerbung | B1/B2 | Paare / Rotation |
| Bürobedarf bestellen | Beruf & Bewerbung | B1/B2 | Teams |
