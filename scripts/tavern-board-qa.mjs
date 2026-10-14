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


await call('Runtime.enable');
try {
 for(const width of [1920,1366,390,320]){
 await viewport(width,width===1920?945:width===1366?768:844);await navigate('/');
 await evaluate(`(async()=>{const e=await import('/src/game/engine.ts');const {CARDS}=await import('/src/game/data.ts');let g=e.newGame('Mage','Humain',42);g.promptQueue=[];g.oaths=[];g.hand=g.lootDeck.splice(0,3);g.endTurnPending=true;g.retainedMonsters=[CARDS.find(c=>c.name==='Vitrail').id];g=e.reduce(g,{t:'endTurn'});localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:g}));})()`);await navigate('/solo');await wait(1000);
 const layout=await evaluate(`(()=>{const b=document.querySelector('.gb-tavern-board').getBoundingClientRect();const p=document.querySelector('.gb-stage-actions').getBoundingClientRect();const pairs=[...document.querySelectorAll('.gb-side')].map(s=>{const a=s.querySelector('.gb-pile').getBoundingClientRect(),d=s.querySelector('.gb-discard').getBoundingClientRect();return {sideways:d.width===0||d.left>=a.right-1}});return {modal:!!document.querySelector('dialog[open]'),overlap:b.bottom>p.top+1,overflow:document.documentElement.scrollWidth-innerWidth,pairs}})()`);
 if(layout.modal||layout.overlap||layout.overflow>1||layout.pairs.some(p=>!p.sideways))throw Error(JSON.stringify({width,layout}));await screenshot('tavern-board-'+width);
 await evaluate(`document.querySelector('.gb-tavern-offer button.button').click()`);await wait(150);
 await evaluate(`[...document.querySelectorAll('.gb-stage-actions button')].find(b=>b.textContent.includes('Revenir')).click()`);await wait(150);
 if(await evaluate(`JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game.promptQueue[0].purpose`)!=='tavern')throw Error('Back failed');
 await evaluate(`document.querySelector('.gb-tavern-offer button.button').click()`);await wait(150);
 await evaluate(`document.querySelector('.gb-hand button').click()`);await wait(200);
 await evaluate(`[...document.querySelectorAll('dialog[open] button')].find(b=>b.textContent.includes('\u00c9changer')).click()`);await wait(1100);
 const first=await evaluate(`(()=>{const g=JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game;return {turn:g.turn,remaining:g.promptQueue[0]?.ctx.remaining,swaps:g.log.filter(e=>e.code==='tavernSwap').length}})()`);if(first.turn!==1||first.remaining!==1||first.swaps!==1)throw Error('First trade '+JSON.stringify(first));
 await evaluate(`document.querySelector('.gb-hand [draggable]').dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:new DataTransfer()}))`);await wait(100);
 await evaluate(`document.querySelector('.gb-tavern-offer').dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:new DataTransfer()}))`);await wait(300);
 const last=await evaluate(`(()=>{const g=JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game;return {turn:g.turn,swaps:g.log.filter(e=>e.code==='tavernSwap').length}})()`);if(last.turn!==2||last.swaps!==2)throw Error('Drag trade '+JSON.stringify(last));console.log(JSON.stringify({width,layout,first,last}));
 }
}finally{ws.close()}
