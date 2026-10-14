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




await call('Runtime.enable');try{for(const width of [1920,390]){await viewport(width,width===1920?945:844);await navigate('/');const offers=await evaluate("(async()=>{const e=await import('/src/game/engine.ts');let g=e.newGame('Mage','Humain',42);const choices=g.lootDeck.splice(0,3);g.promptQueue=[{purpose:'tavern',options:choices.map(id=>({id,cardId:id})),optional:true,ctx:{choices,remaining:1}}];g.endTurnPending=true;g.draws=[];localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:g}));return choices})()");await navigate('/solo');await wait(1000);await evaluate("document.querySelectorAll('.gb-tavern-offer > button')[0].click()");await wait(350);await evaluate("document.querySelectorAll('.gb-tavern-offer > button')[1].click()");await wait(650);let g=await evaluate("JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game");if(g.promptQueue[0].purpose!=='tavern-give'||g.promptQueue[0].ctx.taken!==offers[1]||g.hand.length!==6||g.log.some(e=>e.code==='tavernSwap'))throw Error('Offer switching changed the hand or did not select second offer');await screenshot('tavern-switch-'+width);await evaluate("document.querySelector('.gb-hand .gb-card').click()");await wait(650);await evaluate("document.querySelector('.dialog-actions .button-primary').click()");await wait(650);g=await evaluate("JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game");if(!g.hand.includes(offers[1])||g.hand.includes(offers[0])||!g.lootDiscard.includes(offers[0])||!g.log.some(e=>e.code==='tavernSwap'))throw Error('Trade did not use the newly selected offer');console.log(JSON.stringify({width,directSwitch:true,handPreservedUntilTrade:true,correctTrade:true}));}if(errors.length)throw Error(errors.join('\n'));}finally{ws.close()}
