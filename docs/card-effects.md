# Audit des effets de cartes

Le catalogue contient 240 cartes physiques. Chaque copie est classée ci-dessous ; les doublons partagent leur comportement. Cet inventaire vérifie le raccordement au moteur, pas une preuve exhaustive de toutes les combinaisons possibles.

## Périmètre solo

211 cartes sont utilisables ou adaptées au solo ; 29 copies sont incompatibles avec le solo et restent exclues des pioches. Les 14 Actions exclues et les 4 Serments multijoueur sont visibles dans le catalogue. Le Voleur et l’Usurpateur utilisent les adaptations solo indiquées ci-dessous. Le Boss suit les priorités définies dans les règles solo ; il ne reproduit pas un joueur humain pour toutes les Actions de sa main.

## Vérification

- engine.test.ts : parties complètes déterministes, conservation des cartes, ordre des réactions, équipement et navigation de la Taverne.
- effects.test.ts : toutes les Armures, Armes maîtrisées et Actions utilisables en solo, effets spéciaux d’Armes, restrictions et choix de Monstres, classes, races et effets persistants.
- oaths.test.ts : les 8 Serments compatibles solo, leurs conditions et leurs bonus.
- scripts/browser-qa.mjs : navigateur isolé, géométrie du plateau, pages, fiche mobile, centrage et retour de Taverne.

## Inventaire

| Carte | Nom | Comportement | Présentation |
| --- | --- | --- | --- |
| OSS-CARD-001 | Guerrier | Actif de classe + coût + choix | Choix, dé, puissance ou pioche |
| OSS-CARD-002 | Druide | Actif de classe + coût + choix | Choix, dé, puissance ou pioche |
| OSS-CARD-003 | Chasseur | Actif de classe + coût + choix | Choix, dé, puissance ou pioche |
| OSS-CARD-004 | Mage | Actif de classe + coût + choix | Choix, dé, puissance ou pioche |
| OSS-CARD-005 | Voleur | Adaptation solo : choix de Butin hors combat ou échange d’équipement avec le Boss | Choix, dé, puissance ou pioche |
| OSS-CARD-006 | Nécromancien | Actif de classe + coût + choix | Choix, dé, puissance ou pioche |
| OSS-CARD-007 | Nain | Passif : main, dé, armes, pioche, serments ou fuite | Puissance, dé, choix ou pioche |
| OSS-CARD-008 | Humain | Passif : main, dé, armes, pioche, serments ou fuite | Puissance, dé, choix ou pioche |
| OSS-CARD-009 | Elfe | Passif : main, dé, armes, pioche, serments ou fuite | Puissance, dé, choix ou pioche |
| OSS-CARD-010 | Orc | Passif : main, dé, armes, pioche, serments ou fuite | Puissance, dé, choix ou pioche |
| OSS-CARD-011 | Revenant | Passif : main, dé, armes, pioche, serments ou fuite | Puissance, dé, choix ou pioche |
| OSS-CARD-012 | Vesskar | Passif : main, dé, armes, pioche, serments ou fuite | Puissance, dé, choix ou pioche |
| OSS-CARD-013 | Plastron Écaillefer | Puissance imprimée, emplacement et doublement | Valeur dorée + puissance |
| OSS-CARD-014 | Plastron Côtelé | Puissance imprimée, emplacement et doublement | Valeur dorée + puissance |
| OSS-CARD-015 | Plastron Fauve | Puissance imprimée, emplacement et doublement | Valeur dorée + puissance |
| OSS-CARD-016 | Plastron Scarabée | Puissance imprimée, emplacement et doublement | Valeur dorée + puissance |
| OSS-CARD-017 | Plastron du Lion | Puissance imprimée, emplacement et doublement | Valeur dorée + puissance |
| OSS-CARD-018 | Plastron Cœur-de-Dragon | Puissance imprimée, emplacement et doublement | Valeur dorée + puissance |
| OSS-CARD-019 | Bottes Longue-Piste | Puissance imprimée, emplacement et doublement | Valeur dorée + puissance |
| OSS-CARD-020 | Bottes Fer-Semelle | Puissance imprimée, emplacement et doublement | Valeur dorée + puissance |
| OSS-CARD-021 | Bottes Nomades | Puissance imprimée, emplacement et doublement | Valeur dorée + puissance |
| OSS-CARD-022 | Bottes Mille-Lames | Puissance imprimée, emplacement et doublement | Valeur dorée + puissance |
| OSS-CARD-023 | Bottes Solaires | Puissance imprimée, emplacement et doublement | Valeur dorée + puissance |
| OSS-CARD-024 | Bottes Ailées | Puissance imprimée, emplacement et doublement | Valeur dorée + puissance |
| OSS-CARD-025 | Gants Nervurés | Puissance imprimée, emplacement et doublement | Valeur dorée + puissance |
| OSS-CARD-026 | Gants Brise-Phalanges | Puissance imprimée, emplacement et doublement | Valeur dorée + puissance |
| OSS-CARD-027 | Mitaines Tressecuir | Puissance imprimée, emplacement et doublement | Valeur dorée + puissance |
| OSS-CARD-028 | Gantelets Carapace | Puissance imprimée, emplacement et doublement | Valeur dorée + puissance |
| OSS-CARD-029 | Gantelets Clairargent | Puissance imprimée, emplacement et doublement | Valeur dorée + puissance |
| OSS-CARD-030 | Gantelets Forge-Royale | Puissance imprimée, emplacement et doublement | Valeur dorée + puissance |
| OSS-CARD-031 | Casque Bois-Cornu | Puissance imprimée, emplacement et doublement | Valeur dorée + puissance |
| OSS-CARD-032 | Heaume Bec-de-Fer | Puissance imprimée, emplacement et doublement | Valeur dorée + puissance |
| OSS-CARD-033 | Masque Voilé | Puissance imprimée, emplacement et doublement | Valeur dorée + puissance |
| OSS-CARD-034 | Coiffe Loup-Sorcier | Puissance imprimée, emplacement et doublement | Valeur dorée + puissance |
| OSS-CARD-035 | Heaume Couronnefer | Puissance imprimée, emplacement et doublement | Valeur dorée + puissance |
| OSS-CARD-036 | Heaume Chimérique | Puissance imprimée, emplacement et doublement | Valeur dorée + puissance |
| OSS-CARD-037 | Lame-Rempart à deux mains | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-038 | Brise-Fer à deux mains | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-039 | Échine-Noire à deux mains | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-040 | Épée Demi-Lune | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-041 | Épée Déchiqueteuse | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-042 | Épée Fer du Conquérant | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-043 | Dague de l’Ombre | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-044 | Dague Veuve | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-045 | Dague Éclat Sauvage | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-046 | Arbalète Mordante | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-047 | Arbalète Guillotine | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-048 | Arbalète Triplette | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-049 | Hache Bois-de-Sang | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-050 | Hache Brise-Mâchoire | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-051 | Hache Éclate-Roc | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-052 | Arc Thoracique | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-053 | Arc Épineux | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-054 | Arc Ramure | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-055 | Baguette Entrelacs | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-056 | Orbe d’Ambre | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-057 | Masse Écailleuse | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-058 | Masse Fongique à deux mains | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-059 | Masse Racinaire à deux mains | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-060 | Masse Totémique à deux mains | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-061 | Baguette Runique | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-062 | Orbe Astral | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-063 | Épée Fractale | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-064 | Bâton du Permafrost à deux mains | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-065 | Bâton des Heures à deux mains | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-066 | Bâton du Nexus à deux mains | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-067 | Baguette Ossuaire | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-068 | Orbe des Âmes | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-069 | Faucille Fossoyeuse | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-070 | Faux du Trépas à deux mains | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-071 | Faux du Requiem à deux mains | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-072 | Faux du Voile à deux mains | Emplacement + maîtrise ×2 + bonus de race | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-073 | Masse Mille-Clous | Effet spécial + emplacement + puissance | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-074 | Masse du Bastion | Effet spécial + emplacement + puissance | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-075 | Masse Nautile | Effet spécial + emplacement + puissance | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-076 | Hache Brise-Enclume à deux mains | Effet spécial + emplacement + puissance | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-077 | Hache Léviathan à deux mains | Effet spécial + emplacement + puissance | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-078 | Hache Fétiche à deux mains | Effet spécial + emplacement + puissance | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-079 | Hache Clairfeuille | Effet spécial + emplacement + puissance | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-080 | Dague Lunefeuille | Effet spécial + emplacement + puissance | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-081 | Baguette Brasier | Effet spécial + emplacement + puissance | Halo, puissance, sacrifice ou pioche |
| OSS-CARD-082 | Étendard des Mille Batailles | Niveau 10 + classe requise + amélioration de l’actif | Actif, dé, choix ou pioche |
| OSS-CARD-083 | Graine de l’Arbre-Vie | Niveau 10 + classe requise + amélioration de l’actif | Actif, dé, choix ou pioche |
| OSS-CARD-084 | Collier des Grandes Chasses | Niveau 10 + classe requise + amélioration de l’actif | Actif, dé, choix ou pioche |
| OSS-CARD-085 | Astrolabe des Arcanes | Niveau 10 + classe requise + amélioration de l’actif | Actif, dé, choix ou pioche |
| OSS-CARD-086 | L’Ombre Dérobée | Niveau 10 + classe requise + amélioration de l’actif | Actif, dé, choix ou pioche |
| OSS-CARD-087 | Codex des Astres Funèbres | Niveau 10 + classe requise + amélioration de l’actif | Actif, dé, choix ou pioche |
| OSS-CARD-088 | Peur | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-089 | Chance | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-090 | Chance | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-091 | Malchance | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-092 | Malchance | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-093 | Faiblesse | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-094 | Faiblesse | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-095 | Force | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-096 | Force | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-097 | Dépossession | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-098 | Brise-armure | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-099 | Pillage | Exclue du solo : interaction entre joueurs | Catalogue uniquement |
| OSS-CARD-100 | Pillage | Exclue du solo : interaction entre joueurs | Catalogue uniquement |
| OSS-CARD-101 | Frénésie | Exclue du solo : renforce uniquement votre adversaire | Catalogue uniquement |
| OSS-CARD-102 | Frénésie | Exclue du solo : renforce uniquement votre adversaire | Catalogue uniquement |
| OSS-CARD-103 | Frénésie | Exclue du solo : renforce uniquement votre adversaire | Catalogue uniquement |
| OSS-CARD-104 | Apaiser | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-105 | Apaiser | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-106 | Apaiser | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-107 | Usurpation | Exclue du solo : interaction entre joueurs | Catalogue uniquement |
| OSS-CARD-108 | Cupidité | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-109 | Cupidité | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-110 | Cupidité | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-111 | Corrosion | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-112 | Corrosion | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-113 | Permutation | Exclue du solo : interaction entre joueurs | Catalogue uniquement |
| OSS-CARD-114 | Permutation | Exclue du solo : interaction entre joueurs | Catalogue uniquement |
| OSS-CARD-115 | Interversion | Exclue du solo : interaction entre joueurs | Catalogue uniquement |
| OSS-CARD-116 | Interversion | Exclue du solo : interaction entre joueurs | Catalogue uniquement |
| OSS-CARD-117 | Paralysie | Exclue du solo : interaction entre joueurs | Catalogue uniquement |
| OSS-CARD-118 | Exécution | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-119 | Exécution | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-120 | Renoncement | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-121 | Trouvaille | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-122 | Trouvaille | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-123 | Providence | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-124 | Vœu | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-125 | Destruction | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-126 | Destruction | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-127 | Contre-sort | Réponse du joueur à une Action du Boss ; réponse automatique du Boss aux Actions du joueur | Carte jouée, annulation et choix de réponse |
| OSS-CARD-128 | Contre-sort | Réponse du joueur à une Action du Boss ; réponse automatique du Boss aux Actions du joueur | Carte jouée, annulation et choix de réponse |
| OSS-CARD-129 | Contre-sort | Réponse du joueur à une Action du Boss ; réponse automatique du Boss aux Actions du joueur | Carte jouée, annulation et choix de réponse |
| OSS-CARD-130 | Contre-sort | Réponse du joueur à une Action du Boss ; réponse automatique du Boss aux Actions du joueur | Carte jouée, annulation et choix de réponse |
| OSS-CARD-131 | Mimétisme | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-132 | Priorité | Exclue du solo : interaction entre joueurs | Catalogue uniquement |
| OSS-CARD-133 | Priorité | Exclue du solo : interaction entre joueurs | Catalogue uniquement |
| OSS-CARD-134 | Priorité | Exclue du solo : interaction entre joueurs | Catalogue uniquement |
| OSS-CARD-135 | Exclusion | Exclue du solo : interaction entre joueurs | Catalogue uniquement |
| OSS-CARD-136 | Exclusion | Exclue du solo : interaction entre joueurs | Catalogue uniquement |
| OSS-CARD-137 | Exclusion | Exclue du solo : interaction entre joueurs | Catalogue uniquement |
| OSS-CARD-138 | Invocation | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-139 | Invocation | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-140 | Incapacité | Exclue du solo : interaction entre joueurs | Catalogue uniquement |
| OSS-CARD-141 | Incapacité | Exclue du solo : interaction entre joueurs | Catalogue uniquement |
| OSS-CARD-142 | Achat forcé | Exclue du solo : interaction entre joueurs | Catalogue uniquement |
| OSS-CARD-143 | Achat forcé | Exclue du solo : interaction entre joueurs | Catalogue uniquement |
| OSS-CARD-144 | Voie du Guerrier | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-145 | Voie du Druide | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-146 | Voie du Chasseur | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-147 | Voie du Mage | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-148 | Voie du Voleur | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-149 | Voie du Nécromancien | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-150 | Éveil | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-151 | Éveil | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-152 | Éveil | Action solo : condition, coût, cible et effet | Animation depuis la main vers la cible |
| OSS-CARD-153 | Réquisition | Exclue du solo : interaction entre joueurs | Catalogue uniquement |
| OSS-CARD-154 | Troc aveugle | Exclue du solo : interaction entre joueurs | Catalogue uniquement |
| OSS-CARD-155 | Larcin | Exclue du solo : interaction entre joueurs | Catalogue uniquement |
| OSS-CARD-156 | Prise de gage | Exclue du solo : interaction entre joueurs | Catalogue uniquement |
| OSS-CARD-157 | Fouisseur | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-158 | Fouisseur | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-159 | Lacéreur | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-160 | Lacéreur | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-161 | Tranchebec | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-162 | Tranchebec | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-163 | Gobeur | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-164 | Raseciel | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-165 | Cuirassé | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-166 | Wyrm | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-167 | Broyeur | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-168 | Reliquaire | Récompenses imprimées + révélation des Butins | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-169 | Reliquaire | Récompenses imprimées + révélation des Butins | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-170 | Rapiécé | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-171 | Rapiécé | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-172 | Nécropode | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-173 | Nécropode | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-174 | Hurlemort | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-175 | Usurpateur | Adaptation solo : Butins standards, aucun vol de main adverse | Pioche et récompense |
| OSS-CARD-176 | Réanimateur | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-177 | Dévoreur | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-178 | Nécroptère | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-179 | Féticheur | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-180 | Féticheur | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-181 | Céramid | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-182 | Céramid | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-183 | Sans-Visage | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-184 | Sans-Visage | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-185 | Cisailleur | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-186 | Tressefer | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-187 | Orant | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-188 | Sauvageonne | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-189 | Exarque | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-190 | Inachevé | Récompenses imprimées + révélation des Butins | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-191 | Inachevé | Récompenses imprimées + révélation des Butins | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-192 | Souriant | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-193 | Souriant | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-194 | Encloué | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-195 | Encloué | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-196 | Fournaise | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-197 | Vitrail | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-198 | Souverain | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-199 | Arachnarque | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-200 | Immaculée | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-201 | Sporule | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-202 | Sporule | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-203 | Fumefange | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-204 | Fumefange | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-205 | Sème-Peste | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-206 | Sème-Peste | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-207 | Fielpeau | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-208 | Aiguemorte | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-209 | Mordefiel | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-210 | Venimeur | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-211 | Cataclysme | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-212 | Rouage | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-213 | Rouage | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-214 | Balancier | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-215 | Balancier | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-216 | Molosse | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-217 | Molosse | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-218 | Golem | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-219 | Vigile | Récompenses imprimées + révélation des Butins | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-220 | Sans-Maître | Récompenses imprimées + révélation des Butins | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-221 | Rafistolé | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-222 | Le Créateur | Début, restriction, choix ou conséquence de combat | Révélation, effet à côté de la carte, dé ou choix |
| OSS-CARD-223 | L’Invaincu | Préparation solo et réactions selon les priorités du Boss | Pioche, préparation, cartes jouées et étape Suivant |
| OSS-CARD-224 | Le Parfait | Préparation solo et réactions selon les priorités du Boss | Pioche, préparation, cartes jouées et étape Suivant |
| OSS-CARD-225 | La Suzeraine | Préparation solo et réactions selon les priorités du Boss | Pioche, préparation, cartes jouées et étape Suivant |
| OSS-CARD-226 | Le Martyr | Préparation solo et réactions selon les priorités du Boss | Pioche, préparation, cartes jouées et étape Suivant |
| OSS-CARD-227 | L’Envers | Préparation solo et réactions selon les priorités du Boss | Pioche, préparation, cartes jouées et étape Suivant |
| OSS-CARD-228 | Zénith | Préparation solo et réactions selon les priorités du Boss | Pioche, préparation, cartes jouées et étape Suivant |
| OSS-CARD-229 | Serment du Silence | Exclue du solo : interaction entre joueurs | Catalogue uniquement |
| OSS-CARD-230 | Serment du Fardeau | Condition + limite de main à six ; non proposé à l’Humain qui possède déjà ce bonus | Carte et bonus célébrés avant de continuer |
| OSS-CARD-231 | Serment de l’Infortune | Condition d’accomplissement + récompense permanente | Carte et bonus célébrés avant de continuer |
| OSS-CARD-232 | Serment de la Seconde Peau | Condition d’accomplissement + récompense permanente | Carte et bonus célébrés avant de continuer |
| OSS-CARD-233 | Serment du Fer Étranger | Condition d’accomplissement + récompense permanente | Carte et bonus célébrés avant de continuer |
| OSS-CARD-234 | Serment du Dépouillement | Condition d’accomplissement + récompense permanente | Carte et bonus célébrés avant de continuer |
| OSS-CARD-235 | Serment du Conquérant | Condition d’accomplissement + récompense permanente | Carte et bonus célébrés avant de continuer |
| OSS-CARD-236 | Serment de l’Éveil refusé | Condition d’accomplissement + récompense permanente | Carte et bonus célébrés avant de continuer |
| OSS-CARD-237 | Serment des Arcanes épuisées | Condition d’accomplissement + récompense permanente | Carte et bonus célébrés avant de continuer |
| OSS-CARD-238 | Serment du Pacte des Cendres | Exclue du solo : interaction entre joueurs | Catalogue uniquement |
| OSS-CARD-239 | Serment de la Dette de sang | Exclue du solo : interaction entre joueurs | Catalogue uniquement |
| OSS-CARD-240 | Serment de la Main invisible | Exclue du solo : interaction entre joueurs | Catalogue uniquement |
