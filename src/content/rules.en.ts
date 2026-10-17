import type { RulesContent } from './rules.types'

export const rulesEn: RulesContent = {
  facts: [
    { label: 'Players', value: '2 to 6' },
    { label: 'Duration', value: '60 to 90 min' },
    { label: 'Maximum level', value: '10' },
    { label: 'Victory', value: 'Defeat a Boss' },
  ],
  sections: [
    {
      id: 'objectif',
      title: 'Descending into the Ossuary',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Beneath the last Tavern lies the Ossuary, a labyrinth where Oaths weigh more than lives. You descend in search of weapons, glory, and a name that even death cannot erase.',
        },
        {
          kind: 'callout',
          title: 'Your goal',
          text: 'Reach the maximum level (10), gather your Equipment, then challenge a Boss. Fulfilling your Oath is not required to challenge it. The first hero to defeat a Boss immediately wins the game.',
        },
        {
          kind: 'steps',
          items: [
            { title: 'Equip', text: 'Prepare your hero.' },
            { title: 'Choose', text: 'Reveal a Monster or draw 1 Loot.' },
            { title: 'Resolve', text: 'Apply effects, combat, and rewards.' },
            {
              title: 'Tavern',
              text: 'At the end of the round: Returns, Merchant, Trades, then Spirits.',
            },
          ],
        },
        { kind: 'subtitle', text: 'Components' },
        {
          kind: 'table',
          head: ['Family', 'Contents'],
          rows: [
            ['Classes / Races', '6 Classes (Class front, Spirit back); 6 double-sided Races'],
            ['Loot', '144 cards: 24 Armors, 45 Weapons, 6 Artifacts, 69 Actions'],
            ['Monsters', '66 cards: 48 initial, 18 powerful'],
            ['Bosses / Oaths', '6 Bosses / 12 Oaths'],
            ['Combat dice', '7 D6 and 7 D8: 6 Class pairs and 1 Boss pair'],
            ['Level tracking', '6 Class D10s; the 0 face represents level 10'],
            ['No-D10 option', '6 level tracks 1–10 and 6 markers (cube, clip, or token)'],
          ],
        },
        {
          kind: 'callout',
          title: 'Golden rule',
          text: 'If a card’s text contradicts a general rule, follow the card.',
        },
        {
          kind: 'paragraph',
          text: 'On every card, the printed Power appears at the top right, the central text describes the effects, and the reward area shows the levels and Loot gained.',
        },
      ],
    },
    {
      id: 'preparation',
      title: 'Preparing the descent',
      blocks: [
        {
          kind: 'steps',
          items: [
            {
              title: 'Form the decks',
              text: 'Shuffle Loot, Boss, and Oath separately. The Loot deck contains 24 Armors, 45 Weapons, 6 Class Artifacts, and 69 Actions.',
            },
            {
              title: 'Prepare the Monsters',
              text: 'Shuffle the 48 Monsters of Power 4 to 11. Keep the 18 Monsters of Power 15 or more aside.',
            },
            {
              title: 'Set the order',
              text: 'Each player rolls their Class D6. The highest result becomes first player; only ties reroll. Turns then proceed clockwise. The Boss D6 is placed in front of the first player as a marker, and the first player stays fixed.',
            },
            {
              title: 'Assign Classes and Races',
              text: 'Agree together on random, recommended, or draft. Only the Class and Race draft runs in reverse order from the first turn order.',
            },
            {
              title: 'Prepare the heroes',
              text: 'Place Class and Race face up. Each hero takes the D6 matching their Class color, sets their D10 to 1, and draws 5 secret Loot. Keep the matching D8 nearby: it is used only when an effect replaces your D6.',
            },
            {
              title: 'Prepare the Boss',
              text: 'Set aside a seventh D6/D8 pair of a distinct color for the Boss. Its D6 stays in front of the first player outside of duels.',
            },
            {
              title: 'Choose the Oaths',
              text: 'Starting with the first player, then clockwise, draw 3 Oaths and keep 1 face down. Reshuffle the others before the next player. The Revenant keeps 2.',
            },
            {
              title: 'Set the discards',
              text: 'They remain public, ordered, and open to inspection.',
            },
          ],
        },
        {
          kind: 'paragraph',
          text: 'Each Race has a male and a female face with no rules difference. Its Passive applies as long as the Race is assigned to the hero. Each Class has a Class front and a Spirit back: flip it only when the hero becomes a Spirit.',
        },
      ],
    },
    {
      id: 'tour',
      title: 'A round and your turn',
      blocks: [
        {
          kind: 'paragraph',
          text: 'A round consists of the turn of each living hero, starting with the first player and proceeding clockwise, followed by the Tavern. A Spirit no longer takes turns.',
        },
        {
          kind: 'steps',
          items: [
            { title: 'Equip', text: 'You may handle your Equipment at any time.' },
            {
              title: 'Choose an adventure',
              text: 'Reveal a Monster, draw 1 Loot, or challenge a Boss if you are level 10.',
            },
            { title: 'Resolve', text: 'Completely finish the adventure, its effects, and its rewards.' },
            { title: 'Adjust', text: 'Freely rearrange your Equipment.' },
            {
              title: 'End',
              text: 'Keep at most 5 cards in hand, 6 for the Human.',
            },
          ],
        },
        { kind: 'subtitle', text: 'Actions, Actives, and Passives' },
        {
          kind: 'list',
          items: [
            'An Action may be played at any time, during any hero’s turn or during the Tavern, as soon as its effect is relevant.',
            'A chain of Actions resolves from the last Action played to the first.',
            'A Class Active is not an Action and cannot be countered.',
            'A Race Passive applies automatically.',
          ],
        },
        { kind: 'subtitle', text: 'Items and Equipment' },
        {
          kind: 'paragraph',
          text: 'You may equip, unequip, or move your Items at any time, including outside your turn. If the order is unclear, the table decides before continuing.',
        },
        {
          kind: 'table',
          head: ['Slot', 'Capacity', 'Rule'],
          rows: [
            ['Hands', '2', 'A two-handed Weapon occupies both.'],
            ['Armors', '4', '1 Boots, 1 Gloves, 1 Helmet, 1 Chest.'],
            ['Artifact', '1', 'Indicated Class and maximum level required.'],
          ],
        },
        {
          kind: 'paragraph',
          text: 'Each Weapon shows, through its Mastery icon, the Class that masters it. Every Class can equip every Weapon, but only the indicated Class doubles that Weapon’s printed Power. An Artifact improves its Class’s Active without adding Power.',
        },
      ],
    },
    {
      id: 'combat',
      title: 'Fighting in the Ossuary',
      blocks: [
        {
          kind: 'callout',
          title: 'Total Power',
          text: 'Level + Equipment Power + applicable effects + final result of the current combat die.',
        },
        {
          kind: 'steps',
          items: [
            { title: 'Reveal', text: 'Reveal the opponent and read its card.' },
            {
              title: 'Choose',
              text: 'Fight, or attempt to flee if allowed.',
            },
            {
              title: 'Prepare the total',
              text: 'Add level, Equipment, and effects, without the die. No Total Power counter is used: calculate it only for the current combat.',
            },
            {
              title: 'Intervene',
              text: 'Play relevant effects and adjust your Equipment if you wish.',
            },
            {
              title: 'Decide on the die',
              text: 'If the total without the die is not enough, accept defeat or roll your current combat die, D6 or D8. If the total is already enough, do not roll.',
            },
            { title: 'Compare', text: 'Equal or higher Power wins.' },
          ],
        },
        { kind: 'subtitle', text: 'Combat outcomes' },
        {
          kind: 'table',
          head: ['Outcome', 'Resolution'],
          rows: [
            ['Victory', 'Gain levels and Loot. A tie is a victory.'],
            ['Defeat', 'Normally lose 1 level, then apply penalties.'],
            ['Escape', '4+: escape with no reward or penalty; 3 or less: defeat.'],
            ['Canceled combat', 'No victory, defeat, reward, or penalty.'],
          ],
        },
        { kind: 'subtitle', text: 'Progression' },
        {
          kind: 'paragraph',
          text: 'The maximum level is 10. The first time a hero reaches level 5, shuffle the 18 powerful Monsters into the Monster deck and discard pile. Do this only once.',
        },
      ],
    },
    {
      id: 'taverne',
      title: 'The Tavern',
      blocks: [
        {
          kind: 'paragraph',
          text: 'At the end of each round, resolve in order: pending Returns, Merchant, Trades, then the Spirits’ pass.',
        },
        { kind: 'subtitle', text: 'Pending Returns' },
        {
          kind: 'paragraph',
          text: 'Bring back the Spirits whose Return was earned during this round, before any other Tavern step.',
        },
        { kind: 'subtitle', text: 'Merchant' },
        {
          kind: 'steps',
          items: [
            {
              title: 'Reveal',
              text: 'Reveal as many Loot as there were players at the start of the game.',
            },
            {
              title: 'Determine the order',
              text: 'At the start of each Merchant phase, compute the order once: lowest level first, then lowest Power without the die, then lowest D6.',
            },
            {
              title: 'Trade',
              text: 'At your place in the order, replace 1 visible Merchant card with 1 card from your hand. The card you gave becomes available to those after you.',
            },
            {
              title: 'Empty hand',
              text: 'Take 1 card for free; this counts as your only interaction with the Merchant.',
            },
            {
              title: 'Keep the rest',
              text: 'Leave the remaining Merchant cards visible during hero Trades, until the Spirits’ pass.',
            },
          ],
        },
        { kind: 'subtitle', text: 'Trades' },
        {
          kind: 'paragraph',
          text: 'Each living hero may start only one proposal per Tavern, but may answer several. Cards are passed simultaneously face down. A free Merchant card does not prevent this phase.',
        },
        { kind: 'subtitle', text: 'End of Tavern: the Spirits' },
        {
          kind: 'paragraph',
          text: 'Each Spirit may take 1 card still visible at the Merchant for free and add it to their reserve, in order of death from first to last. With no card available, the Spirit takes nothing. Then discard the remaining Merchant cards.',
        },
      ],
    },
    {
      id: 'serments',
      title: 'The Oaths',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Reveal your Oath as soon as its Fulfillment is verified and apply its permanent Reward. An Oath never wins the game directly. Fulfilling it is not required to challenge a Boss: only level 10 is required.',
        },
        {
          kind: 'callout',
          title: 'Breaking your Oath',
          text: 'From level 7, a hero may break their Oath once per game, at the start of a Tavern before the Merchant order is computed. Reveal and discard that Oath, lose 1 level, then draw 2 Oaths: keep 1 face down and place the other under the Oath deck.',
        },
      ],
    },
    {
      id: 'esprits',
      title: 'Death and the Spirits',
      blocks: [
        {
          kind: 'paragraph',
          text: 'A hero who loses to a Boss discards their entire hand and all their Equipment, then becomes a Spirit. Flip their Class to its Spirit back: their Class and Race Passive become inactive. They no longer take turns and can no longer win, fight, equip, or gain levels, but they may play an Action at any time if it is relevant.',
        },
        {
          kind: 'definitions',
          items: [
            {
              term: 'Spectral reserve',
              text: 'Take the 5 most recent Actions from the Loot discard pile. If there are not enough, reveal the deck until you find 5, then reshuffle the cards not kept.',
            },
            {
              term: 'Possession',
              text: 'Before playing an Action, name a possessed hero. The Spirit makes all targeting choices and decisions, then the possession ends.',
            },
          ],
        },
        {
          kind: 'paragraph',
          text: 'A resolved or countered spectral Action goes to the Loot discard pile. The Spirit never draws automatically: their reserve grows only through the takes allowed at the end of the Tavern.',
        },
        { kind: 'subtitle', text: 'The Return' },
        {
          kind: 'paragraph',
          text: 'When a Spirit embodies a Boss and that Boss wins, set aside up to 2 cards recovered from the Boss’s hand or Equipment. That Spirit’s Return is then pending.',
        },
        {
          kind: 'list',
          items: [
            'At the start of the next Tavern, flip their Class back to its front. Their Class and Race become active again; set their level to 8.',
            'Their Oath remains fulfilled and revealed, its permanent Reward is kept, and an Awakening gained before death stays active.',
            'The recovered cards form the start of their new hand or Equipment. Then draw enough Loot to reach 5 cards between hand and Equipment, and discard the spectral reserve.',
            'The hero resumes taking turns the following round.',
            'Each player may make this Return only once per game. After a second death, the player remains a Spirit until the end.',
          ],
        },
      ],
    },
    {
      id: 'boss',
      title: 'Challenging a Boss',
      blocks: [
        {
          kind: 'paragraph',
          text: 'At level 10, a hero may challenge a Boss instead of their turn’s adventure. They are never forced to.',
        },
        {
          kind: 'steps',
          items: [
            { title: 'Reveal', text: 'Reveal the top Boss.' },
            {
              title: 'Choose the embodier',
              text: 'A Spirit has priority. Several Spirits agree or draw lots. With no Spirit, the player to the challenger’s left embodies the Boss.',
            },
            {
              title: 'Leave the hero',
              text: 'The embodier’s Class, Race, hand, Equipment, and personal effects become inactive.',
            },
            {
              title: 'Arm the Boss',
              text: 'Draw Loot until forming a hand of 5 non-Artifact cards. Place any revealed Artifact under the deck and draw a replacement. The embodier equips the Boss from this hand and keeps the other cards hidden.',
            },
            {
              title: 'Close the duel',
              text: 'Only the challenger and the embodier play. The embodier uses only the Boss and its hand.',
            },
            {
              title: 'Fight',
              text: 'The challenger uses their current die. The Boss always uses its reserved dice pair: its D6, or its D8 if an effect grants it Awakening during this duel.',
            },
          ],
        },
        {
          kind: 'callout',
          title: 'Boss final Power',
          text: 'Printed Power + Power of all its Equipment + applicable effects + final result of its current combat die.',
        },
        {
          kind: 'table',
          head: ['Outcome', 'Consequence'],
          rows: [
            ['Challenger wins', 'They immediately win the game.'],
            [
              'Boss wins',
              'The challenger becomes a Spirit. The embodier recovers up to 2 cards still controlled by the Boss.',
            ],
            [
              'Forced escape',
              'The duel ends with no victory or defeat; the challenger resumes the following round.',
            ],
          ],
        },
        {
          kind: 'list',
          items: [
            'No natural escape roll is allowed against a Boss. A forced-escape effect applies if its text allows it.',
            'An Action already played and discarded cannot be recovered.',
            'A living embodier adds the recovered cards to their hero’s hand; if over the limit, they adjust at the end of their next turn.',
            'A Spirit embodier sets the recovered cards aside for their Return. Then discard all other cards controlled by the Boss and the Boss card.',
            'If the first player becomes a Spirit, pass the Boss D6 to the next living hero clockwise: they become the new fixed first player.',
          ],
        },
      ],
    },
    {
      id: 'variante',
      title: 'Optional playtest variant',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Offerings and Desecration are not part of the base rules. Add this module if Boss hands feel too weak or too random, or if your group wants to prepare the final duel over several rounds. It replaces only the normal Boss hand preparation.',
        },
        {
          kind: 'definitions',
          items: [
            {
              term: 'Offerings',
              text: 'After pending Returns and before the Merchant, reveal the top Loot card and place it face up in an Offerings reserve, kept from one Tavern to the next.',
            },
            {
              term: 'Desecration',
              text: 'Once per Tavern. At their place in the Merchant order, a hero with at least 2 cards in hand may place 2 cards face up among the Offerings, then take 1 Offering that was there before their Desecration, instead of their Merchant interaction.',
            },
            {
              term: 'Spirits',
              text: 'At the end of the Tavern, a Spirit may take 1 visible Action among the Offerings instead of a Merchant card, then the top Loot card is revealed to replace it.',
            },
            {
              term: 'Boss preparation',
              text: 'Flip and shuffle the Offerings. The embodier secretly examines up to 8 and chooses 5 non-Artifact cards for the Boss’s hand.',
            },
          ],
        },
      ],
    },
    {
      id: 'reference',
      title: 'Quick reference and FAQ',
      blocks: [
        {
          kind: 'table',
          head: ['Topic', 'Remember'],
          rows: [
            ['Round', 'Fixed first player, then clockwise, then Tavern. The Boss D6 is the marker.'],
            ['Turn', 'One adventure, full resolution, hand limit.'],
            ['Combat', 'Total without die, effects, optional current die if needed, comparison.'],
            ['Tavern', 'Returns, Merchant, Trades, then Spirits.'],
            ['Boss', 'Level 10; 5 non-Artifact Loot; closed duel.'],
          ],
        },
        {
          kind: 'definitions',
          items: [
            { term: 'Does a tie win?', text: 'Yes, for the hero.' },
            { term: 'Can an Active be countered?', text: 'No, it is not an Action.' },
            {
              term: 'Can an Action be played outside your turn?',
              text: 'Yes, if its effect is relevant.',
            },
            { term: 'Can discards be inspected?', text: 'Yes, they are public and ordered.' },
            {
              term: 'Can the Vesskar flee a Boss?',
              text: 'No, no natural attempt is allowed.',
            },
            {
              term: 'Can a Spirit take an Armor from the Merchant?',
              text: 'Yes, but only Actions can be played from their reserve.',
            },
            {
              term: 'How do you show level 10 on a D10?',
              text: 'The 0 face counts as 10.',
            },
            {
              term: 'Is a Return marker needed?',
              text: 'No, each player remembers their single Return.',
            },
          ],
        },
      ],
    },
    {
      id: 'glossaire',
      title: 'Glossary',
      blocks: [
        {
          kind: 'definitions',
          items: [
            { term: 'Printed Power', text: 'Value before any modifier.' },
            {
              term: 'Total Power',
              text: 'Level + Equipment + effects + final die; calculated only for the current combat.',
            },
            { term: 'Equipment', text: 'A Weapon or an Armor.' },
            { term: 'Item', text: 'An equipped Weapon, Armor, or Artifact.' },
            { term: 'Action', text: 'A card playable as soon as its effect is relevant.' },
            { term: 'Active', text: 'Power printed on a Class.' },
            { term: 'Passive', text: 'Automatic power printed on a Race.' },
            {
              term: 'Spirit',
              text: 'A dead hero with no turn, using a reserve of Actions and able to earn a single Return.',
            },
            {
              term: 'Return',
              text: 'The one-time reinstatement of a Spirit whose embodied Boss won.',
            },
          ],
        },
      ],
    },
  ],
}
