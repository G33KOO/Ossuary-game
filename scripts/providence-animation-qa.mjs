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
await viewport(width,width===1920?945:844);await navigate('/');await evaluate(`(async()=>{const e=await import('/src/game/engine.ts');const {CARDS}=await import('/src/game/data.ts');let g=e.newGame('Mage','Humain',42);g.promptQueue=[];g.oaths=[];g.hand=[CARDS.find(c=>c.name==='Providence').id];g.endTurnPending=true;localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:g}));})()`);await navigate('/solo');await evaluate(`document.querySelector('.gb-hand .gb-card').click()`);await wait(650);await evaluate(`document.querySelector('.card-dialog .dialog-actions .button').click()`);await wait(400);
const playing=await evaluate(`(()=>{const f=document.querySelector('.gb-action-flight'),a=document.querySelector('.gb-arena').getBoundingClientRect();const x=parseFloat(f.style.left),y=parseFloat(f.style.top);return {onBoard:x>=a.left&&x<=a.right&&y>=a.top&&y<=a.bottom,visibleHand:document.querySelectorAll('.gb-hand .gb-card').length,reserved:document.querySelectorAll('.gb-pending-hand-slot').length,drawing:!!document.querySelector('.gb-draw-flights')}})()`);if(!playing.onBoard||playing.visibleHand!==0||playing.reserved!==3||playing.drawing)throw Error(JSON.stringify({width,playing}));await screenshot('providence-play-'+width);await wait(1600);
const drawing=await evaluate(`({action:!!document.querySelector('.gb-action-animation'),flights:document.querySelectorAll('.gb-draw-flight').length,visibleHand:document.querySelectorAll('.gb-hand .gb-card').length})`);if(drawing.action||drawing.flights!==3||drawing.visibleHand!==0)throw Error(JSON.stringify({width,drawing}));await screenshot('providence-draw-'+width);await wait(3000);
const finished=await evaluate(`(()=>{const g=JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game;return {visibleHand:document.querySelectorAll('.gb-hand .gb-card').length,reserved:document.querySelectorAll('.gb-pending-hand-slot').length,animation:!!document.querySelector('.gb-draw-flights'),turn:g.turn,endTurn:!![...document.querySelectorAll('.gb-stage-actions button')].find(b=>b.textContent.includes('Fin de tour')&&!b.disabled)}})()`);if(finished.visibleHand!==3||finished.reserved!==0||finished.animation||finished.turn!==1||!finished.endTurn)throw Error(JSON.stringify({width,finished}));console.log(JSON.stringify({width,playing,drawing,finished}));
}if(errors.length)throw Error(errors.join('\n'));}finally{ws.close()}
