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



await call('Runtime.enable');try{await viewport(1920,945);for(const mode of ['replace0','replace1','empty1','two1','singleAfterTwo1']){
await navigate('/');const fixture=await evaluate(`(async()=>{const e=await import('/src/game/engine.ts');const {CARDS}=await import('/src/game/data.ts');const single=CARDS.filter(c=>c.type==='Arme'&&c.subtype!=='Deux mains').slice(0,3).map(c=>c.id),two=CARDS.find(c=>c.type==='Arme'&&c.subtype==='Deux mains').id;let g=e.newGame('Guerrier','Humain',42);g.promptQueue=[];g.oaths=[];g.equipment.hands=single.slice(0,2);const mode=`+JSON.stringify(mode)+`;g.hand=[mode==='two1'?two:single[2]];if(mode==='empty1')g.equipment.hands=[];if(mode==='singleAfterTwo1')g.equipment.hands=[two];localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:g}));return {single,two,incoming:g.hand[0]};})()`);await navigate('/solo');const hand=mode==='replace0'?0:1;
await evaluate(`window.qaTransfer=new DataTransfer();document.querySelector('.gb-hand .gb-card').dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:window.qaTransfer}))`);await wait(150);await evaluate(`(()=>{const slot=document.querySelector('[data-weapon-slot="`+hand+`"]');slot.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:window.qaTransfer}));slot.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:window.qaTransfer}));})()`);await wait(650);
const actual=await evaluate(`[...document.querySelectorAll('[data-weapon-slot]')].map(s=>s.querySelector('[data-card-id]')?.dataset.cardId??null)`);const expected=mode==='two1'?[fixture.two,fixture.two]:mode==='replace0'?[fixture.incoming,fixture.single[1]]:mode==='replace1'?[fixture.single[0],fixture.incoming]:[null,fixture.incoming];if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error(JSON.stringify({mode,actual,expected}));await navigate('/solo');const resumed=await evaluate(`[...document.querySelectorAll('[data-weapon-slot]')].map(s=>s.querySelector('[data-card-id]')?.dataset.cardId??null)`);if(JSON.stringify(resumed)!==JSON.stringify(expected))throw Error('Slots did not persist');await screenshot('weapon-slot-'+mode);console.log(JSON.stringify({mode,actual,persisted:true}));
}if(errors.length)throw Error(errors.join('\n'));}finally{ws.close()}
