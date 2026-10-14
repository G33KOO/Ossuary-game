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



await call('Runtime.enable');try {
for(const width of [1920,390])for(const klass of ['Guerrier','Druide','Mage','N\u00e9cromancien','Chasseur','Voleur']) {
 await viewport(width,width===1920?945:844);await navigate('/');
 await evaluate(`(async()=>{const e=await import('/src/game/engine.ts');const {CARDS}=await import('/src/game/data.ts');let g=e.newGame(`+JSON.stringify(klass)+`,'Humain',42);g.promptQueue=[];g.oaths=[];g.hand=CARDS.filter(c=>c.type==='Arme').slice(0,3).map(c=>c.id).concat(CARDS.filter(c=>c.type==='Armure').slice(0,3).map(c=>c.id));g.equipment.armors.Plastron=CARDS.find(c=>c.type==='Armure'&&c.slot==='Plastron')?.id??g.hand[3];g.monsterDiscard=[g.monsterDeck.pop()];if(!['Chasseur','Voleur'].includes(g.klass)){g=e.reduce(g,{t:'fightMonster'});g.promptQueue=[];g.combat.flags=[];g.combat.playerDie=3;g.draws=[];}if(!e.activeStatus(g).available)throw Error(JSON.stringify(e.activeStatus(g)));localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:g}));})()`);await navigate('/solo');
 await evaluate(`document.querySelector('.gb-class-active button').click()`);await wait(100);
 const started=await evaluate(`!!document.querySelector('.gb-action-animation')&&!document.querySelector('.gb-board-choice')&&document.querySelector('.gb-class-active button').disabled`);if(!started)throw Error(klass+' did not animate');await screenshot('active-'+width+'-'+klass);
 await wait(1850);if(!await evaluate(`!!document.querySelector('.gb-board-choice')&&!document.querySelector('.gb-action-animation')`))throw Error('Choice unavailable after animation');
 if(klass==='Guerrier'){await evaluate(`document.querySelector('.gb-choice-card > button').click()`);await wait(100);if(!await evaluate(`!!document.querySelector('.gb-action-animation.effect-strike')`))throw Error('Weapon throw was not animated');await wait(1850);}
 console.log(JSON.stringify({width,klass,animated:true}));
}if(errors.length)throw Error(errors.join('\n'));}finally{ws.close()}
