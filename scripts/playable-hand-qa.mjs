// Run against an isolated Chrome QA profile with --remote-debugging-port=9227.
// Requires the local Vite dev server; never run against a user's personal browser profile.
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const base = process.env.OSSUAIRE_QA_URL ?? 'http://127.0.0.1:5174'
const targets = await (await fetch('http://127.0.0.1:9227/json')).json()
const target = targets.find((entry) => entry.type === 'page')
if (!target) throw new Error('Start an isolated Chrome QA browser on port 9227 first.')
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
let seq = 0
const pending = new Map()
const errors = []
ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  if (message.id) { pending.get(message.id)?.(message); pending.delete(message.id) }
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text)
}
async function call(method, params = {}) {
  const id = ++seq
  const response = await new Promise((resolve) => { pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params })) })
  if (response.error) throw new Error(JSON.stringify(response.error))
  return response.result
}
async function evaluate(expression) {
  const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
  return result.result.value
}
const wait = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms))
async function navigate(route) { await call('Page.navigate', { url: base + route }); await wait(650) }
async function viewport(width, height) { await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width <= 760 }); await wait() }
const output = path.join(os.tmpdir(), 'ossuaire-qa')
await fs.mkdir(output, { recursive: true })
async function screenshot(name) {
  const result = await call('Page.captureScreenshot', { format: 'png' })
  await fs.writeFile(path.join(output, name + '.png'), Buffer.from(result.data, 'base64'))
}




await call('Runtime.enable');try{for(const width of [1920,390]){await viewport(width,width===1920?945:844);for(const phase of ['adventure','combat-before-roll','combat-after-roll','end-turn','tavern','pay','tavern-give']){await navigate('/');const expected=await evaluate("(async()=>{const e=await import('/src/game/engine.ts');const {CARDS}=await import('/src/game/data.ts');const {equipmentImprovesHero}=await import('/src/game/equipmentUpgrade.ts');const id=n=>CARDS.find(c=>c.name===n).id;const phase="+JSON.stringify(phase)+";let g=e.newGame('Mage','Humain',42);g.promptQueue=[];if(phase.startsWith('combat')){g.monsterDeck.unshift(id('Fouisseur'));g=e.reduce(g,{t:'fightMonster'});g.promptQueue=[];g.combat.flags=[];if(phase==='combat-after-roll'){g.combat.playerDie=3;g.combat.hasRolled=true}}if(phase==='end-turn')g.endTurnPending=true;if(phase==='tavern')g.promptQueue=[{purpose:'tavern',options:[{id:id('Chance'),cardId:id('Chance')}],optional:true,ctx:{choices:[id('Chance')],remaining:1}}];g.hand=['Force','Chance','Providence','Masse Nautile','Astrolabe des Arcanes'].map(id);if(phase==='pay')g.promptQueue=[{purpose:'pay',options:g.hand.map(id=>({id,cardId:id})),optional:true,ctx:{kind:'mage',n:1,paid:[]}}];if(phase==='tavern-give')g.promptQueue=[{purpose:'tavern-give',options:g.hand.map(id=>({id,cardId:id})),optional:false,ctx:{choices:[id('Chance')],taken:id('Chance'),remaining:1}}];g.equipment.hands=['Baguette Runique','Orbe Astral'].map(id);g.draws=[];localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:g}));return ['pay','tavern-give'].includes(phase)?g.hand:g.hand.filter(id=>equipmentImprovesHero(g,id)||e.canPlayAction(g,id));})()");await navigate('/solo');const actual=await evaluate("[...document.querySelectorAll('.gb-hand .is-playable')].map(el=>el.dataset.cardId)");if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error(JSON.stringify({phase,width,expected,actual}));if(actual.length&&!await evaluate("getComputedStyle(document.querySelector('.gb-hand .is-playable .gb-card')).animationName.includes('gb-playable-card-glow')"))throw Error('Missing playable glow');if(phase==='combat-before-roll')await screenshot('playable-hand-'+width);console.log(JSON.stringify({width,phase,playable:actual.length}));}}if(errors.length)throw Error(errors.join('\n'));}finally{ws.close()}
