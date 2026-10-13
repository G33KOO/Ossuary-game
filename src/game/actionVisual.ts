export type ActionEffect = 'boost' | 'weaken' | 'destroy' | 'dice' | 'draw' | 'summon' | 'strike' | 'flee' | 'cancelled' | 'magic'
export type ActionTarget = 'hero' | 'foe' | 'player-die' | 'foe-die' | 'hand'

export function actionVisual(name: string, cancelled = false): { effect: ActionEffect; target: ActionTarget } {
  if (cancelled) return { effect: 'cancelled', target: 'foe' }
  switch (name) {
    case 'Force': case 'Éveil': case 'Renoncement': return { effect: 'boost', target: 'hero' }
    case 'Chance': return { effect: 'dice', target: 'player-die' }
    case 'Malchance': return { effect: 'dice', target: 'foe-die' }
    case 'Faiblesse': case 'Apaiser': case 'Dépossession': case 'Brise-armure': return { effect: 'weaken', target: 'foe' }
    case 'Frénésie': return { effect: 'boost', target: 'foe' }
    case 'Destruction': case 'Corrosion': return { effect: 'destroy', target: 'foe' }
    case 'Trouvaille': case 'Providence': case 'Cupidité': case 'Vœu': return { effect: 'draw', target: 'hand' }
    case 'Invocation': return { effect: 'summon', target: 'foe' }
    case 'Exécution': return { effect: 'strike', target: 'foe' }
    case 'Peur': return { effect: 'flee', target: 'hero' }
    default: return { effect: 'magic', target: 'hero' }
  }
}
