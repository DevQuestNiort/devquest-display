# DevQuest Display

Application web Node.js + React pour afficher sur grand ecran les talks en cours et a venir du DevQuest, avec mise a jour automatique selon l'heure.

## Fonctionnalites

- Lecture des donnees depuis `https://www.devquest.fr/export-2026`
- Recuperation des horaires depuis les pages `schedule/day-1` et `schedule/day-2`
- Affichage live des talks en cours et de la session juste apres, par salle
- Rotation automatique des vues (globale, focus salle, sponsors)
- Rechargement auto des donnees cote serveur
- Theme visuel inspire de l'univers DevQuest (fantasy + neon)

## Prerequis

- Node.js 18+

## Installation

```bash
npm install
```

## Lancer en local (dev)

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- API Node: `http://localhost:3001/api/schedule`

## Simuler une autre date (test)

Tu peux simuler un decalage temporel cote frontend avec le parametre d'URL `mockNow`.

Exemples:

```text
http://localhost:5173/?mockNow=7j2h
http://localhost:5173/?mockNow=-2h30m
```

- `mockNow` accepte un offset relatif, par exemple `7j2h` ou `-2h30m`.
- L'horloge reste dynamique : elle avance en temps reel avec le decalage applique.
- Un badge "Mode simulation actif" apparait dans l'entete.
- Retire `mockNow` de l'URL pour revenir au temps reel.

## Ecran

- L'heure et la date s'affichent en haut a gauche.
- Le programme affiche 4 colonnes, une par salle.
- Chaque colonne montre la session actuelle et la session juste apres.
- Carousel automatique:
  - 20 secondes sur la vue globale
  - 8 secondes par salle (vue focus, une colonne)
  - 5 secondes sur la vue sponsors (donnees mock)

## Build production

```bash
npm run build
npm start
```

L'application React est servie par Express depuis `dist/`.

## Lancer avec Docker Compose

```bash
docker compose up --build -d
```

Application disponible sur:

- `http://localhost:8420`

Arreter:

```bash
docker compose down
```

## Tests

```bash
npm test
```

