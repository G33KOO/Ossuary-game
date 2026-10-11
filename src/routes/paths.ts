export const paths = {
  home: '/',
  mechanics: '/mecaniques',
  cards: '/cartes',
  card: (cardId: string) => `/cartes/${cardId}`,
  solo: '/solo',
} as const
