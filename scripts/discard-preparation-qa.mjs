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




async function state(){await wait(650);return evaluate("JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game")}
await call('Runtime.enable');try{for(const width of [1920,390]){await viewport(width,width===1920?945:844);await navigate('/');await evaluate("(async()=>{const e=await import('/src/game/engine.ts');const {CARDS}=await import('/src/game/data.ts');const id=n=>CARDS.find(c=>c.name===n).id;let g=e.newGame('Mage','Humain',42);g.promptQueue=[];g.oaths=[];g.hand=['Masse Nautile','Providence','Force','Chance','Peur','Faiblesse','Destruction','Corrosion'].map(id);g.lootDeck=g.lootDeck.filter(id=>!g.hand.includes(id));g.endTurnPending=true;g=e.reduce(g,{t:'endTurn'});localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:g}));})()");await navigate('/solo');const geometry=await evaluate("(()=>{const a=document.querySelector('.gb-preparation-play').getBoundingClientRect(),b=document.querySelector('.gb-discard-zone').getBoundingClientRect();return {side:b.left>=a.right,overflow:document.documentElement.scrollWidth-innerWidth,rects:['.gb-table','.gb-center','.gb-preparation-play','.gb-discard-zone','.gb-board','.gb-stage-actions','.gb-deck-row'].map(s=>[s,document.querySelector(s)?.getBoundingClientRect().height]),tableScroll:document.querySelector('.gb-table').scrollHeight-document.querySelector('.gb-table').clientHeight}})()");if(!geometry.side||geometry.overflow>1||(width===1920&&geometry.tableScroll>2))throw Error(JSON.stringify(geometry));await screenshot('discard-preparation-'+width);await evaluate("document.querySelector('.gb-hand .gb-card').click()");await wait(650);await evaluate("[...document.querySelectorAll('.dialog-actions button')].find(b=>b.textContent.includes('Équiper')).click()");let g=await state();if(g.hand.length!==7||g.promptQueue[0].ctx.count!==1||g.tavernDone)throw Error('Equipment unavailable during discard');if(width===1920){await evaluate("document.querySelectorAll('.gb-hand .gb-card')[0].dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:new DataTransfer()}))");await wait(100);await evaluate("document.querySelector('.gb-preparation-play').dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:new DataTransfer()}))");}else{await evaluate("document.querySelector('.gb-hand .gb-card').click()");await wait(650);await evaluate("[...document.querySelectorAll('.dialog-actions button')].find(b=>b.textContent.includes('Jouer')).click()");}await wait(3500);g=await state();if(g.hand.length!==9||g.promptQueue[0]?.ctx.count!==3||g.turn!==1||g.tavernDone)throw Error('Action did not update the excess hand');await screenshot('discard-after-providence-'+width);console.log(JSON.stringify({width,sideBin:true,equip:true,play:true,updatedExcess:true,geometry}));}if(errors.length)throw Error(errors.join('\n'));}finally{ws.close()}
