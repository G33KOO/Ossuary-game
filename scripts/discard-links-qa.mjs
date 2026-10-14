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
await viewport(width,width===1920?945:844);await navigate('/');await evaluate(`(async()=>{const e=await import('/src/game/engine.ts');let g=e.newGame('Mage','Humain',42);g.promptQueue=[];g.lootDiscard=g.lootDeck.splice(0,3);g.monsterDiscard=g.monsterDeck.splice(0,2);localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:g}));})()`);await navigate('/solo');
const layout=await evaluate(`[...document.querySelectorAll('.gb-side')].map(s=>{const p=s.querySelector('.gb-pile').getBoundingClientRect(),l=s.querySelector('.gb-discard-link').getBoundingClientRect();return {below:l.top>=p.bottom-1,visible:l.height>0,images:!!s.querySelector('.gb-discard .gb-card')}})`);if(layout.some(x=>!x.below||!x.visible||x.images))throw Error(JSON.stringify(layout));await screenshot('discard-links-'+width);
for(const [side,count] of [['left',2],['right',3]]){await evaluate("document.querySelector('.gb-side-"+side+" .gb-discard-link').click()");await wait(300);const cards=await evaluate(`document.querySelectorAll('.gb-discard-gallery-card').length`);if(cards!==count)throw Error('Missing cards '+cards);await evaluate(`document.querySelector('.gb-discard-gallery .modal-close').click()`);}
console.log(JSON.stringify({width,layout,counts:[2,3]}));
}if(errors.length)throw Error(errors.join('\n'));}finally{ws.close()}
