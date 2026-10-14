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


await call('Runtime.enable');try{for(const width of [1920,320])for(const theme of ['dark','light']){
await viewport(width,width===1920?945:568);await navigate('/');await evaluate(`(async()=>{const e=await import('/src/game/engine.ts');const g=e.newGame('Mage','Humain',42);g.promptQueue=[];g.oaths=[];g.dieSides=8;g.level=5;localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:g}));localStorage.setItem('ossuaire-theme',`+JSON.stringify(theme)+`);})()`);await navigate('/solo');await evaluate(`document.querySelector('.gb-player-die-control').scrollIntoView({block:'center'})`);const gold=await evaluate(`(()=>{const d=document.querySelector('.gb-player-die-control .gb-die'),f=d.querySelector('.gb-die-face'),s=getComputedStyle(f);return {awakened:d.classList.contains('is-awakened'),disabled:document.querySelector('.gb-player-die-button').disabled,opaque:s.opacity,gradient:s.backgroundImage,halo:s.boxShadow,shine:getComputedStyle(f,'::after').animationName}})()`);if(!gold.awakened||!gold.disabled||gold.opaque!=='1'||!gold.gradient.includes('255, 244, 189')||gold.shine!=='gb-awakened-die-shine')throw Error(JSON.stringify(gold));await screenshot('awakened-die-'+theme+'-'+width);console.log(JSON.stringify({width,theme,gold}));
}await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});if(await evaluate(`getComputedStyle(document.querySelector('.gb-die.is-awakened .gb-die-face'),'::after').animationName`)!=='none')throw Error('Reduced motion');await call('Emulation.setEmulatedMedia',{features:[]});}finally{ws.close()}
