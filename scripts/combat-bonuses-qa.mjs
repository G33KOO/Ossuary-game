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
await viewport(width,width===1920?945:844);await navigate('/');await evaluate(`(async()=>{const e=await import('/src/game/engine.ts');const {CARDS}=await import('/src/game/data.ts');const id=n=>CARDS.find(c=>c.name===n).id;let g=e.newGame('Mage','Nain',42);g.promptQueue=[];g.oaths=[];g.hand=[id('Cupidit\u00e9'),id('Force')];g.monsterDeck=[id('Tranchebec')];g=e.reduce(g,{t:'fightMonster'});g.promptQueue=[];g.draws=[];g.combat.playerDie=3;for(let seed=1;seed<100;seed++){const test=e.reduce({...g,seed},{t:'playAction',id:g.hand[0]});if(test.combat.lootMultiplier===2){g.seed=seed;break;}}localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:g}));})()`);await navigate('/solo');
if(!await evaluate(`[...document.querySelectorAll('.gb-combat-bonus')].some(b=>b.textContent.includes('Nain')&&b.textContent.includes('+1'))`))throw Error('Racial bonus missing');await evaluate(`document.querySelector('.gb-hand .gb-card').click()`);await wait(650);await evaluate(`document.querySelector('.dialog-actions .button').click()`);await wait(3000);
if(!await evaluate(`document.querySelector('.gb-effect-presentation .gb-effect-change')?.textContent.includes('2')&&!!document.querySelector('.gb-effect-presentation')`))throw Error('Greed effect missing');await evaluate(`document.querySelector('.gb-effect-presentation .button-primary').click()`);await wait(300);await evaluate(`document.querySelector('.gb-monster-encounter').scrollIntoView({block:'start'})`);await wait(250);
const result=await evaluate(`(()=>{const b=document.querySelector('.gb-monster-encounter .gb-combat-bonuses'),c=document.querySelector('.gb-monster-encounter .gb-card'),r=b.getBoundingClientRect(),a=c.getBoundingClientRect(),g=JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game;return {text:b.textContent,below:r.top>=a.bottom-1,overflow:document.documentElement.scrollWidth-innerWidth,multiplier:g.combat.lootMultiplier}})()`);if(!result.below||result.overflow>1||result.multiplier!==2||!result.text.includes('victoire'))throw Error(JSON.stringify({width,result}));await screenshot('combat-bonuses-'+width);console.log(JSON.stringify({width,result}));
}if(errors.length)throw Error(errors.join('\n'));}finally{ws.close()}
