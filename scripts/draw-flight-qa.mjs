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
for(const width of [1920,390,320])for(const kind of ['loot','monster']){
await viewport(width,width===1920?945:844);await navigate('/');await evaluate(`(async()=>{const e=await import('/src/game/engine.ts');const {CARDS}=await import('/src/game/data.ts');let g=e.newGame('Mage','Humain',42);g.promptQueue=[];g.oaths=[];g.hand=[];g.monsterDeck=[CARDS.find(c=>c.name==='Tranchebec').id];localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:g}));})()`);await navigate('/solo');await evaluate("document.querySelector('.kind-"+(kind==='loot'?'loot':'monster')+"').click()");await wait(300);
const initial=await evaluate(`(()=>{const root=document.querySelector('.gb-draw-flights'),flight=root.querySelector('.gb-draw-flight'),id=flight.querySelector('[data-card-id]').dataset.cardId;const target=document.querySelector(`+JSON.stringify(kind==='loot'?'.gb-hand [data-card-id="':'.gb-foe [data-card-id="')+`+id+'"]');const hidden=target.closest('.is-awaiting-draw');return {transparent:getComputedStyle(root).backgroundColor==='rgba(0, 0, 0, 0)',modal:!!document.querySelector('dialog[open]'),targetHidden:target.classList.contains('gb-pending-hand-slot')||(!!hidden&&getComputedStyle(hidden).opacity==='0'),image:!!flight.querySelector('.gb-card')}})()`);if(!initial.transparent||initial.modal||!initial.targetHidden||!initial.image)throw Error(JSON.stringify({width,kind,initial}));await screenshot('draw-flight-'+kind+'-'+width);await wait(300);await evaluate(`document.querySelector('.gb-draw-flight').getAnimations().forEach(a=>a.finish())`);
const landed=await evaluate(`(()=>{const flight=document.querySelector('.gb-draw-flight'),id=flight.querySelector('[data-card-id]').dataset.cardId;const target=document.querySelector(`+JSON.stringify(kind==='loot'?'.gb-hand [data-card-id="':'.gb-foe [data-card-id="')+`+id+'"]');const a=flight.getBoundingClientRect(),b=target.getBoundingClientRect();return {distance:Math.hypot(a.left-b.left,a.top-b.top)}})()`);if(landed.distance>6)throw Error(JSON.stringify({width,kind,landed}));await wait(1800);
if(await evaluate(`!!document.querySelector('.gb-draw-flights')`))throw Error('Flight did not finish');console.log(JSON.stringify({width,kind,initial,landed}));
}if(errors.length)throw Error(errors.join('\n'));}finally{ws.close()}
