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


await call('Runtime.enable');try{for(const width of [1920,390,320]){
await viewport(width,width===1920?945:844);await navigate('/');await evaluate(`(async()=>{const e=await import('/src/game/engine.ts');const {CARDS}=await import('/src/game/data.ts');let g=e.newGame('Mage','Humain',42);g.promptQueue=[];g.oaths=[];g.hand=CARDS.filter(c=>c.type==='Action').slice(0,8).map(c=>c.id);g.endTurnPending=true;localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:g}));})()`);await navigate('/solo');await evaluate(`[...document.querySelectorAll('.gb-stage-actions button')].find(b=>b.textContent.includes('Fin de tour')).click()`);await wait(250);
const first=await evaluate(`(()=>{const g=JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game;return {prompt:g.promptQueue[0]?.purpose,remaining:g.promptQueue[0]?.ctx.count,offers:!!document.querySelector('.gb-tavern-board'),modal:!!document.querySelector('dialog[open]'),opened:g.log.some(e=>e.code==='tavernOpen')}})()`);if(first.prompt!=='discard-excess'||first.remaining!==2||first.offers||first.modal||first.opened)throw Error(JSON.stringify(first));await screenshot('pre-tavern-discard-'+width);
for(let i=0;i<2;i++){await evaluate(`document.querySelector('.gb-choice-card > .button').click()`);await wait(650)}await wait(1000);
const tavern=await evaluate(`(()=>{const g=JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game;return {prompt:g.promptQueue[0]?.purpose,hand:g.hand.length,turn:g.turn,offers:document.querySelectorAll('.gb-tavern-offer').length}})()`);if(tavern.prompt!=='tavern'||tavern.hand!==6||tavern.turn!==1||tavern.offers!==3)throw Error(JSON.stringify(tavern));await evaluate(`document.querySelector('.gb-stage-actions .button-primary').click()`);await wait(650);const ended=await evaluate(`(()=>{const g=JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game;return {turn:g.turn,prompts:g.promptQueue.length}})()`);if(ended.turn!==2||ended.prompts!==0)throw Error(JSON.stringify(ended)+' '+await evaluate(`document.querySelector('.gb-stage-actions')?.textContent+' '+JSON.stringify(JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game.promptQueue)`));console.log(JSON.stringify({width,first,tavern,ended}));
}if(errors.length)throw Error(errors.join('\n'));}finally{ws.close()}
