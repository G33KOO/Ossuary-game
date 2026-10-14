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




await call('Runtime.enable');try{for(const width of [1920,390,320]){await viewport(width,width===1920?945:844);await navigate('/');await evaluate("(async()=>{const e=await import('/src/game/engine.ts');const {CARDS}=await import('/src/game/data.ts');let g=e.newGame('Mage','Humain',42);g.promptQueue=[];g.monsterDeck.unshift(CARDS.find(c=>c.name==='Fouisseur').id);g=e.reduce(g,{t:'fightMonster'});g.promptQueue=[];g.draws=[];localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:g}));})()");await navigate('/solo');const before=await evaluate("(()=>{const b=document.querySelector('.gb-player-die-button'),r=b.getBoundingClientRect(),t=document.querySelector('.gb-table').getBoundingClientRect();return {rect:r.toJSON(),table:t.toJSON(),viewport:innerWidth,visible:r.top>=t.top&&r.bottom<=t.bottom,inCombat:!!b.closest('.gb-stage-actions'),notEquipment:!b.closest('.gb-board'),faceWidth:document.querySelector('.gb-player-die-control .gb-die-face').getBoundingClientRect().width,ready:!!document.querySelector('.gb-player-die-control.is-ready'),secondary:!!document.querySelector('.gb-resolve-without-die'),caption:b.textContent}})()");if(!before.visible||!before.inCombat||!before.notEquipment||before.faceWidth<60||!before.ready||!before.secondary||!before.caption.includes('combat'))throw Error(JSON.stringify({width,before}));await screenshot('combat-die-ready-'+width);await evaluate("document.querySelector('.gb-player-die-button').click()");await wait(400);const rolling=await evaluate("!!document.querySelector('.gb-combat-die-stage .is-rolling')&&JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game.combat.playerDie===null");if(!rolling)throw Error('Missing roll suspense');await screenshot('combat-die-rolling-'+width);await wait(1600);const after=await evaluate("(()=>{const g=JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game;return {rolled:g.combat?.playerDie,phase:g.phase,ready:!!document.querySelector('.gb-player-die-control.is-ready'),primary:!!document.querySelector('.gb-controls > .button-primary'),fleeBlocked:document.querySelector('.gb-flee-button').disabled}})()");if(!after.rolled||after.phase!=='combat'||after.ready||!after.primary||!after.fleeBlocked)throw Error(JSON.stringify({width,after}));await screenshot('combat-die-result-'+width);console.log(JSON.stringify({width,before,after,animatedRoll:true}));}if(errors.length)throw Error(errors.join('\n'));}finally{ws.close()}
