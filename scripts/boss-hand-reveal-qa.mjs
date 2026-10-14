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



await call('Runtime.enable');try{for(const [width,height] of [[1920,945],[390,844],[320,568]])for(const outcome of ['won','lost']){
await viewport(width,height);await navigate('/');const expected=await evaluate(`(async()=>{const e=await import('/src/game/engine.ts');const {CARDS}=await import('/src/game/data.ts');const id=n=>CARDS.find(c=>c.name===n).id;let g=e.newGame('Mage','Humain',42);g.promptQueue=[];g.oaths=[];g.level=10;g=e.reduce(g,{t:'challengeBoss',bossId:e.BOSS_IDS[0]});g.promptQueue=[];g.hand=[];g.combat.bossHand=['Renoncement','Mim\u00e9tisme','Contre-sort','Masse Nautile'].map(id);g.combat.bossPlayedCards=['Force','Chance'].map(id);g.combat.bossDie=2;g.combat.playerDie=3;g.combat.playerBonus=`+JSON.stringify(outcome==='won'?100:-100)+`;const expected=[...g.combat.bossHand];g=e.reduce(g,{t:'resolve'});localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:g}));return expected;})()`);await navigate('/solo');await wait(850);
const faces=await evaluate(`[...document.querySelectorAll('.gb-foe-hand.is-revealed [data-card-id]')].map(c=>c.dataset.cardId)`);if(JSON.stringify(faces)!==JSON.stringify(expected)||await evaluate(`!!document.querySelector('.gb-foe-hand .gb-back')`))throw Error('Unplayed cards not revealed');await screenshot('boss-hand-final-'+width+'-'+outcome);await evaluate(`document.querySelector('.gb-foe-hand .gb-card').click()`);await wait(650);if(!await evaluate(`!!document.querySelector('.card-dialog[open]')`))throw Error('Revealed card not inspectable');await evaluate(`document.querySelector('.card-dialog .modal-close').click();document.querySelector('.gb-final-banner').click()`);await wait(350);
const recap=await evaluate(`(()=>{const d=document.querySelector('.gb-recap-modal'),r=d.getBoundingClientRect(),b=d.querySelector(':scope > .button').getBoundingClientRect();return {ids:[...d.querySelectorAll('.gb-boss-unplayed [data-card-id]')].map(c=>c.dataset.cardId),center:Math.abs((r.top+r.bottom)/2-innerHeight/2),overflow:document.documentElement.scrollWidth-innerWidth,scroll:d.scrollHeight-d.clientHeight,buttonVisible:b.top>=r.top&&b.bottom<=r.bottom}})()`);if(JSON.stringify(recap.ids)!==JSON.stringify(expected)||recap.center>2||recap.overflow>1||!recap.buttonVisible||recap.scroll>2)throw Error(JSON.stringify({width,outcome,recap}));await screenshot('boss-hand-recap-'+width+'-'+outcome);await evaluate(`document.querySelector('.gb-recap-modal > .button').click()`);await navigate('/solo');if(!await evaluate(`document.querySelectorAll('.gb-foe-hand.is-revealed .gb-card').length===4`))throw Error('Reveal did not persist');console.log(JSON.stringify({width,outcome,revealed:true,recap:true,persisted:true}));
}if(errors.length)throw Error(errors.join('\n'));}finally{ws.close()}
