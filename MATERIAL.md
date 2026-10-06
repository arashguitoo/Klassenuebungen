# Material für die Klassenspiel-Konsole

Alle Live-Spiele der Konsole werden aus **Material-Dateien (JSON)** gespeist.
Ein Material-Paket kann in mehreren Spielformaten gespielt werden – ein Quiz z. B.
als *Wer wird Millionär*, *Blitz-Quiz*, *Team-Rallye* oder *Team-Match*.

Ablage: `material/<id>.json` + Eintrag in `material/index.json`.
Alternativ in der Konsole: **Material → JSON hinzufügen** (wird in Firebase gespeichert).

---

## Grundgerüst

```json
{
  "id": "aspekte-b2-l3-relativsaetze",
  "titel": "Relativsätze im Beruf",
  "beschreibung": "Kurz, wofür das Material gedacht ist (optional).",
  "art": "quiz",
  "etiketten": {
    "fertigkeit": ["Grammatik"],
    "niveau": ["B2"],
    "thema": "Beruf & Bewerbung",
    "lehrwerk": "Aspekte Beruf B2",
    "lektion": "3",
    "grammatik": ["Relativsätze"],
    "kurs": ["BSK B2"]
  },
  "inhalt": [ ... ]
}
```

| Feld | Pflicht | Werte |
|---|---|---|
| `id` | ja | Kleinbuchstaben, Zahlen, Bindestrich – eindeutig |
| `titel` | ja | frei |
| `art` | ja | `quiz` · `karten` · `begriffe` |
| `etiketten.fertigkeit` | ja | `Grammatik`, `Wortschatz`, `Sprechen`, `Lesen`, `Hören`, `Schreiben`, `Landeskunde`, `Prüfung` |
| `etiketten.niveau` | ja | `A1`, `A2`, `B1`, `B2`, `C1` (ein oder mehrere) |
| `etiketten.thema` | empfohlen | `Beruf & Bewerbung`, `Arbeitswelt`, `Alltag`, `Kommunikation`, `Behörden`, `Gesundheit`, `Wohnen`, `Freizeit`, `Landeskunde`, `Prüfung` – oder eigenes |
| `etiketten.lehrwerk` / `lektion` | optional | z. B. `Aspekte Beruf B2` / `3` |
| `etiketten.grammatik` | optional | Grammatikthemen, z. B. `Passiv`, `Konnektoren` |
| `etiketten.kurs` | optional | eigene Kursnamen |

---

## `art: "quiz"` – für Millionär, Blitz-Quiz, Team-Rallye, Team-Match

Jede Aufgabe hat einen `typ`. Optional: `erklaerung` (wird nach dem Auflösen gezeigt),
`stufe` 1–3 (Schwierigkeit; Millionär sortiert danach).

```json
{ "typ": "mc", "frage": "Was bedeutet „kündigen“?", "optionen": ["den Job beenden", "Urlaub nehmen", "befördert werden", "sich bewerben"], "richtig": 0, "stufe": 1 }

{ "typ": "luecke", "frage": "Die Kollegin, ___ ich geholfen habe, ist neu.", "optionen": ["der", "die", "den", "dem"], "richtig": 0, "erklaerung": "helfen + Dativ → der" }

{ "typ": "wf", "frage": "Eine Probezeit dauert in Deutschland meist sechs Monate.", "richtig": true }

{ "typ": "reihenfolge", "frage": "Bilde den Satz.", "teile": ["Ich", "würde", "gern", "im Team", "arbeiten"] }

{ "typ": "paare", "frage": "Ordne zu.", "paare": [["der Vertrag", "unterschreiben"], ["die Bewerbung", "schicken"], ["das Gehalt", "verhandeln"]] }
```

- `mc` / `luecke`: 2–4 Optionen, `richtig` = Position ab 0. Bei `luecke` steht `___` in der Frage.
- `wf`: wahr/falsch.
- `reihenfolge`: `teile` in **richtiger** Reihenfolge angeben – das Spiel mischt.
- `paare`: 3–6 Paare in richtiger Zuordnung – das Spiel mischt. (Nur Team-Rallye.)

Welche Typen wo laufen:

| Format | mc | luecke | wf | reihenfolge | paare |
|---|---|---|---|---|---|
| Wer wird Millionär | ✓ | ✓ | ✓ | – | – |
| Blitz-Quiz | ✓ | ✓ | ✓ | ✓ | – |
| Team-Match | ✓ | ✓ | – | – | – |
| Team-Rallye | ✓ | ✓ | ✓ | ✓ | ✓ |

## `art: "karten"` – für das Sprechduell (Paare)

```json
{
  "titel": "Gehaltsgespräch",
  "situation": "Sie arbeiten seit zwei Jahren in der Firma und möchten mehr Gehalt.",
  "rolleA": { "name": "Mitarbeiter:in", "aufgabe": "Begründen Sie Ihren Wunsch mit zwei Argumenten." },
  "rolleB": { "name": "Chef:in", "aufgabe": "Sie haben wenig Budget. Machen Sie ein Gegenangebot." },
  "redemittel": ["Ich würde gern über … sprechen.", "Was halten Sie davon, wenn …?"],
  "dauer": 180
}
```

Ohne Rollen (Impulskarte für beide): `{ "titel": "Freizeit", "impuls": "Erzählen Sie von Ihrem letzten Wochenende.", "redemittel": [...] }`

## `art: "begriffe"` – für Tabu

```json
{ "wort": "die Bewerbung", "tabu": ["Job", "schreiben", "Firma", "Stelle"] }
```

---

## Tipps

- Ein Paket = ein Thema/eine Lektion; lieber mehrere kleine Pakete als ein riesiges.
- Für Millionär mindestens 15 Fragen (`stufe` verteilt), für Blitz-Quiz 8–20.
- Die Konsole prüft jedes Paket beim Laden und zeigt Fehler mit Zeilenangabe.
