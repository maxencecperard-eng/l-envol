# PRD — L'Envol, simulateur d'oiseau

| | |
| --- | --- |
| **Produit** | L'Envol — simulateur de vol d'oiseau (navigateur) |
| **Version du document** | 1.0 — état des lieux de l'implémentation |
| **Statut** | MVP jouable, 100 % client |
| **Plateforme** | Web desktop et mobile (React 19 + Three.js) |
| **Date** | 29/10/2026 |

Ce PRD décrit le produit **tel qu'implémenté** dans ce dépôt. Chaque exigence porte un identifiant et un statut : `Implémenté`, `Partiel` ou `Prévu`. Les chiffres (vitesses, prix, récompenses) sont ceux du code, pas des cibles marketing.

---

## 1. Contexte et problème

Les jeux de vol grand public demandent des dizaines de touches, des heures de tutoriel et un matériel dédié. Le grand public, et notamment un public jeune ou occasionnel, décroche avant d'avoir ressenti la sensation de vol.

**Proposition** : un simulateur d'oiseau immédiatement lisible — une touche pour battre des ailes, quatre directions, aucune avarie — où la progression passe par la découverte du monde et le déblocage d'espèces, pas par la difficulté de pilotage.

**Objectif d'expérience** : en moins de 60 secondes, le joueur décolle, franchit un anneau et comprend qu'il peut gagner des pièces pour changer d'oiseau.

## 2. Objectifs et non-objectifs

### Objectifs

1. Offrir une sensation de vol lisible (vitesse, altitude, piqué, ascendances) sans simulation aérodynamique complexe.
2. Donner un cap permanent : une mission active, un objectif localisé, une distance affichée.
3. Créer une boucle de progression courte : mission → pièces → nouvel oiseau → missions plus ambitieuses.
4. Rester sans backend, sans assets binaires, déployable sur un simple hébergement statique.

### Non-objectifs (v1)

- Multijoueur, classements, comptes utilisateurs.
- Dommages, crash, météo dynamique, cycle jour/nuit.
- Éditeur de niveaux ou monde infini.
- Support manette, VR, ou rendu serveur.

## 3. Publics cibles

| Persona | Attente | Réponse produit |
| --- | --- | --- |
| Joueur occasionnel / familial | Prendre plaisir en 1 minute | Contrôles à 4 touches, didacticiel en 3 étapes, aucune sanction |
| Amateur d'exploration | Un monde à parcourir | Monde sans bord, 6 points d'intérêt, 108 pièces, 18 ascendances, radar |
| Collectionneur | Débloquer du contenu | 17 oiseaux, prix et statistiques différenciés, aperçu 3D |
| Développeur / étudiant | Comprendre une scène Three.js complète | Code séparé logique / rendu / UI, tout procédural |

## 4. Boucle de jeu

1. **Décoller** depuis le nid du Grand Chêne `(0, 24, 0)`.
2. **Suivre** l'objectif actif : anneau doré, colonne de lumière bleue, distance et cap sur le radar.
3. **Atteindre** la zone (rayon de l'objectif) ou ramasser les pièces (rayon 3,2).
4. **Terminer** les 2 à 4 étapes de la mission → fanfare, confettis, pièces créditées.
5. **Choisir** une nouvelle mission librement dans le sélecteur, puis dépenser ses pièces en Volière pour un oiseau plus rapide.

La boucle n'a pas d'état d'échec : on ne peut pas perdre, seulement errer. Le coût d'une erreur est du temps de vol.

## 5. Exigences fonctionnelles

### FR-1 — Vol et physique

- `Implémenté` Modèle arcade : lacet, tangage et roulis amortis, sans simulation de portance réelle.
- `Implémenté` Le lacet est proportionnel à la vitesse : `turnSpeed × (vitesse / baseSpeed)` rad/s.
- `Implémenté` Piqué : `Maj` **ou** tangage < −0,3 rad → accélération jusqu'à `maxSpeed × diveMultiplier`, descente de 10 à 28 u/s.
- `Implémenté` Battement (`Espace`) : gain d'altitude et de vitesse plafonné à 95 % de `maxSpeed`.
- `Implémenté` Plané : descente lente dépendant de `glideStat` ; cabrage au-delà de 0,2 rad : montée avec perte de vitesse.
- `Implémenté` Ascendances thermiques : sous 110 m d'altitude, dans un rayon de 24 à 32, montée proportionnelle à la distance au centre + vitesse rapprochée de 85 % de `maxSpeed`.
- `Implémenté` Sol : seuil de collision à `terrain + 1,6` m, rappel amorti vers `terrain + 2,8` m ; plafond dur à 150 m ; `dt` borné à 0,1 s.
- `Implémenté` Caméra de poursuite : distance 6,8 à 9 m selon la vitesse, FOV animé selon le rapport de vitesse (base 60°).
- `Partiel` Aucune collision avec les bâtiments, arbres ou nuages : seul le terrain est pris en compte.

**Critères d'acceptation** : depuis le spawn, `Espace` fait monter l'altitude ; `Maj` fait dépasser la vitesse de croisière ; le survol d'une ascendance affiche « Courant Chaud + » et fait gagner de l'altitude ; l'oiseau ne traverse jamais le sol.

### FR-2 — Monde

- `Implémenté` Terrain **sans bord** : tuiles de 480 unités (36 × 36 segments) régénérées en anneau 5 × 5 autour du joueur, colorées par altitude et par patchs.
- `Implémenté` Océan infini qui suit le joueur (niveau 1,2), lacs en dépression, plafond de vol à 150 m.
- `Implémenté` 6 points d'intérêt autour de la vallée de départ : Grand Chêne et nid royal, Moulin à vent (pales animées), Grand Phare (faisceau rotatif), Village perché et clocher, Falaises brumeuses (relief), Lac Émeraude.
- `Implémenté` Forêt instanciée par tuile, 22 amas de nuages qui se replacent autour du joueur, anneau et colonne de lumière mission.
- `Implémenté` `getTerrainHeight(x, z)` est la source de vérité unique (tuiles, placement, collision) et reste continue aux jointures.
- `Implémenté` Monde déterministe : relief, arbres, pièces et ascendances lointaines sont générés par graines fixes.

### FR-3 — Missions et progression

- `Implémenté` 8 missions, 25 objectifs, 3 catégories affichées : `didacticiel`, `aventure`, `defi`.
- `Implémenté` Une seule mission active à la fois ; le sélecteur de missions liste **toutes** les missions avec récompense, distance depuis la position du joueur et longueur du parcours.
- `Implémenté` Toutes les missions sont sélectionnables et rejouables ; en lancer une remet ses objectifs à zéro.
- `Implémenté` Objectif validé par proximité 3D (`distance ≤ objective.radius`), détecté dans la boucle de rendu.
- `Implémenté` Récompense en pièces + confettis + fanfare à la dernière étape ; message « Mission accomplie ».
- `Implémenté` Objectif `light_safe` remonté à `(−125, 20, 115)` : la mission 3 est terminable.
- `Partiel` L'objectif de type `land` (« se poser sur l'îlot ») se valide en volant dans le rayon, sans condition de contact avec le sol.
- `Partiel` La mission active n'est pas sauvegardée au rechargement.
- `Prévu` Missions chronométrées (`speed_run` est déclaré dans les types mais aucun contenu ne l'utilise).

**Critères d'acceptation** : la mission 1 est jouable dès le premier lancement ; chaque étape coche une pastille du HUD ; la fin de mission crédite exactement `coinReward` et débloque la suivante.

### FR-4 — Économie et Volière

- `Implémenté` Monnaie unique : pièces. Solde initial 30, jamais négatif (`handleBuyBird` refuse si insuffisant).
- `Implémenté` 17 oiseaux, du Moineau gratuit (0) au Phénix (1 300), avec silhouettes distinctes (largeur du corps, queue, bec, crête).
- `Implémenté` Achat : débit, déverrouillage et équipement immédiat ; confettis + son d'achat.
- `Implémenté` Volière avec **aperçu 3D animé** de chaque espèce (une seule scène WebGL, navigation par cartes et flèches).
- `Implémenté` Chaque oiseau expose 4 statistiques d'affichage (vitesse, maniabilité, plané, piqué) et 5 paramètres physiques (`baseSpeed`, `maxSpeed`, `diveMultiplier`, `turnSpeed`, `flapStrength`).
- `Implémenté` Le changement d'oiseau est appliqué à chaud (contrôleur + couleurs + échelle), sans rechargement de scène.
- `Partiel` L'économie est purement locale : pas de serveur, pas de remboursement ni de revente.

### FR-5 — HUD, journal et minimap

- `Implémenté` Bandeau haut : catégorie, titre, instruction courante, astuce, progression `x/n`, récompense.
- `Implémenté` Sélecteur de missions : toutes les missions, statuts Terminé / En cours / Disponible, récompense, distance au prochain objectif, longueur du parcours et bouton Lancer/Rejouer.
- `Implémenté` Radar circulaire orienté, portée 220 par défaut (cycle 220 → 450 → 900 → 1 800), extension 170 → 240 px, points d'intérêt, balise d'objectif, flèche du joueur, altitude et mention « Monde ouvert ∞ ».
- `Implémenté` Distance à l'objectif en mètres/kilomètres et flèche de cap relative.
- `Implémenté` Dock de vol : vitesse (km/h), altitude (m), état piqué, indicateur d'ascendance, boutons Battre/Piqué/Chanter, mute, retour au nid.
- `Implémenté` D-pad tactile affiché sous le breakpoint `sm` (640 px).

### FR-6 — Audio

- `Implémenté` Vent continu filtré, dont la fréquence (200 à 2 450 Hz, ratio de vitesse borné à 2,5) et le gain suivent la vitesse.
- `Implémenté` Effets synthétisés : battement, pièce, gazouillis aléatoire, passage d'anneau, fanfare de mission, achat.
- `Implémenté` Coupure du son globale via le dock ; l'audio démarre au premier geste utilisateur.
- `Partiel` Pas de réglage de volume ni de préférence de mute persistée.

### FR-7 — Persistance

- `Implémenté` `localStorage` : `lenvol_bird_coins`, `lenvol_bird_unlocked`, `lenvol_active_bird`, `lenvol_missions_state`.
- `Partiel` Non persistés : pièces ramassées dans le monde, position, mission active, mute.
- `Prévu` Réinitialisation de sauvegarde et export/import.

### FR-8 — Contrôles et responsive

- `Implémenté` Clavier (AZERTY/QWERTY via `e.code`) : `W/↑` piquer, `S/↓` cabrer, `A/D` virer, `Espace` battre, `Maj` piquer, `C` chanter.
- `Implémenté` Les saisies clavier sont ignorées dans les champs de formulaire.
- `Implémenté` HUD adaptatif (Tailwind) ; D-pad et boutons tactiles sur petit écran.
- `Partiel` Le D-pad dépend du breakpoint CSS, pas d'une détection tactile réelle.
- `Prévu` Manette, remappage des touches, pause.

## 6. Contenu livré

### Oiseaux

| Oiseau | Prix | `baseSpeed` | `maxSpeed` | Vitesse affichée* | Piqué |
| --- | ---: | ---: | ---: | ---: | ---: |
| Moineau des Prés | 0 | 14 | 22 | 79 km/h | 1,6× |
| Rougegorge Familier | 40 | 15 | 23 | 83 km/h | 1,65× |
| Chardonneret Élégant | 80 | 16 | 25 | 90 km/h | 1,65× |
| Hirondelle Azur | 100 | 19 | 29 | 104 km/h | 1,9× |
| Martin-Pêcheur d'Azur | 150 | 19 | 28 | 101 km/h | 2,15× |
| Geai des Chênes | 190 | 18 | 27 | 97 km/h | 1,8× |
| Pigeon Voyageur | 220 | 16 | 25 | 90 km/h | 1,7× |
| Pie Bavarde | 260 | 19 | 28 | 101 km/h | 1,85× |
| Grand-Duc d'Europe | 340 | 18 | 27 | 97 km/h | 1,9× |
| Grand Corbeau | 420 | 19 | 29 | 104 km/h | 1,95× |
| Faucon Pèlerin | 450 | 24 | 38 | 137 km/h | 2,5× |
| Colibri Émeraude | 520 | 22 | 33 | 119 km/h | 1,7× |
| Albatros des Tempêtes | 600 | 17 | 27 | 97 km/h | 1,8× |
| Aigle Royal | 750 | 27 | 44 | 158 km/h | 2,3× |
| Harfang des Neiges | 850 | 20 | 31 | 112 km/h | 2,05× |
| Condor des Andes | 1 100 | 21 | 33 | 119 km/h | 2,0× |
| Phénix Céleste | 1 300 | 33 | 54 | 194 km/h | 2,8× |

\* `maxSpeed × 3,6`, tel qu'affiché sur les cartes de la Volière. En piqué, la vitesse peut approcher `maxSpeed × diveMultiplier × 3,6` (jusqu'à ~544 km/h pour le Phénix).

### Missions

| # | Mission | Catégorie | Étapes | Récompense |
| --- | --- | --- | ---: | ---: |
| 1 | Didacticiel : Premier Envol | didacticiel | 3 | 60 |
| 2 | Brindilles pour le Nid Royal | aventure | 4 | 120 |
| 3 | Le Mystère du Grand Phare | aventure | 3 | 180 |
| 4 | Le Slalom des Nuages | défi | 4 | 250 |
| 5 | Le Courrier des Cimes | aventure | 2 | 320 |
| 6 | L'Épreuve Solaire du Phénix | défi | 3 | 500 |
| 7 | Les Confins du Monde | aventure | 3 | 650 |
| 8 | L'Odyssée Sans Frontières | défi | 3 | 1 200 |

### Monde

| Élément | Quantité | Détail |
| --- | ---: | --- |
| Tuiles de terrain | 5 × 5 autour du joueur | 480 unités, 36 × 36 segments, régénérées en continu |
| Points d'intérêt | 6 | Nid, Moulin, Phare, Village, Falaises, Lac |
| Ascendances thermiques | 18 | Rayon 24–36, force 17–27 |
| Pièces flottantes | 108 | Valeur 5 / 10 / 15 / 20 |
| Arbres | ~34–68 par tuile | Instanciés, hors zones bâties |
| Nuages | 22 amas | Altitude 55–105, replacés autour du joueur |

## 7. Équilibrage économique

| Flux | Montant |
| --- | ---: |
| Solde initial | 30 |
| Total des récompenses de mission | 3 280 |
| Total des pièces du monde (par partie) | 900 |
| Coût cumulé des 17 oiseaux | 7 370 |

**Constat** : missions + solde initial + pièces du monde ≈ 4 210 pièces par partie. Les missions étant rejouables et le monde sans bord, la collection complète reste un objectif long mais atteignable sans rechargement forcé.

**Risque produit** : le grind vers le Phénix peut être perçu comme artificiel si le joueur enchaîne les mêmes missions. Voir § 12.

**Risque produit** : le grind vers le Phénix peut être perçu comme artificiel, faute de missions rejouables ou de récompenses répétables. Voir § 12.

## 8. Exigences non fonctionnelles

| Domaine | Exigence | État |
| --- | --- | --- |
| Performance | 60 fps sur GPU intégré récent ; rendu dégradé automatique si WebGL logiciel | `Partiel` (dégradation auto en place, aucune mesure sur GPU réel) |
| Poids | Bundle initial < 1 Mo | `Implémenté` (848 ko minifié, 230 ko gzip) |
| Compatibilité | Navigateurs WebGL2 récents, desktop et mobile | `Partiel` (aucune matrice de tests) |
| Latence d'entrée | Réaction au clavier < 1 frame | `Implémenté` par conception (refs, pas de re-render par frame) |
| Robustesse | Aucun crash si `localStorage` corrompu | `Implémenté` (`try/catch` sur la lecture JSON) |
| Accessibilité | Navigation clavier complète, contrastes élevés | `Partiel` (canvas non accessible, pas de `prefers-reduced-motion`) |
| Observabilité | Mesure d'usage, erreurs | `Prévu` (aucune analytics) |
| Internationalisation | Textes externalisés | `Prévu` (chaînes françaises en dur) |

## 9. Contraintes techniques

- **Client-only** : aucun serveur, aucune API. `express`, `dotenv`, `@google/genai`, `tsx`, `esbuild` sont des vestiges du template AI Studio et `metadata.json` n'est lu par aucun code ; `GEMINI_API_KEY` et `APP_URL` ne sont jamais utilisés.
- **Zéro asset binaire** : géométries Three.js, couleurs, nuages et sons sont générés au runtime. Toute nouvelle ressource doit rester procédurale.
- **Un seul canvas de jeu**, monté une fois ; les props passent par des `refs` pour ne jamais relancer la boucle. La Volière ajoute un canvas d'aperçu éphémère (`BirdPreview3D`), détruit à la fermeture.
- **`localStorage` comme seule base de données** : les clés existantes constituent le format de sauvegarde.
- **Alias `@/`** pointant vers la racine du dépôt (et non `src/`).
- **Build** : Vite 8 ; l'installation npm exige `--legacy-peer-deps`.

## 10. Limites connues et dette

- **P2** : `trailPointsLeft/Right` et `trailMeshLeft/Right` sont déclarés dans `birdModel.ts` mais aucun ruban de sillage n'est créé ni rendu.
- **P2** : les pièces du monde ne sont pas persistées ; recharger la page les fait réapparaître.
- **P2** : l'objectif `land` ne vérifie pas l'atterrissage (même corrigé, il ne validerait qu'une proximité).
- **P2** : pas de collision avec le décor (bâtiments, arbres) ; le vol peut traverser le Phare.
- **P2** : la mission active est perdue au rechargement (les missions restent librement sélectionnables).
- **P3** : les tuiles de terrain se régénèrent par lignes/colonnes de 5 à chaque franchissement de 480 unités ; un micro-freeze est possible sur GPU très lent.
- **P3** : `MissionType` (`speed_run`, `tutorial`) et la dépendance `motion` ne sont pas utilisés.
- **P2** : aucun test automatisé, aucune CI, aucun formatter ; `lint` = `tsc --noEmit`.
- **P3** : aucune détection tactile réelle (le D-pad suit le breakpoint CSS).
- **P3** : pas de pause ni de gestion de l'onglet inactif (le `dt` est borné, donc pas de saut, mais la simulation continue).

## 11. Critères d'acceptation du MVP

- [ ] `npm install --legacy-peer-deps && npm run dev` lance le jeu sur `http://localhost:3000`.
- [ ] `npm run lint` et `npm run build` passent sans erreur.
- [ ] Le joueur décolle, vole et franchit le premier anneau sans documentation externe.
- [ ] Les 8 missions sont terminables et créditent leur récompense exacte.
- [ ] Les 17 oiseaux sont achetables et modifient réellement le comportement de vol.
- [ ] Le rechargement conserve pièces, oiseaux débloqués, oiseau équipé et progression des missions.
- [ ] Le jeu reste jouable au clavier sur desktop et au tactile sur mobile.
- [ ] Aucune requête réseau après le chargement des bundles.

## 12. Roadmap proposée

### v1.1 — Confort et cohérence

- **Corriger l'objectif `light_safe`** (mission 3) pour rétablir la progression.
- Rubans de sillage fonctionnels (ou suppression du code mort).
- Validation réelle de l'atterrissage (`land`) : altitude proche du sol + vitesse faible.
- Persistance des pièces ramassées ou réapparition temporisée ; réinitialisation de sauvegarde.
- Rejouabilité des missions terminées + mission active sauvegardée.
- Pause, `prefers-reduced-motion`, réglage de volume.

### v1.2 — Profondeur de jeu

- 2 à 3 missions `speed_run` chronométrées avec médailles.
- Déblocage par prérequis explicites plutôt que par index.
- Collisions douces avec le décor ou zone de turbulence.
- Cycle jour/nuit léger et météo (vent, brume) modifiant la physique.

### v2 — Extension

- Éditeur de parcours et missions générées.
- Succès, collection d'espèces, skins.
- Manette et remappage clavier.
- Internationalisation FR/EN.

## 13. Risques

| Risque | Impact | Mitigation |
| --- | --- | --- |
| Objectif de mission hors d'atteinte (mission 3) | Progression bloquée pour tous les joueurs | Corriger la hauteur/le rayon de `light_safe` (P0) |
| Grind économique avant le Phénix | Abandon en milieu de progression | Missions rejouables, récompenses journalières, pièces persistées |
| Perte de sauvegarde (localStorage vidé, navigation privée) | Frustration | Export/import de sauvegarde, message explicite |
| Performance sur GPU faible / VM | Jeu perçu comme cassé | Rendu dégradé déjà en place ; afficher un avertissement explicite |
| Monde visuellement aléatoire d'une session à l'autre | Incohérence des repères | Seed déterministe pour arbres et nuages |
| Absence de tests | Régressions silencieuses | Ajouter Vitest sur `FlightController` et les règles de mission |

## 14. Questions ouvertes

1. Faut-il conserver le respawn des pièces à chaque rechargement (farming) ou introduire un timer de réapparition ?
2. Le Phénix doit-il rester un objectif de collection long, ou être accessible via une mission finale dédiée ?
3. Souhaite-t-on une sauvegarde multi-profils sur un même navigateur ?
4. Le monde doit-il être identique à chaque partie (seed fixe) pour la lisibilité des missions ?
5. Faut-il conserver la dépendance `motion` et les scripts hérités du template AI Studio ?
