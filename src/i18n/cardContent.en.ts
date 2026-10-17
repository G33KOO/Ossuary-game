export type CardTranslation = {
  name: string
  text?: string
}

export const cardContentEn: Record<string, CardTranslation> = {
  'Spectre Guerrier': { name: 'Warrior Spectre', text: 'Class Spirit card. Flip the card to read its rules.' },
  'Spectre Druide': { name: 'Druid Spectre', text: 'Class Spirit card. Flip the card to read its rules.' },
  'Spectre Chasseur': { name: 'Hunter Spectre', text: 'Class Spirit card. Flip the card to read its rules.' },
  'Spectre Mage': { name: 'Mage Spectre', text: 'Class Spirit card. Flip the card to read its rules.' },
  'Spectre Voleur': { name: 'Rogue Spectre', text: 'Class Spirit card. Flip the card to read its rules.' },
  'Spectre Nécromancien': { name: 'Necromancer Spectre', text: 'Class Spirit card. Flip the card to read its rules.' },
  'Tour et équipement': { name: 'Turns and Equipment', text: 'Reference card. Read both sides for the game rules.' },
  'Combat et Actions': { name: 'Combat and Actions', text: 'Reference card. Read both sides for the game rules.' },
  'Taverne et Boss': { name: 'Tavern and Bosses', text: 'Reference card. Read both sides for the game rules.' },
  Guerrier: {
    name: 'Warrior',
    text: 'Weapon Toss — During a combat, you may discard 1 Weapon from your hand to add its printed Power to your total Power for that combat.',
  },
  Druide: {
    name: 'Druid',
    text: 'Nature’s Guard — During a combat, you may discard 1 Armor card from your hand to double the printed Power of one of your equipped Armors until the end of combat. Each Armor can be doubled only once per combat.',
  },
  Chasseur: {
    name: 'Hunter',
    text: 'Tracking — Once during your turn, before revealing a Monster or Boss, discard 1 card: reveal the top 3 cards of the corresponding deck, choose your opponent, then shuffle the other 2 back into that deck.',
  },
  Mage: {
    name: 'Mage',
    text: 'Rewind — After a die roll, you may discard 1 card to reroll it. During your turn, choose which of the two results to keep; outside your turn, the new result must be kept.',
  },
  Voleur: {
    name: 'Rogue',
    text: 'Fence — During your turn, you may discard 2 cards from your hand to exchange one of your Equipment pieces for a piece in the same slot belonging to another player.',
  },
  Nécromancien: {
    name: 'Necromancer',
    text: 'Reanimation — Once per combat, you may discard 3 cards from your hand to choose one of the 3 most recent Monsters in the Monster discard pile. Add half its printed Power, rounded down, to your total Power for this combat.',
  },
  Nain: { name: 'Dwarf', text: 'Prospector’s Instinct — When you choose to draw 1 Loot as your turn’s adventure, draw 1 additional Loot.' },
  Humain: { name: 'Human', text: 'Adaptability — You may keep 1 additional card in your hand at the end of your turn.' },
  Elfe: { name: 'Elf', text: 'Ancestral Grace — Add 1 to the result of each of your die rolls.' },
  Orc: { name: 'Orc', text: 'Brutality — Each of your equipped Weapons gets +1 Power.' },
  Revenant: { name: 'Revenant', text: 'Beyond-the-Grave Will — When choosing Oaths, keep 2 instead of 1.' },
  Vesskar: { name: 'Vesskar', text: 'Cold Blood — Your escape attempts automatically succeed.' },

  'Plastron Écaillefer': { name: 'Ironscale Cuirass' },
  'Plastron Côtelé': { name: 'Ribbed Cuirass' },
  'Plastron Fauve': { name: 'Feral Cuirass' },
  'Plastron Scarabée': { name: 'Scarab Cuirass' },
  'Plastron du Lion': { name: 'Lion Cuirass' },
  'Plastron Cœur-de-Dragon': { name: 'Dragonheart Cuirass' },
  'Bottes Longue-Piste': { name: 'Longtrail Boots' },
  'Bottes Fer-Semelle': { name: 'Ironsoles Boots' },
  'Bottes Nomades': { name: 'Nomad Boots' },
  'Bottes Mille-Lames': { name: 'Thousandblades Boots' },
  'Bottes Solaires': { name: 'Sunforged Boots' },
  'Bottes Ailées': { name: 'Winged Boots' },
  'Gants Nervurés': { name: 'Veined Gloves' },
  'Gants Brise-Phalanges': { name: 'Knucklebreaker Gloves' },
  'Mitaines Tressecuir': { name: 'Braided Leather Mitts' },
  'Gantelets Carapace': { name: 'Shell Gauntlets' },
  'Gantelets Clairargent': { name: 'Brightsilver Gauntlets' },
  'Gantelets Forge-Royale': { name: 'Royal Forge Gauntlets' },
  'Casque Bois-Cornu': { name: 'Hornwood Helm' },
  'Heaume Bec-de-Fer': { name: 'Ironbeak Helm' },
  'Masque Voilé': { name: 'Veiled Mask' },
  'Coiffe Loup-Sorcier': { name: 'Wolf-Witch Cowl' },
  'Heaume Couronnefer': { name: 'Crownsteel Helm' },
  'Heaume Chimérique': { name: 'Chimeric Helm' },

  'Lame-Rempart à deux mains': { name: 'Two-Handed Bastion Blade' },
  'Brise-Fer à deux mains': { name: 'Two-Handed Ironbreaker' },
  'Échine-Noire à deux mains': { name: 'Two-Handed Blackspine' },
  'Épée Demi-Lune': { name: 'Half-Moon Sword' },
  'Épée Déchiqueteuse': { name: 'Ripper Sword' },
  'Épée Fer du Conquérant': {
    name: 'Conqueror’s Iron Sword',
    text: 'Warrior Mastery ×2',
  },
  'Dague de l’Ombre': { name: 'Shadow Dagger' },
  'Dague Veuve': { name: 'Widow Dagger' },
  'Dague Éclat Sauvage': { name: 'Wildshard Dagger' },
  'Arbalète Mordante': { name: 'Biting Crossbow' },
  'Arbalète Guillotine': { name: 'Guillotine Crossbow' },
  'Arbalète Triplette': {
    name: 'Triple Crossbow',
    text: 'Rogue Mastery ×2',
  },
  'Hache Bois-de-Sang': { name: 'Bloodwood Axe' },
  'Hache Brise-Mâchoire': { name: 'Jawbreaker Axe' },
  'Hache Éclate-Roc': { name: 'Rocksplitter Axe' },
  'Arc Thoracique': { name: 'Ribcage Bow' },
  'Arc Épineux': { name: 'Thornbow' },
  'Arc Ramure': {
    name: 'Antlerbow',
    text: 'Hunter Mastery ×2',
  },
  'Baguette Entrelacs': { name: 'Knotwork Wand' },
  'Orbe d’Ambre': { name: 'Amber Orb' },
  'Masse Écailleuse': { name: 'Scalemail Mace' },
  'Masse Fongique à deux mains': { name: 'Two-Handed Fungal Mace' },
  'Masse Racinaire à deux mains': { name: 'Two-Handed Root Mace' },
  'Masse Totémique à deux mains': {
    name: 'Two-Handed Totemic Mace',
    text: 'Druid Mastery ×2',
  },
  'Baguette Runique': { name: 'Runic Wand' },
  'Orbe Astral': { name: 'Astral Orb' },
  'Épée Fractale': { name: 'Fractal Sword' },
  'Bâton du Permafrost à deux mains': { name: 'Two-Handed Permafrost Staff' },
  'Bâton des Heures à deux mains': { name: 'Two-Handed Staff of Hours' },
  'Bâton du Nexus à deux mains': {
    name: 'Two-Handed Nexus Staff',
    text: 'Mage Mastery ×2',
  },
  'Baguette Ossuaire': { name: 'Ossuary Wand' },
  'Orbe des Âmes': { name: 'Orb of Souls' },
  'Faucille Fossoyeuse': { name: 'Gravedigger Sickle' },
  'Faux du Trépas à deux mains': { name: 'Two-Handed Reaper Scythe' },
  'Faux du Requiem à deux mains': { name: 'Two-Handed Requiem Scythe' },
  'Faux du Voile à deux mains': {
    name: 'Two-Handed Veil Scythe',
    text: 'Necromancer Mastery ×2',
  },
  'Masse Mille-Clous': {
    name: 'Thousandnail Mace',
    text: 'Open Hand — While Thousandnail Mace is your only equipped Weapon, its printed Power is doubled. Armors and your Class Artifact do not affect this condition.',
  },
  'Masse du Bastion': {
    name: 'Bastion Mace',
    text: 'Useful Scrap — If this equipped Weapon leaves your Equipment because of a Monster or another player, immediately draw 1 Loot. No effect if you remove it voluntarily.',
  },
  'Masse Nautile': {
    name: 'Nautilus Mace',
    text: 'Bonebreaker — This Weapon gets +1 against Monsters with Power 4, 6, or 7.',
  },
  'Hache Brise-Enclume à deux mains': {
    name: 'Two-Handed Anvilbreaker Axe',
    text: 'Boss Slayer — This Weapon gets +2 during a Boss combat.',
  },
  'Hache Léviathan à deux mains': {
    name: 'Two-Handed Leviathan Axe',
    text: 'Colossus Breaker — This Weapon gets +1 against Monsters with Power 15+.',
  },
  'Hache Fétiche à deux mains': {
    name: 'Two-Handed Fetish Axe',
    text: 'Grim Harvest — After defeating a Monster, you may discard this equipped Weapon to gain 2 additional Loot.',
  },
  'Hache Clairfeuille': {
    name: 'Brightleaf Axe',
    text: 'Untouchable — Another player cannot destroy this Weapon or force you to exchange it. You may remove, discard, sacrifice, or exchange it freely on your own.',
  },
  'Dague Lunefeuille': {
    name: 'Moonleaf Dagger',
    text: 'Ill Omen — You get +1 to all your escape rolls.',
  },
  'Baguette Brasier': {
    name: 'Blaze Wand',
    text: 'Final Spark — After your combat roll, you may discard this equipped Weapon to reroll the die. You must keep the new result.',
  },

  'Étendard des Mille Batailles': {
    name: 'Banner of a Thousand Battles',
    text: 'Unique Artifact — When you use Weapon Toss, add the discarded Weapon’s printed Power + 1 to your total Power.',
  },
  'Graine de l’Arbre-Vie': {
    name: 'Seed of the Tree of Life',
    text: 'Unique Artifact — When you use Nature’s Guard, you may also double the printed Power of a second equipped Armor for this combat.',
  },
  'Collier des Grandes Chasses': {
    name: 'Amulet of the Great Hunts',
    text: 'Unique Artifact — When you use Tracking, reveal the top 5 cards of the corresponding deck, choose your opponent, then shuffle the other 4 back into that deck.',
  },
  'Astrolabe des Arcanes': {
    name: 'Arcane Astrolabe',
    text: 'Unique Artifact — Once per turn, when you use Rewind on your own combat roll, add the results of both rolls instead of keeping only one.',
  },
  'L’Ombre Dérobée': {
    name: 'The Stolen Shadow',
    text: 'Unique Artifact — When you use Fence, discard 1 card instead of 2.',
  },
  'Codex des Astres Funèbres': {
    name: 'Codex of Funereal Stars',
    text: 'Unique Artifact — When you use Reanimation, choose one of the 5 most recent Monsters in the Monster discard pile instead of 3.',
  },

  Peur: { name: 'Fear', text: 'The targeted player immediately flees their combat.' },
  Chance: { name: 'Luck', text: 'Add +2 to the targeted die result.' },
  Malchance: { name: 'Misfortune', text: 'Reduce the targeted die result by 2.' },
  Faiblesse: { name: 'Weakness', text: 'The targeted player loses 2 Power until the end of the turn.' },
  Force: { name: 'Strength', text: 'The targeted player gets +2 Power until the end of the turn.' },
  Dépossession: { name: 'Disarm', text: 'Ignore the targeted player’s Weapon Power until the end of the turn.' },
  'Brise-armure': { name: 'Armor Break', text: 'Ignore the targeted player’s Armor Power until the end of the turn.' },
  Pillage: { name: 'Plunder', text: 'This turn, gain the targeted player’s Loot instead of your own.' },
  Frénésie: { name: 'Frenzy', text: 'The targeted Monster gets +2 Power until the end of the turn.' },
  Apaiser: { name: 'Soothe', text: 'The targeted Monster loses 2 Power until the end of the turn.' },
  Usurpation: { name: 'Usurpation', text: 'Gain the next Level the targeted player would gain this turn.' },
  Cupidité: { name: 'Greed', text: 'Roll your die. On 4+, double the Loot gained in this combat.' },
  Corrosion: { name: 'Corrosion', text: 'Destroy 1 equipped Weapon.' },
  Permutation: { name: 'Swap', text: 'Choose 2 players: each exchanges 1 equipped Weapon of your choice.' },
  Interversion: { name: 'Armor Swap', text: 'Choose 2 players: each exchanges 1 equipped Armor of your choice.' },
  Paralysie: { name: 'Paralysis', text: 'The targeted player cannot roll a die until the end of their turn.' },
  Exécution: { name: 'Execution', text: 'Roll your die: on 6+, immediately win the combat. Cannot be played against a Boss.' },
  Renoncement: {
    name: 'Renunciation',
    text: 'Discard your entire hand to gain 1 Level. You may play Renunciation even if it is the only card in your hand.',
  },
  Trouvaille: { name: 'Find', text: 'Draw 2 Loot.' },
  Providence: { name: 'Providence', text: 'Draw 3 Loot.' },
  Vœu: {
    name: 'Vow',
    text: 'Search the Loot deck for an Action of your choice and add it to your hand. Then shuffle the Loot deck.',
  },
  Destruction: { name: 'Destruction', text: 'Destroy the targeted Equipment.' },
  'Contre-sort': { name: 'Counterspell', text: 'Cancel the targeted Action.' },
  Mimétisme: {
    name: 'Mimicry',
    text: 'Replace your Class Ability with that of another Class of your choice until the end of the turn. A Boss simply gains the chosen Ability.',
  },
  Priorité: { name: 'Priority', text: 'During the Tavern phase, choose first from the Merchant.' },
  Exclusion: { name: 'Exclusion', text: 'The targeted player does not take part in the next Tavern phase.' },
  Invocation: {
    name: 'Summoning',
    text: 'Reveal a new Monster and add it to the targeted combat. Add their Power and rewards together.',
  },
  Incapacité: { name: 'Incapacity', text: 'The targeted player cannot use their Class Ability this turn.' },
  'Achat forcé': {
    name: 'Forced Purchase',
    text: 'During the Tavern phase, choose 1 face-up Loot at the Merchant. The targeted player exchanges it for 1 card from their hand.',
  },
  'Voie du Guerrier': {
    name: 'Path of the Warrior',
    text: 'Until the end of the turn, your Class Ability becomes the Warrior’s. A Boss simply gains this Ability.',
  },
  'Voie du Druide': {
    name: 'Path of the Druid',
    text: 'Until the end of the turn, your Class Ability becomes the Druid’s. A Boss simply gains this Ability.',
  },
  'Voie du Chasseur': {
    name: 'Path of the Hunter',
    text: 'Until the end of the turn, your Class Ability becomes the Hunter’s. A Boss simply gains this Ability.',
  },
  'Voie du Mage': {
    name: 'Path of the Mage',
    text: 'Until the end of the turn, your Class Ability becomes the Mage’s. A Boss simply gains this Ability.',
  },
  'Voie du Voleur': {
    name: 'Path of the Rogue',
    text: 'Until the end of the turn, your Class Ability becomes the Rogue’s. A Boss simply gains this Ability.',
  },
  'Voie du Nécromancien': {
    name: 'Path of the Necromancer',
    text: 'Until the end of the turn, your Class Ability becomes the Necromancer’s. A Boss simply gains this Ability.',
  },
  Éveil: {
    name: 'Awakening',
    text: 'If you are Level 5+, permanently replace your D6 with a D8. A Boss activates it regardless of Level. This Action cannot be countered.',
  },
  Réquisition: {
    name: 'Requisition',
    text: 'During the player-trading phase of the Tavern, name a card in a player’s hand and offer them 1 of your cards. If they have the named card, the exchange is mandatory.',
  },
  'Troc aveugle': {
    name: 'Blind Trade',
    text: 'During the player-trading phase of the Tavern, randomly exchange 1 card from your hand for 1 card from another player’s hand.',
  },
  Larcin: {
    name: 'Theft',
    text: 'During the player-trading phase of the Tavern, target a player. They reveal their hand. Choose 1 card from it and add it to your hand.',
  },
  'Prise de gage': {
    name: 'Hostage Exchange',
    text: 'During the player-trading phase of the Tavern, force an exchange. Choose the card you give. The targeted player chooses the card they give you.',
  },

  Fouisseur: {
    name: 'Burrower',
    text: 'Bestial Tunneling — During this combat, ignore the Power of your most powerful Equipment. In case of a tie, you choose.',
  },
  Lacéreur: {
    name: 'Ripper',
    text: 'Stolen Scratch — At the start of combat, roll your die and add its result to Ripper’s Power.',
  },
  Tranchebec: {
    name: 'Slashbeak',
    text: 'Rending Charge — Roll a D6 for Slashbeak. On 4+, it gets +2 Power for this combat.',
  },
  Gobeur: { name: 'Guzzler', text: 'Engulf — Ignore 2 of your Equipment pieces of your choice.' },
  Raseciel: {
    name: 'Skyshear',
    text: 'Skyhook — You cannot flee this combat, even with Fear.',
  },
  Cuirassé: {
    name: 'Ironclad',
    text: 'Interception Carapace — The first Action played against this Monster is canceled.',
  },
  Wyrm: {
    name: 'Wyrm',
    text: 'Blind Omen — Whenever you roll your die during this combat, roll it twice and keep the lower result.',
  },
  Broyeur: {
    name: 'Crusher',
    text: 'Second Assault — You must defeat Crusher twice in a row to win the combat.',
  },
  Reliquaire: {
    name: 'Reliquary',
    text: 'Charnel House — After your victory, reveal the 5 Loot you gained before adding them to your hand.',
  },
  Rapiécé: {
    name: 'Patchwork',
    text: 'Bitter Feast — If you lose, you do not lose a Level.',
  },
  Nécropode: {
    name: 'Necropod',
    text: 'Exposed Heart — If you lose, draw 1 Loot.',
  },
  Hurlemort: {
    name: 'Deathhowl',
    text: 'Empty Cry — Your Level adds no Power during this combat.',
  },
  Usurpateur: {
    name: 'Usurper',
    text: 'Pillage — If you win, choose: draw your Loot or randomly draw the same number of cards from a targeted opponent’s hand.',
  },
  Réanimateur: {
    name: 'Reanimator',
    text: 'Grim Legacy — If you lose, the next Monster you fight loses 3 Power. Keep this card face up, then discard it after the affected combat.',
  },
  Dévoreur: {
    name: 'Devourer',
    text: 'Soul Devouring — You cannot use your Class Ability during this combat.',
  },
  Nécroptère: {
    name: 'Necropter',
    text: 'Shared Blight — After this combat, all players lose 1 Level. If you lose, do not lose an additional Level.',
  },
  Féticheur: {
    name: 'Hexer',
    text: 'Ransom — Before your combat roll, discard 1 card or forfeit the Loot shown on this card.',
  },
  Céramid: {
    name: 'Ceramid',
    text: 'Ceramide Alert — If you win, immediately reveal and fight a new Monster.',
  },
  'Sans-Visage': {
    name: 'Faceless',
    text: 'Stolen Faces — If you win, roll your die. On 5+, draw 1 Loot and roll again. Repeat while you roll 5+.',
  },
  Cisailleur: {
    name: 'Shearer',
    text: 'Precise Strike — If your Power equals Shearer’s, draw 1 additional Loot.',
  },
  Tressefer: {
    name: 'Ironbraid',
    text: 'Duelist’s Honor — In case of a tie, discard this Monster. The combat ends with neither victory nor defeat.',
  },
  Orant: {
    name: 'Supplicant',
    text: 'Protective Grace — If you lose, you do not lose a Level.',
  },
  Sauvageonne: {
    name: 'Wildling',
    text: 'Tribute Demanded — Before your combat roll, discard 1 card or subtract 3 from your total Power.',
  },
  Exarque: {
    name: 'Exarch',
    text: 'Overwhelming Stature — Exarch gets +2 Power. In case of a tie, you lose the combat.',
  },
  Inachevé: { name: 'Unfinished', text: 'Minor Pact — Gain 2 Levels, but no Loot.' },
  Souriant: {
    name: 'The Smiling One',
    text: 'Double Game — Ignore your Level and the Power of your Equipment. Roll your die twice and add the results.',
  },
  Encloué: {
    name: 'Nailed One',
    text: 'Inhibition Spikes — No Luck or Strength card can be played during this combat.',
  },
  Fournaise: {
    name: 'Furnace',
    text: 'Trial by Furnace — Reveal the next 2 Monsters. Choose which of the 3 to fight, then place the other 2 under the deck in random order.',
  },
  Vitrail: {
    name: 'Stained Glass',
    text: 'Corrupted Favor — If you win, keep this card. During your next visit to the Merchant, you may make up to 2 exchanges, then discard it.',
  },
  Souverain: {
    name: 'Sovereign',
    text: 'Princely Wrath — If you lose, discard 1 card in addition to losing 1 Level.',
  },
  Arachnarque: {
    name: 'Arachnarch',
    text: 'Lord’s Punishment — If you lose, destroy 1 of your equipped Armors.',
  },
  Immaculée: {
    name: 'Immaculate',
    text: 'Immaculate Grace — If you win the combat with a 6 on your combat die, double the Loot gained.',
  },
  Sporule: {
    name: 'Sporule',
    text: 'Creeping Chaos — If you win, choose your reward: 1 Level and 1 Loot; 2 Levels; or 2 Loot.',
  },
  Fumefange: {
    name: 'Miasmafang',
    text: 'Foul Air — To fight Miasmafang, destroy 1 equipped Weapon or Armor. Otherwise, flee.',
  },
  'Sème-Peste': {
    name: 'Plague Sower',
    text: 'Lingering Stench — If this Monster is not defeated, leave it in front of the deck. The next player must fight it instead of taking their action, then discard it after combat.',
  },
  Fielpeau: {
    name: 'Bilehide',
    text: 'Fever — After your first combat roll, discard 1 card to keep the result. Otherwise, reroll your die and keep the new result.',
  },
  Aiguemorte: {
    name: 'Deadwater',
    text: 'Decomposition — Before your combat roll, choose: ignore the Power of your Armors, or destroy 1 equipped piece of Equipment after combat.',
  },
  Mordefiel: {
    name: 'Bilefang',
    text: 'Suffocation — No Action can be played during this combat.',
  },
  Venimeur: {
    name: 'Venomous One',
    text: 'Persistent Affliction — After this combat, discard 1 card unless you fled.',
  },
  Cataclysme: {
    name: 'Cataclysm',
    text: 'Common Ruin — All players discard 1 card from their hand.',
  },
  Rouage: {
    name: 'Gearwork',
    text: 'Mechanical Mimicry — At the start of combat, Gearwork adds the Power of your most powerful Equipment to its own.',
  },
  Balancier: {
    name: 'Counterweight',
    text: 'Rigidity — Subtract 2 from the total Power of your Armors, to a minimum of 0.',
  },
  Molosse: {
    name: 'Mastiff',
    text: 'Reactive Plating — The first time an Action is played during this combat, Mastiff gets +2 Power.',
  },
  Golem: {
    name: 'Golem',
    text: 'Inert Core — Cards cannot modify Golem’s Power.',
  },
  Vigile: {
    name: 'Warden',
    text: 'Loot Under Watch — If you win, reveal the Loot gained to all players.',
  },
  'Sans-Maître': {
    name: 'Masterless',
    text: 'Costly Freedom — If you win, gain 3 Loot but lose 1 Level.',
  },
  Rafistolé: {
    name: 'Repaired',
    text: 'Mechanical Overload — At the start of combat, roll 1 D6: Repaired loses 2 Power on 1–2, is unchanged on 3–4, and gets +2 on 5–6.',
  },
  'Le Créateur': {
    name: 'The Creator',
    text: 'Adaptive Prototype — The Creator gets +3 Power. Before your combat roll, you may discard 1 card to cancel this bonus.',
  },
  'L’Invaincu': {
    name: 'The Unvanquished',
    text: 'Implacable Weight — During preparation, place up to 2 cards from your hand under The Unvanquished. It gets +2 Power per card. Discard them after the duel.',
  },
  'Le Parfait': {
    name: 'The Perfect',
    text: 'Perfect Memory — During preparation, look at the 3 most recent Actions in the Loot discard pile and add 1 to the Boss’s hand.',
  },
  'La Suzeraine': {
    name: 'The Overlord',
    text: 'Decree of Ruin — At the start of the duel, choose: The Overlord gets +2 Power, or the first Action played by the challenger is canceled. Awakening cannot be canceled.',
  },
  'Le Martyr': {
    name: 'The Martyr',
    text: 'Profane Bargain — During preparation, exchange up to 2 chosen cards from the Boss’s hand for the same number of random cards from the challenger’s hand. The Martyr gets +1 Power for each card the Boss gave in this exchange.',
  },
  'L’Envers': {
    name: 'The Reverse',
    text: 'Abyssal Corruption — During preparation, choose 1 of the challenger’s Armors. They may discard 1 card to resist. Otherwise, its Power is added to The Reverse instead of the challenger.',
  },
  Zénith: {
    name: 'Zenith',
    text: 'Rise of the Fallen — During preparation, you may discard 3 cards. If you do, choose the Monster with the lowest Power among the 5 most recent Monsters in the discard pile, then add its Power to Zenith’s for this combat.',
  },
  'Serment du Silence': {
    name: 'Oath of Silence',
    text: 'Fulfillment — Counter an Action that would make you lose a combat, then win it. Reward — Your Actions can no longer be targeted by Counterspell.',
  },
  'Serment du Fardeau': {
    name: 'Oath of Burden',
    text: 'Fulfillment — At the end of your turn, discard at least 2 cards to meet your hand limit. Reward — Your hand limit permanently becomes 6 cards.',
  },
  'Serment de l’Infortune': {
    name: 'Oath of Misfortune',
    text: 'Fulfillment — Defeat a Monster with Power 9+ while rolling a 1 on your combat die. Reward — Whenever your combat die shows 1, you may reroll it once and keep the new result.',
  },
  'Serment de la Seconde Peau': {
    name: 'Oath of the Second Skin',
    text: 'Fulfillment — Defeat a Monster with Power 15+ while wearing an Armor in each of the 4 slots and having at least 8 total Armor Power. Reward — Choose an Armor slot: you may now equip 2 Armors in it.',
  },
  'Serment du Fer Étranger': {
    name: 'Oath of Foreign Iron',
    text: 'Fulfillment — Defeat a Monster with Power 15+ without any of your equipped Weapons being mastered by your Class. Reward — You master all Weapons.',
  },
  'Serment du Dépouillement': {
    name: 'Oath of Stripping',
    text: 'Fulfillment — Win a combat with a Power margin of exactly 0. Reward — Permanently gain +2 Power.',
  },
  'Serment du Conquérant': {
    name: 'Oath of the Conqueror',
    text: 'Fulfillment — Defeat a Monster with Power 18+ without rolling your combat die, playing an Action, or using your Class Ability. Reward — Permanently add +1 to the result of each of your die rolls.',
  },
  'Serment de l’Éveil refusé': {
    name: 'Oath of Refusing Awakening',
    text: 'Fulfillment — Defeat a Monster with Power 15+ using your D6 without having received Awakening. Reward — Permanently replace your D6 with a D8. If you receive Awakening before fulfilling this Oath, discard it and draw a new random Oath.',
  },
  'Serment des Arcanes épuisées': {
    name: 'Oath of Spent Arcana',
    text: 'Fulfillment — During one of your combats, play and resolve 2 Actions from your hand, then win. Reward — During preparation for your next Boss, look at the 5 most recent Actions in the Loot discard pile and add 1 to your hand.',
  },
  'Serment du Pacte des Cendres': {
    name: 'Oath of the Ashen Pact',
    text: 'Fulfillment — During the same Tavern phase, trade with the Merchant and complete a trade with another player, whether offered or accepted. Reward — At the Merchant, you may exchange up to 2 cards. If your hand is empty, take up to 2 cards for free.',
  },
  'Serment de la Dette de sang': {
    name: 'Oath of Blood Debt',
    text: 'Fulfillment — During another player’s combat against a Monster with Power 11+, play and resolve 1 Action that helps them. This Action must turn a loss into a win. Reward — Whenever your Actions let another player win a combat they would have lost, gain 1 Level.',
  },
  'Serment de la Main invisible': {
    name: 'Oath of the Invisible Hand',
    text: 'Fulfillment — During another player’s combat against a Monster with Power 11+, play and resolve 1 Action that hinders them. This Action must cause their defeat or escape. Reward — If at least 1 Action in your hand hinders another player and they lose or flee, gain the Loot from the engaged Monsters.',
  },
}

export const cardRequirementEn: Record<string, string> = {
  'Aucune maîtrise': 'No Mastery required',
  'Maîtrise Guerrier ×2': 'Warrior Mastery ×2',
  'Maîtrise Voleur ×2': 'Rogue Mastery ×2',
  'Maîtrise Chasseur ×2': 'Hunter Mastery ×2',
  'Maîtrise Druide ×2': 'Druid Mastery ×2',
  'Maîtrise Mage ×2': 'Mage Mastery ×2',
  'Maîtrise Nécromancien ×2': 'Necromancer Mastery ×2',
  'Classe : Guerrier · Niveau 10+ requis': 'Class: Warrior · Level 10+ required',
  'Classe : Druide · Niveau 10+ requis': 'Class: Druid · Level 10+ required',
  'Classe : Chasseur · Niveau 10+ requis': 'Class: Hunter · Level 10+ required',
  'Classe : Mage · Niveau 10+ requis': 'Class: Mage · Level 10+ required',
  'Classe : Voleur · Niveau 10+ requis': 'Class: Rogue · Level 10+ required',
  'Classe : Nécromancien · Niveau 10+ requis': 'Class: Necromancer · Level 10+ required',
}
