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




async function nextEffect(){await evaluate("(async()=>{for(let i=0;i<40;i++){const b=document.querySelector('.gb-effect-presentation .button-primary');if(b&&!b.disabled){b.click();return}await new Promise(r=>setTimeout(r,100))}throw Error('Effect continuation missing')})()");await wait();}
await call('Runtime.enable');try{for(const width of [1920,390]){await viewport(width,width===1920?945:844);await navigate('/');await evaluate("(async()=>{const e=await import('/src/game/engine.ts');const {CARDS}=await import('/src/game/data.ts');const id=n=>CARDS.find(c=>c.name===n).id;let g=e.newGame('Mage','Humain',42);g.promptQueue=[];g.monsterDeck.unshift(id('Fouisseur'));g=e.reduce(g,{t:'fightMonster'});g.promptQueue=[];g.combat.flags=[];g.level=4;g.hand=[id('Force')];localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:g}));})()");await navigate('/solo');await evaluate("document.querySelector('.gb-flee-button').click()");await wait(1200);await nextEffect();if(!await evaluate("document.querySelector('.gb-board-choice')?.textContent.includes('Retour en')"))throw Error('Missing Mage escape option');await screenshot('mage-flee-choice-'+width);await evaluate("document.querySelectorAll('.gb-board-choice .gb-board-choice-grid > button')[1]?.click() || [...document.querySelectorAll('.gb-board-choice button')].find(b=>b.textContent.includes('Retour en')).click()");await wait(2200);await evaluate("document.querySelector('.gb-choice-card > .button').click()");await wait(1100);await nextEffect();await evaluate("[...document.querySelectorAll('.gb-board-choice button')].find(b=>b.textContent.includes('nouveau')).click()");await wait();await screenshot('mage-flee-confirm-'+width);await evaluate("[...document.querySelectorAll('.gb-board-choice button')].find(b=>b.textContent.includes('Accepter')).click()");await wait(650);const g=await evaluate("JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game");if(g.combat||g.hand.length||!g.log.some(e=>e.code==='mageReroll')||!g.log.some(e=>['fled','fleeFailed'].includes(e.code)))throw Error('Mage escape did not resolve');console.log(JSON.stringify({width,mageEscape:true,discardPaid:true,verdictConfirmed:true}));}if(errors.length)throw Error(errors.join('\n'));}finally{ws.close()}
