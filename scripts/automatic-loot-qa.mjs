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


await call('Runtime.enable');try{
for(const width of [1920,390,320]){
await viewport(width,width===1920?945:844);await navigate('/');await evaluate(`(async()=>{const e=await import('/src/game/engine.ts');const {CARDS}=await import('/src/game/data.ts');const id=n=>CARDS.find(c=>c.name===n).id;let g=e.newGame('Mage','Humain',42);g.promptQueue=[];g.oaths=[];g.hand=[];g.monsterDeck=[id('Tranchebec')];g.lootDeck=[id('Dague Veuve'),...g.lootDeck.filter(x=>x!==id('Dague Veuve'))];g=e.reduce(g,{t:'fightMonster'});g.combat.playerBonus=100;g.draws=[];localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:g}));})()`);await navigate('/solo');
await evaluate(`document.querySelector('.gb-controls .button-primary').click()`);await wait(1400);const automatic=await evaluate(`!!document.querySelector('.gb-combat-resolution')&&!document.querySelector('.gb-combat-resolution button')`);if(!automatic)throw Error('Victory still asks for confirmation');await wait(1700);
const draw=await evaluate(`!!document.querySelector('.gb-draw-flight.from-loot')&&!document.querySelector('.gb-combat-resolution')`);if(!draw)throw Error('Loot did not start automatically');await screenshot('automatic-loot-'+width);await wait(3000);
const prep=await evaluate(`(()=>{const g=JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game;const b=[...document.querySelectorAll('.gb-stage-actions button')].find(b=>b.textContent.includes('Fin de tour'));return {turn:g.turn,pending:g.endTurnPending,enabled:b&&!b.disabled,hand:g.hand.length,prompt:g.promptQueue.length}})()`);if(prep.turn!==1||!prep.pending||!prep.enabled||prep.hand!==1||prep.prompt!==0)throw Error(JSON.stringify(prep));
await evaluate(`document.querySelector('.gb-hand button').click()`);await wait(650);await evaluate(`[...document.querySelectorAll('.card-dialog button')].find(b=>b.textContent.trim()==='\u00c9quiper').click()`);await wait(650);
const equipped=await evaluate(`JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game.equipment.hands.length===1`);if(!equipped)throw Error('Cannot equip after automatic Loot '+await evaluate(`JSON.stringify(JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game)`));console.log(JSON.stringify({width,automatic,draw,prep,equipped}));
}if(errors.length)throw Error(errors.join('\n'));}finally{ws.close()}
