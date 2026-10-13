# Composants et responsabilités

- `Modal` et `ModalHeader` : centrage, titre, fermeture, focus et clavier pour les choix du jeu, les effets et les informations. La fiche de carte et la galerie de défausse utilisent aussi le même header, avec un layout adapté à leur contenu.
- `DropTarget` : cible, surlignage et validation du drag and drop. Les événements déclenchent les actions ; le rendu ne lit pas les références du moteur.
- `game-ui` : cartes du plateau, pioches, défausses, galeries, dés et scores. `SoloBoard` orchestre la partie et les présentations.
- `CardClassBadge` et `cardSymbols` : mêmes classes, images et symboles dans le catalogue, le plateau et les détails.
- `localeContext`, `LocaleProvider`, `useLocale` : contexte, persistance et consommation de la traduction séparés.
- `power` : calcul partagé des valeurs affichées et des combats. Les effets d’équipement n’ont pas de calcul parallèle dans les composants.
- `engine` : règles et transitions pures ; les animations lisent les événements sans modifier les résultats.

Les modales natives conservent la navigation au clavier et empêchent les actions sur le plateau pendant un choix. Les informations secondaires du mobile sont disponibles à la demande, tandis que les commandes de combat restent visibles.
