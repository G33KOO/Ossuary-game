# Contrôle qualité — 14 octobre 2026

## Périmètre

Contrôle local de l'accueil, des règles, du catalogue et du mode solo. Matrice des pages : thèmes sombre et clair, fenêtres 1920 × 945, 1366 × 768, 390 × 844 et 320 × 568. La hauteur desktop de 945 px réserve de la place aux barres du navigateur sur un écran 1080p.

## Corrections

- Les boutons de navigation mobile utilisent désormais la palette commune, sans redéfinition de leur fond dans les styles du plateau.
- La puissance et le dé restent sur la même ligne sur les petits écrans. L'actif de classe utilise une ligne dédiée.
- Les nouveaux choix et effets amènent automatiquement la zone de combat dans la partie visible du plateau mobile. Pendant une décision, la main est plus compacte et ses commandes temporairement indisponibles sont masquées.
- Les présentations d'effets évitent de dupliquer la carte déjà visible dans le contexte du combat mobile.
- Les fiches de cartes conservent leur espace intérieur mobile même lorsque les feuilles de style sont chargées dans un ordre différent.
- Les contrôles puissance, actif et dé sont regroupés dans `HeroCombatControls.tsx`. Le défilement vers une décision est partagé dans `useBoardFocus.ts`.
- Le code inaccessible de l'ancienne modale d'inventaire de la taverne a été retiré du composant principal. Les scripts de vérification utilisent maintenant la main réelle.
- Les règles et le mode solo sont chargés à la demande. Le JavaScript principal passe d'environ 613 Ko à 467 Ko avant compression ; le build ne signale plus de chunk supérieur à 500 Ko.
- `npm test` lance les tests du moteur.

## Vérifications

- TypeScript et build Vite : réussis.
- Lint : réussi.
- Vitest : 255 tests réussis dans 8 fichiers.
- Inventaire des effets : 240 cartes physiques, dont 210 compatibles ou adaptées au solo ; voir `card-effects.md`.
- Pages : 32 configurations, sans débordement horizontal ni image cassée ; fiches centrées dans les fenêtres testées.
- Boutons : 32 contextes en thèmes clair et sombre, sans bouton gris natif ni divergence de palette relevée.
- Combat : 41 contrôles, comprenant effets et dés des monstres, choix de la Suzeraine, restrictions d'artefact, fuite, Hache Fétiche et récapitulatif du boss.
- Plateau de boss : carte, main et équipements sans chevauchement dans les quatre formats testés ; pas de défilement du plateau en 1920 × 945.
- Dé : alignement avec la puissance, invitation à lancer, résultat, blocage de la fuite après engagement et réduction des animations.
- Parcours récents : introduction et serments sur le plateau, défausse avant taverne par glisser-déposer ou bouton mobile, contexte des choix de monstres, actifs des six classes, rejouer après victoire et défaite.

## Reproduction

```text
npm run build
npm run lint
npm test
npm run audit:cards
npm run preview -- --host 127.0.0.1 --port 4173
```

Les scripts navigateur nécessitent Chrome avec un profil de test isolé sur le port de débogage 9227. Les fixtures de jeu utilisent le serveur Vite local sur 5174. `scripts/global-quality-qa.mjs` accepte aussi `OSSUAIRE_QA_URL` pour contrôler le build servi sur 4173. Captures et rapports JSON sont écrits dans le dossier temporaire `ossuaire-qa`.

Ces contrôles couvrent les formats et parcours cités, pas toutes les combinaisons de cartes ni tous les navigateurs. Les petites fenêtres mobiles conservent un défilement interne du plateau et de la main lorsque le contenu dépasse l'espace disponible.
