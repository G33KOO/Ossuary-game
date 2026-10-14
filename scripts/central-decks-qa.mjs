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




async function setup(){await navigate('/');await evaluate("(async()=>{const e=await import('/src/game/engine.ts');let g=e.newGame('Mage','Humain',42);g.promptQueue=[];g.oaths=[];g.level=10;g.draws=[];localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:g}));})()");await navigate('/solo')}
await call('Runtime.enable');try{for(const width of [1920,390]){await viewport(width,width===1920?945:844);await setup();const layout=await evaluate("(()=>{const t=document.querySelector('.gb-table').getBoundingClientRect();const r=[...document.querySelectorAll('.gb-deck-row .gb-pile-stack')].map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width}});return {r,center:Math.abs(r[1].x+r[1].width/2-(t.left+t.width/2)),overflow:document.documentElement.scrollWidth-innerWidth,scroll:document.querySelector('.gb-table').scrollHeight-document.querySelector('.gb-table').clientHeight}})()");if(layout.r.length!==3||layout.center>2||!(layout.r[0].x<layout.r[1].x&&layout.r[1].x<layout.r[2].x)||Math.max(...layout.r.map(r=>r.y))-Math.min(...layout.r.map(r=>r.y))>2||layout.overflow>1||(width===1920&&layout.scroll>2))throw Error(JSON.stringify(layout));await screenshot('central-decks-'+width);for(const side of ['left','right']){if(side==='right')await setup();const origin=await evaluate("document.querySelector('.gb-side-"+side+" .gb-pile-stack .gb-back:nth-child(3)').getBoundingClientRect().toJSON()");await evaluate("document.querySelector('.gb-side-"+side+" .gb-pile').click()");await wait(200);const animation=await evaluate("(()=>{const source="+JSON.stringify(origin)+";const f=document.querySelector('.gb-draw-flight');const a=f?.getAnimations()[0];if(!a)return false;const transform=a.effect.getKeyframes()[0].transform;const m=transform.slice(transform.indexOf('(')+1,transform.indexOf(')')).split(',').map(parseFloat);return !!m&&Math.abs(m[0]-(source.left-parseFloat(f.style.left)))<2})()");if(!animation)throw Error('Draw animation did not originate from centered deck '+side);await wait(2400)}console.log(JSON.stringify({width,centralDecks:true,drawOrigins:true,layout}));}if(errors.length)throw Error(errors.join('\n'));}finally{ws.close()}
