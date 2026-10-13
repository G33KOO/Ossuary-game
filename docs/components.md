# Composants et responsabilités

- `Modal` et `ModalHeader` : centrage, titre, fermeture, focus et clavier pour les choix du jeu, les effets et les informations. La fiche de carte et la galerie de défausse utilisent aussi le même header, avec un layout adapté à leur contenu.
- `DropTarget` : cible, surlignage et validation du drag and drop. Les événements déclenchent les actions ; le rendu ne lit pas les références du moteur.
- `game-ui` : cartes du plateau, pioches, défausses, galeries, dés et scores. `SoloBoard` orchestre la partie et les présentations.
- `CardClassBadge` et `cardSymbols` : mêmes classes, images et symboles dans le catalogue, le plateau et les détails.
- `localeContext`, `LocaleProvider`, `useLocale` : contexte, persistance et consommation de la traduction séparés.
- `power` : calcul partagé des valeurs affichées et des combats. Les effets d’équipement n’ont pas de calcul parallèle dans les composants.
- `engine` : règles et transitions pures ; les animations lisent les événements sans modifier les résultats.
- `DiceResults` : dés naturels, somme ou minimum, modificateurs, résultat final et couleurs de bonus/malus, partagés entre le plateau, les effets et le récapitulatif.
- `EffectPresentation` : une étape automatique à la fois ; le jet se termine avant que « Suivant » soit disponible. Les récompenses et les monstres enchaînés attendent la fin des étapes précédentes.
- `HeroInventory` : consultation de la main, des équipements et des cartes natives depuis la taverne, sans changer les offres.
- `CombatRecap` : calcul et cartes jouées du duel final. Le moteur conserve un instantané du verdict ; le plateau et la sauvegarde utilisent cet instantané après la fin de partie.
- `MonsterRewards` : pictogrammes officiels de niveaux et de Butins, avec les valeurs imprimées et les explications au survol.
- `CombatResolution` : attaque du héros, disparition du Monstre réellement vaincu, riposte en cas de défaite et conséquences dans le bloc combat. Le plateau conserve son état avant résolution jusqu’à « Suivant », puis poursuit les effets et récompenses.
- `Pile` : pioches sans texte superposé aux cartes ; l’action est décrite par une tooltip flottante au survol et au focus, qui se ferme lors d’une pioche, d’un défilement ou avec Échap.
- `buttons.css` : styles partagés des actions principales, secondaires et désactivées, des filtres et des contrôles de modale ; palettes braise et laiton adaptées aux thèmes clair et sombre. Les cartes et les dés conservent leurs formes propres.

Les modales natives conservent la navigation au clavier et empêchent les actions sur le plateau pendant un choix. Les informations secondaires du mobile sont disponibles à la demande, tandis que les commandes de combat restent visibles.
