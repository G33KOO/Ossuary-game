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
 for(const width of [1920,390]) {
  await viewport(width,width===1920?945:844);
  await navigate('/');
  await evaluate(`(async()=>{const e=await import('/src/game/engine.ts');const {CARDS}=await import('/src/game/data.ts');const id=n=>CARDS.find(c=>c.name===n).id;let g=e.newGame('Mage','Humain',42);g.level=10;g.promptQueue=[];g=e.reduce(g,{t:'challengeBoss',bossId:e.BOSS_IDS[0]});g.promptQueue=[];g.hand=[];g.combat.bossEquip=[];g.combat.bossBonus=0;g.combat.bossHand=[id('Mim\u00e9tisme'),id('Masse Nautile')];g.combat.bossPlayedCards=[];localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:g}));})()`);
  await navigate('/solo');
  await evaluate(`document.querySelector('.gb-controls .button-primary').click()`);
  const codes=[];
  for(let i=0;i<8;i++) {
   await wait(1000);
   const check=await evaluate(`(()=>{const p=document.querySelector('.gb-effect-presentation');const g=JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game;return {visible:!!p,text:p?.innerText,cards:p?.querySelectorAll('.gb-card').length,ready:g.combat?.bossReady,bonus:g.combat?.bossBonus,codes:g.log.map(x=>x.code)}})()`);
   if(check.ready)break;
   if(!check.visible)throw Error('Missing boss effect presentation');
   if(check.text.includes('Guerrier')){await screenshot('boss-active-'+width+'-'+i);if(i===2&&check.cards<2)throw Error('Missing discarded weapon');}
   codes.push(check.codes.at(-1));
   await evaluate(`document.querySelector('.gb-effect-presentation .button-primary').click()`);
  }
  const g=await evaluate(`JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game`);
  if(g.combat.bossBonus!==1||!g.combat.bossReady||!g.log.some(x=>x.code==='bossActive'))throw Error('Boss active did not finish');
  console.log(JSON.stringify({width,activeAnimated:true,steps:codes}));
 }
 if(errors.length)throw Error(errors.join('\n'));
}finally{ws.close()}
