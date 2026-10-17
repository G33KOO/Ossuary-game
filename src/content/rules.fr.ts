import type { RulesContent } from './rules.types'

export const rulesFr: RulesContent = {
  facts: [
    { label: 'Joueurs', value: '2 à 6' },
    { label: 'Durée', value: '60 à 90 min' },
    { label: 'Niveau maximal', value: '10' },
    { label: 'Victoire', value: 'Vaincre un Boss' },
  ],
  sections: [
    {
      id: 'objectif',
      title: 'Descendre dans l’Ossuaire',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Sous la dernière Taverne s’étend l’Ossuaire, un dédale où les Serments ont plus de poids que les vies. Vous y descendrez en quête d’armes, de gloire et d’un nom que même la mort ne pourra effacer.',
        },
        {
          kind: 'callout',
          title: 'Votre objectif',
          text: 'Atteignez le niveau maximal (10), rassemblez votre Équipement, puis provoquez un Boss. Accomplir votre Serment n’est pas nécessaire pour l’affronter. Le premier héros qui vainc un Boss gagne immédiatement la partie.',
        },
        {
          kind: 'steps',
          items: [
            { title: 'Équipez', text: 'Préparez votre héros.' },
            { title: 'Choisissez', text: 'Révélez un Monstre ou piochez 1 Butin.' },
            { title: 'Résolvez', text: 'Appliquez les effets, le combat et les récompenses.' },
            {
              title: 'Taverne',
              text: 'À la fin de la ronde : Retours, Marchand, Échanges, puis Esprits.',
            },
          ],
        },
        { kind: 'subtitle', text: 'Matériel' },
        {
          kind: 'table',
          head: ['Famille', 'Contenu'],
          rows: [
            ['Classes / Races', '6 Classes (recto Classe, verso Esprit) ; 6 Races recto-verso'],
            ['Butin', '144 cartes : 24 Armures, 45 Armes, 6 Artefacts, 69 Actions'],
            ['Monstres', '66 cartes : 48 initiaux, 18 puissants'],
            ['Boss / Serments', '6 Boss / 12 Serments'],
            ['Dés de combat', '7 D6 et 7 D8 : 6 paires de Classe et 1 paire de Boss'],
            ['Suivi des niveaux', '6 D10 de Classe ; la face 0 représente le niveau 10'],
            [
              'Option sans D10',
              '6 pistes de niveau 1-10 et 6 marqueurs (cube, clip ou jeton)',
            ],
          ],
        },
        {
          kind: 'callout',
          title: 'Règle d’or',
          text: 'Si le texte d’une carte contredit une règle générale, appliquez la carte.',
        },
        {
          kind: 'paragraph',
          text: 'Sur chaque carte, la Puissance imprimée apparaît en haut à droite, le texte central décrit les effets, et la zone de récompense indique les niveaux et Butins gagnés.',
        },
      ],
    },
    {
      id: 'preparation',
      title: 'Préparer la descente',
      blocks: [
        {
          kind: 'steps',
          items: [
            {
              title: 'Formez les pioches',
              text: 'Mélangez séparément Butin, Boss et Serment. La pioche Butin contient 24 Armures, 45 Armes, 6 Artefacts de Classe et 69 Actions.',
            },
            {
              title: 'Préparez les Monstres',
              text: 'Mélangez les 48 Monstres de Puissance 4 à 11. Gardez les 18 Monstres de Puissance 15 ou plus à côté.',
            },
            {
              title: 'Fixez l’ordre',
              text: 'Chaque joueur lance le D6 de sa Classe. Le meilleur résultat devient premier joueur ; seuls les ex aequo relancent. Les tours se poursuivent dans le sens horaire. Le D6 du Boss est placé devant le premier joueur : il sert de témoin et le premier joueur reste fixe.',
            },
            {
              title: 'Attribuez Classes et Races',
              text: 'Choisissez ensemble entre hasard, recommandé et draft. Seul le draft des Classes et des Races se déroule dans l’ordre inverse du premier tour.',
            },
            {
              title: 'Préparez les héros',
              text: 'Placez Classe et Race face visible. Chaque héros prend le D6 de la couleur de sa Classe, place son D10 sur 1 et pioche 5 Butins secrets. Gardez le D8 assorti à proximité : il ne sert que lorsqu’un effet remplace votre D6.',
            },
            {
              title: 'Préparez le Boss',
              text: 'Réservez au Boss une septième paire D6/D8, de couleur distincte. Son D6 reste devant le premier joueur hors des duels.',
            },
            {
              title: 'Choisissez les Serments',
              text: 'En commençant par le premier joueur, puis dans le sens horaire, piochez 3 Serments et gardez-en 1 face cachée. Remélangez les autres avant le joueur suivant. Le Revenant en garde 2.',
            },
            {
              title: 'Posez les défausses',
              text: 'Elles restent publiques, ordonnées et consultables.',
            },
          ],
        },
        {
          kind: 'paragraph',
          text: 'Chaque Race possède une face masculine et une face féminine, sans différence de règle. Son Passif s’applique tant que la Race est attribuée au héros. Chaque Classe possède un recto Classe et un verso Esprit : retournez-la seulement lorsque le héros devient un Esprit.',
        },
      ],
    },
    {
      id: 'tour',
      title: 'Une ronde et votre tour',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Une ronde correspond au tour de chaque héros vivant, en commençant par le premier joueur puis dans le sens horaire, suivis de la Taverne. Un Esprit n’a plus de tour.',
        },
        {
          kind: 'steps',
          items: [
            { title: 'Équipez', text: 'Vous pouvez manipuler votre Équipement à tout moment.' },
            {
              title: 'Choisissez une aventure',
              text: 'Révélez un Monstre, piochez 1 Butin, ou provoquez un Boss si vous êtes niveau 10.',
            },
            { title: 'Résolvez', text: 'Terminez entièrement l’aventure, ses effets et ses récompenses.' },
            { title: 'Ajustez', text: 'Réorganisez librement l’Équipement.' },
            {
              title: 'Terminez',
              text: 'Gardez au maximum 5 cartes en main, 6 pour l’Humain.',
            },
          ],
        },
        { kind: 'subtitle', text: 'Actions, Actifs et Passifs' },
        {
          kind: 'list',
          items: [
            'Une Action peut être jouée à tout moment, pendant le tour de n’importe quel héros ou pendant la Taverne, dès que son effet est pertinent.',
            'Une chaîne d’Actions se résout de la dernière Action jouée à la première.',
            'Un Actif de Classe n’est pas une Action et ne peut pas être contré.',
            'Un Passif de Race s’applique automatiquement.',
          ],
        },
        { kind: 'subtitle', text: 'Objets et Équipement' },
        {
          kind: 'paragraph',
          text: 'Vous pouvez équiper, déséquiper ou déplacer vos Objets à tout moment, y compris hors de votre tour. En cas de doute sur l’ordre, la table tranche avant de poursuivre.',
        },
        {
          kind: 'table',
          head: ['Zone', 'Capacité', 'Règle'],
          rows: [
            ['Mains', '2', 'Une Arme à deux mains occupe les deux.'],
            ['Armures', '4', '1 Bottes, 1 Gants, 1 Casque, 1 Plastron.'],
            ['Artefact', '1', 'Classe indiquée et niveau maximal requis.'],
          ],
        },
        {
          kind: 'paragraph',
          text: 'Chaque Arme indique, par son icône de Maîtrise, la Classe qui la maîtrise. Toutes les Classes peuvent équiper toutes les Armes, mais seule la Classe indiquée double la Puissance imprimée de cette Arme. Un Artefact améliore l’Actif de sa Classe sans apporter de Puissance.',
        },
      ],
    },
    {
      id: 'combat',
      title: 'Combattre dans l’Ossuaire',
      blocks: [
        {
          kind: 'callout',
          title: 'Puissance totale',
          text: 'Niveau + Puissance de l’Équipement + effets applicables + résultat final du dé de combat actuel.',
        },
        {
          kind: 'steps',
          items: [
            { title: 'Révélez', text: 'Révélez l’adversaire et lisez sa carte.' },
            {
              title: 'Choisissez',
              text: 'Combattez ou tentez de fuir si cela est autorisé.',
            },
            {
              title: 'Préparez le total',
              text: 'Additionnez niveau, Équipement et effets, sans le dé. Aucun compteur de Puissance totale n’est utilisé : calculez-la seulement pour le combat en cours.',
            },
            {
              title: 'Intervenez',
              text: 'Jouez les effets pertinents et ajustez l’Équipement si vous le souhaitez.',
            },
            {
              title: 'Décidez du dé',
              text: 'Si le total sans dé ne suffit pas, acceptez la défaite ou lancez votre dé de combat actuel, D6 ou D8. Si le total suffit déjà, ne lancez pas.',
            },
            { title: 'Comparez', text: 'Une Puissance égale ou supérieure gagne.' },
          ],
        },
        { kind: 'subtitle', text: 'Issues d’un combat' },
        {
          kind: 'table',
          head: ['Issue', 'Résolution'],
          rows: [
            ['Victoire', 'Gagnez niveaux et Butins. Une égalité est une victoire.'],
            ['Défaite', 'Perdez normalement 1 niveau, puis appliquez les pénalités.'],
            ['Fuite', '4+ : fuite sans récompense ni pénalité ; 3 ou moins : défaite.'],
            ['Combat annulé', 'Aucune victoire, défaite, récompense ou pénalité.'],
          ],
        },
        { kind: 'subtitle', text: 'Progression' },
        {
          kind: 'paragraph',
          text: 'Le niveau maximal est 10. La première fois qu’un héros atteint le niveau 5, mélangez les 18 Monstres puissants avec la pioche et la défausse Monstre. Ne le faites qu’une fois.',
        },
      ],
    },
    {
      id: 'taverne',
      title: 'La Taverne',
      blocks: [
        {
          kind: 'paragraph',
          text: 'À la fin de chaque ronde, résolvez dans l’ordre : Retours en attente, Marchand, Échanges, puis passage des Esprits.',
        },
        { kind: 'subtitle', text: 'Retours en attente' },
        {
          kind: 'paragraph',
          text: 'Faites revenir les Esprits dont le Retour a été gagné pendant cette ronde, avant toute autre étape de Taverne.',
        },
        { kind: 'subtitle', text: 'Marchand' },
        {
          kind: 'steps',
          items: [
            {
              title: 'Révélez',
              text: 'Révélez autant de Butins que de joueurs présents au début de la partie.',
            },
            {
              title: 'Déterminez l’ordre',
              text: 'Au début de chaque phase Marchand, calculez l’ordre une seule fois : niveau le plus faible, puis Puissance sans dé la plus faible, puis plus petit D6.',
            },
            {
              title: 'Échangez',
              text: 'À votre place dans l’ordre, remplacez 1 carte visible du Marchand par 1 carte de votre main. La carte donnée devient disponible pour les suivants.',
            },
            {
              title: 'Main vide',
              text: 'Prenez 1 carte gratuitement ; cela compte comme l’unique interaction avec le Marchand.',
            },
            {
              title: 'Conservez le reste',
              text: 'Laissez les cartes restantes du Marchand visibles pendant les Échanges entre héros, jusqu’au passage des Esprits.',
            },
          ],
        },
        { kind: 'subtitle', text: 'Échanges' },
        {
          kind: 'paragraph',
          text: 'Chaque héros vivant peut initier une seule proposition par Taverne, mais répondre à plusieurs. Les cartes sont transmises simultanément face cachée. Une carte gratuite du Marchand n’empêche pas cette phase.',
        },
        { kind: 'subtitle', text: 'Fin de Taverne : les Esprits' },
        {
          kind: 'paragraph',
          text: 'Chaque Esprit peut prendre gratuitement 1 carte encore visible chez le Marchand et l’ajouter à sa réserve, dans l’ordre de mort, du premier mort au dernier. Sans carte disponible, l’Esprit ne prend rien. Défaussez ensuite les cartes restantes du Marchand.',
        },
      ],
    },
    {
      id: 'serments',
      title: 'Les Serments',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Révélez votre Serment dès que son Accomplissement est vérifié et appliquez sa Récompense permanente. Un Serment ne fait jamais gagner directement la partie. Son accomplissement n’est pas nécessaire pour provoquer un Boss : seul le niveau 10 est requis.',
        },
        {
          kind: 'callout',
          title: 'Briser son Serment',
          text: 'À partir du niveau 7, un héros peut briser son Serment une seule fois par partie, au début d’une Taverne avant le calcul de l’ordre du Marchand. Révélez et défaussez ce Serment, perdez 1 niveau, puis piochez 2 Serments : gardez-en 1 face cachée et placez l’autre sous la pioche Serment.',
        },
      ],
    },
    {
      id: 'esprits',
      title: 'La mort et les Esprits',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Un héros perdant contre un Boss défausse toute sa main et tout son Équipement, puis devient un Esprit. Retournez sa Classe sur son verso Esprit : sa Classe et son Passif de Race deviennent inactifs. Il n’a plus de tour et ne peut plus gagner, combattre, s’équiper ni monter de niveau, mais il peut jouer une Action à tout moment si elle est pertinente.',
        },
        {
          kind: 'definitions',
          items: [
            {
              term: 'Réserve spectrale',
              text: 'Prenez les 5 Actions les plus récentes de la défausse Butin. S’il en manque, révélez la pioche jusqu’à en trouver 5, puis remélangez les cartes non retenues.',
            },
            {
              term: 'Possession',
              text: 'Avant de jouer une Action, désignez un héros possédé. L’Esprit choisit toutes les cibles et décisions, puis la possession s’arrête.',
            },
          ],
        },
        {
          kind: 'paragraph',
          text: 'Une Action spectrale résolue ou contrée rejoint la défausse Butin. L’Esprit ne pioche jamais automatiquement : il enrichit sa réserve seulement par les prises autorisées en fin de Taverne.',
        },
        { kind: 'subtitle', text: 'Le Retour' },
        {
          kind: 'paragraph',
          text: 'Lorsqu’un Esprit incarne un Boss et que ce Boss gagne, mettez de côté jusqu’à 2 cartes récupérées dans la main ou l’Équipement du Boss. Le Retour de cet Esprit est alors en attente.',
        },
        {
          kind: 'list',
          items: [
            'Au début de la prochaine Taverne, retournez sa Classe sur son recto. Sa Classe et sa Race redeviennent actives ; placez son niveau sur 8.',
            'Son Serment demeure accompli et révélé, sa Récompense permanente est conservée et un Éveil acquis avant sa mort reste actif.',
            'Les cartes récupérées forment le début de sa nouvelle main ou de son nouvel Équipement. Piochez ensuite assez de Butins pour atteindre 5 cartes entre main et Équipement, puis défaussez la réserve spectrale.',
            'Le héros reprend des tours à la ronde suivante.',
            'Chaque joueur ne peut effectuer ce Retour qu’une seule fois par partie. Après une seconde mort, le joueur reste Esprit jusqu’à la fin.',
          ],
        },
      ],
    },
    {
      id: 'boss',
      title: 'Provoquer un Boss',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Au niveau 10, un héros peut provoquer un Boss à la place de l’aventure de son tour. Il n’y est jamais obligé.',
        },
        {
          kind: 'steps',
          items: [
            { title: 'Révélez', text: 'Révélez le premier Boss.' },
            {
              title: 'Choisissez l’incarnateur',
              text: 'Un Esprit est prioritaire. Plusieurs Esprits se mettent d’accord ou tirent au sort. Sans Esprit, le joueur à gauche incarne.',
            },
            {
              title: 'Quittez le héros',
              text: 'Classe, Race, main, Équipement et effets personnels de l’incarnateur deviennent inactifs.',
            },
            {
              title: 'Armez le Boss',
              text: 'Piochez des Butins jusqu’à former une main de 5 cartes autres que des Artefacts. Placez sous la pioche tout Artefact révélé et piochez une carte de remplacement. L’incarnateur équipe le Boss depuis cette main et garde les autres cartes cachées.',
            },
            {
              title: 'Fermez le duel',
              text: 'Seuls challenger et incarnateur jouent. L’incarnateur utilise uniquement le Boss et sa main.',
            },
            {
              title: 'Combattez',
              text: 'Le challenger utilise son dé actuel. Le Boss utilise toujours la paire de dés qui lui est réservée : son D6, ou son D8 si un effet lui accorde l’Éveil pendant ce duel.',
            },
          ],
        },
        {
          kind: 'callout',
          title: 'Puissance finale du Boss',
          text: 'Puissance imprimée + Puissance de tous ses Équipements + effets applicables + résultat final de son dé de combat actuel.',
        },
        {
          kind: 'table',
          head: ['Issue', 'Conséquence'],
          rows: [
            ['Victoire du challenger', 'Il gagne immédiatement la partie.'],
            [
              'Victoire du Boss',
              'Le challenger devient un Esprit. L’incarnateur récupère jusqu’à 2 cartes encore contrôlées par le Boss.',
            ],
            [
              'Fuite forcée',
              'Le duel s’arrête sans victoire ni défaite ; le challenger reprend à la ronde suivante.',
            ],
          ],
        },
        {
          kind: 'list',
          items: [
            'Aucun jet de fuite naturel n’est autorisé contre un Boss. Un effet de fuite forcée s’applique si son texte le permet.',
            'Une Action déjà jouée et défaussée ne peut pas être récupérée.',
            'Un incarnateur vivant ajoute les cartes récupérées à la main de son héros ; s’il dépasse sa limite, il l’ajuste à la fin de son prochain tour.',
            'Un incarnateur Esprit met les cartes récupérées de côté pour son Retour. Défaussez ensuite toutes les autres cartes contrôlées par le Boss ainsi que la carte Boss.',
            'Si le premier joueur devient un Esprit, passez le D6 du Boss au prochain héros vivant dans le sens horaire : il devient le nouveau premier joueur fixe.',
          ],
        },
      ],
    },
    {
      id: 'variante',
      title: 'Variante de playtest optionnelle',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Les Offrandes et la Profanation ne font pas partie des règles de base. Ajoutez ce module si les mains de Boss paraissent trop faibles ou trop aléatoires, ou si le groupe souhaite préparer le duel final sur plusieurs rondes. Il remplace seulement la préparation normale de la main du Boss.',
        },
        {
          kind: 'definitions',
          items: [
            {
              term: 'Offrandes',
              text: 'Après les Retours en attente et avant le Marchand, révélez la première carte de la pioche Butin et placez-la face visible dans une réserve d’Offrandes, conservée d’une Taverne à l’autre.',
            },
            {
              term: 'Profanation',
              text: 'Une seule par Taverne. À sa place dans l’ordre du Marchand, un héros ayant au moins 2 cartes en main peut placer 2 cartes face visible parmi les Offrandes, puis prendre 1 Offrande présente avant sa Profanation, à la place de son interaction avec le Marchand.',
            },
            {
              term: 'Esprits',
              text: 'En fin de Taverne, un Esprit peut prendre 1 Action visible parmi les Offrandes à la place d’une carte du Marchand, puis la première carte Butin est révélée pour la remplacer.',
            },
            {
              term: 'Préparation du Boss',
              text: 'Retournez et mélangez les Offrandes. L’incarnateur en examine secrètement jusqu’à 8 et choisit 5 cartes autres que des Artefacts pour la main du Boss.',
            },
          ],
        },
      ],
    },
    {
      id: 'reference',
      title: 'Référence rapide et questions fréquentes',
      blocks: [
        {
          kind: 'table',
          head: ['Repère', 'À retenir'],
          rows: [
            ['Ronde', 'Premier joueur fixe, puis sens horaire, puis Taverne. Le D6 du Boss sert de témoin.'],
            ['Tour', 'Une aventure, résolution complète, limite de main.'],
            ['Combat', 'Total sans dé, effets, dé actuel facultatif si nécessaire, comparaison.'],
            ['Taverne', 'Retours, Marchand, Échanges, puis Esprits.'],
            ['Boss', 'Niveau 10 ; 5 Butins non-Artefact ; duel fermé.'],
          ],
        },
        {
          kind: 'definitions',
          items: [
            { term: 'Une égalité gagne-t-elle ?', text: 'Oui, pour le héros.' },
            { term: 'Un Actif peut-il être contré ?', text: 'Non, ce n’est pas une Action.' },
            {
              term: 'Une Action peut-elle être jouée hors de son tour ?',
              text: 'Oui, si son effet est pertinent.',
            },
            { term: 'Peut-on consulter les défausses ?', text: 'Oui, elles sont publiques et ordonnées.' },
            {
              term: 'Le Vesskar peut-il fuir un Boss ?',
              text: 'Non, aucune tentative naturelle n’est autorisée.',
            },
            {
              term: 'Un Esprit peut-il prendre une Armure au Marchand ?',
              text: 'Oui, mais seules les Actions peuvent être jouées depuis sa réserve.',
            },
            {
              term: 'Comment indiquer le niveau 10 sur un D10 ?',
              text: 'La face 0 vaut 10.',
            },
            {
              term: 'Faut-il un marqueur de Retour ?',
              text: 'Non, chaque joueur mémorise son unique Retour.',
            },
          ],
        },
      ],
    },
    {
      id: 'glossaire',
      title: 'Glossaire',
      blocks: [
        {
          kind: 'definitions',
          items: [
            { term: 'Puissance imprimée', text: 'Valeur avant tout modificateur.' },
            {
              term: 'Puissance totale',
              text: 'Niveau + Équipement + effets + dé final ; calculée uniquement pour le combat en cours.',
            },
            { term: 'Équipement', text: 'Une Arme ou une Armure.' },
            { term: 'Objet', text: 'Arme, Armure ou Artefact équipé.' },
            { term: 'Action', text: 'Carte jouable dès que son effet est pertinent.' },
            { term: 'Actif', text: 'Pouvoir imprimé sur une Classe.' },
            { term: 'Passif', text: 'Pouvoir automatique imprimé sur une Race.' },
            {
              term: 'Esprit',
              text: 'Héros mort, sans tour, utilisant une réserve d’Actions et pouvant gagner un unique Retour.',
            },
            {
              term: 'Retour',
              text: 'Réintégration unique d’un Esprit dont le Boss incarné a gagné.',
            },
          ],
        },
      ],
    },
  ],
}
