# L'Envol — Simulateur d'Oiseau

Pilotez un oiseau au-dessus d'un monde ouvert quasi infini généré à l'exécution, franchissez des anneaux dorés, ramassez des pièces et débloquez des espèces toujours plus rapides. Application **100 % client** (React + Three.js), sans backend, sans assets binaires : monde, oiseaux et sons sont générés à l'exécution.

> Documentation produit : [`PRD.md`](./PRD.md) · Conventions agents : [`AGENTS.md`](./AGENTS.md)

---

## Aperçu

- **Vol libre** avec inertie, piqué, battement d'ailes, courants ascendants et caméra de poursuite cinématique.
- **Monde ouvert sans bord** : tuiles de terrain de 480 unités générées en continu autour du joueur (5 × 5), océan et nuages qui suivent le vol, 6 points d'intérêt, 18 ascendances thermiques et plus de 100 pièces flottantes.
- **8 missions** scénarisées (didacticiel, aventure, défi), toutes sélectionnables et rejouables depuis le sélecteur : récompense en pièces, distance depuis la position actuelle et longueur du parcours affichées.
- **17 oiseaux** aux caractéristiques et silhouettes distinctes (vitesse, maniabilité, plané, piqué), avec **aperçu 3D animé** dans la Volière.
- **HUD complet** : sélecteur de missions, télémétrie (vitesse/altitude), radar-minimap orienté et zoomable jusqu'à 1,8 km, contrôles tactiles.
- **Audio procédural** : vent dynamique, battements, gazouillis, fanfares — synthétisés en Web Audio.

## Stack

| Domaine | Choix |
| --- | --- |
| UI | React 19, Tailwind CSS v4 (`@tailwindcss/vite`), lucide-react, canvas-confetti |
| 3D | Three.js 0.186 (géométries et matériaux procéduraux) |
| Build | Vite 8 + TypeScript 7 (`tsc --noEmit` pour le lint) |
| Persistance | `localStorage` uniquement |

## Démarrage

Prérequis : Node.js 20+ et npm.

```bash
npm install --legacy-peer-deps
npm run dev        # http://localhost:3000
```

> `npm install` seul échoue : la devDependency `esbuild@^0.25` entre en conflit avec la peer range de Vite 8. Utilisez `--legacy-peer-deps` (ou `bun install` si bun est installé, le dépôt versionne `bun.lock`).

### Commandes

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur Vite sur `http://localhost:3000` (host `0.0.0.0`, HMR actif) |
| `npm run build` | Bundle de production dans `dist/` |
| `npm run preview` | Sert le build local |
| `npm run lint` | `tsc --noEmit` — pas d'ESLint, c'est le seul contrôle automatisé |
| `npm run clean` | Supprime `dist/` et `server.js` (script hérité, sans serveur) |

Il n'y a **ni tests, ni CI, ni formatter**. Vérifier une modification avec `npm run lint && npm run build` puis en jouant dans le navigateur.

## Commandes de vol

| Action | Clavier | Tactile |
| --- | --- | --- |
| Piquer (nez vers le bas, accélère) | `W` / `↑` | D-pad haut |
| Cabrer (nez vers le haut, perd de la vitesse) | `S` / `↓` | D-pad bas |
| Virer à gauche / droite | `A` / `←` et `D` / `→` | D-pad gauche/droite |
| Battre des ailes (portance) | `Espace` | Bouton « Battre » |
| Piqué rapide | `Maj` (ou piquer fortement) | Bouton « Piqué » |
| Gazouiller | `C` | Bouton « Chanter » |
| Retour au nid | — | Bouton ↺ du dock |
| Couper le son | — | Bouton haut-parleur |

La cartographie `W` = nez vers le bas suit la convention des simulateurs de vol (manche poussé), pas celle des jeux d'aventure.

## Structure du projet

```text
src/
├── App.tsx                    # État global (pièces, oiseaux, missions, entrées), persistance, HUD
├── main.tsx                   # Point d'entrée React
├── index.css                  # `@import "tailwindcss";` uniquement
├── types/game.ts              # Contrats de données (BirdDef, Mission, CoinPickup…)
├── game/
│   ├── flightController.ts    # Physique de vol, caméra, télémétrie (sans React)
│   ├── birdsData.ts           # Catalogue des 17 oiseaux
│   └── missionsData.ts        # Missions, objectifs, pièces, ascendances, points d'intérêt
├── world/
│   ├── proceduralWorld.ts     # getTerrainHeight(), terrain streamé, bâtiments, forêt, nuages, anneaux
│   └── birdModel.ts           # Oiseau articulé (ailes, queue, tête, morphologie) et animation de vol
├── components/
│   ├── FlightCanvas.tsx       # Canvas WebGL, boucle de jeu, détection objectifs/pièces
│   ├── MissionHUD.tsx         # Bandeau mission, solde de pièces, boutons Missions/Boutique
│   ├── MissionPickerModal.tsx # Sélecteur de mission (gains, distances, rejouabilité)
│   ├── BirdShopModal.tsx      # Volière / boutique
│   ├── BirdPreview3D.tsx      # Scène Three.js dédiée à l'aperçu 3D d'un oiseau
│   ├── Minimap.tsx            # Radar orienté, distance à l'objectif, zoom/agrandissement
│   └── FlightControlsOverlay.tsx # Télémétrie, boutons de vol, D-pad mobile, son
└── audio/soundManager.ts      # Synthèse Web Audio (vent, battements, fanfares)
```

### Comment ça tourne

1. `App` détient tout l'état React et le sauvegarde dans `localStorage`.
2. `FlightCanvas` monte le renderer **une seule fois** (`useEffect(..., [])`) et recopie les props dans des `refs`.
3. La boucle `tick()` : physique → mesh de l'oiseau → animation/streaming du monde → tests de proximité objectif/pièces → télémétrie vers React → rendu.
4. `getTerrainHeight(x, z)` est la source de vérité unique et **non bornée** : maillage des tuiles, placement des arbres/bâtiments et collision au sol. `updateWorld()` reçoit la position du joueur pour régénérer les tuiles, l'océan et les nuages autour de lui.

## Persistance

Sauvegarde locale (`localStorage`), clés à ne pas renommer :

| Clé | Contenu |
| --- | --- |
| `lenvol_bird_coins` | Solde de pièces |
| `lenvol_bird_unlocked` | IDs des oiseaux débloqués |
| `lenvol_active_bird` | Oiseau équipé |
| `lenvol_missions_state` | Missions, objectifs et progression |

Les pièces du monde (`INITIAL_COINS`) ne sont **pas** persistées : elles réapparaissent à chaque rechargement. La position de vol, la mission active et le réglage du son ne sont pas sauvegardés non plus.

## Dépannage

- **`ERESOLVE` / conflit de peer dependency** → `npm install --legacy-peer-deps`.
- **Rendu très lent (~15 fps)** → WebGL logiciel détecté (SwiftShader, llvmpipe) : ombres et antialiasing sont désactivés et la boucle est volontairement bridée (~60 ms/frame). Normal en VM ou navigateur headless.
- **Pas de son** → l'`AudioContext` exige un geste utilisateur : cliquez dans la page ou appuyez sur une touche.
- **`GEMINI_API_KEY` / `APP_URL`** → vestiges du template AI Studio, jamais lus par le code. Aucun backend à lancer.
- **Port 3000 occupé** → modifiez `--port` dans le script `dev`.

### Limites connues

- Les pièces du monde et la position de vol ne sont pas sauvegardées ; la mission active est perdue au rechargement.
- Relancer une mission depuis le sélecteur remet ses objectifs à zéro (c'est volontaire, les missions sont rejouables).

## Contribuer

- Le texte visible par le joueur est en **français**, les identifiants de code en anglais.
- Aucun asset image/son/font : tout est généré (Three.js, Canvas, Web Audio).
- Ne pas recréer le renderer WebGL depuis React ; passer par les `refs` existants.
- Ne pas modifier le bloc `DISABLE_HMR` de `vite.config.ts` (comportement AI Studio).
- Ajouter un oiseau = une entrée dans `birdsData.ts` (les champs optionnels `bodyWidth` / `tailLength` / `beakLength` / `crestSize` pilotent sa silhouette 3D) ; une mission = une entrée dans `INITIAL_MISSIONS`. Toutes les missions sont librement sélectionnables.
