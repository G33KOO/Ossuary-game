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


const report=[];
await call('Runtime.enable');
try {
 for(const [width,height] of [[1920,945],[390,844],[320,568]]) {
  await viewport(width,height);await navigate('/');
  await evaluate(`(async()=>{const e=await import('/src/game/engine.ts');const {CARDS}=await import('/src/game/data.ts');let g=e.newGame('Guerrier','Humain',42);g.promptQueue=[];g.oaths=[];g.hand=[CARDS.find(c=>c.name==='Trouvaille').id,CARDS.find(c=>c.type==='Armure').id];g=e.reduce(g,{t:'drawLoot'});g.draws=[];localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:g}));})()`);
  await navigate('/solo');
  const prep=await evaluate(`(()=>{const b=[...document.querySelectorAll('.gb-combat-panel button')].find(b=>b.textContent.includes('Fin de tour'));return {enabled:b&&!b.disabled,overflow:document.documentElement.scrollWidth-innerWidth,panel:document.querySelector('.gb-combat-panel').getBoundingClientRect().bottom,board:document.querySelector('.gb-board').getBoundingClientRect().top,turn:JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game.turn}})()`);
  if(!prep.enabled||prep.turn!==1||prep.overflow>1)throw Error('Preparation layout '+JSON.stringify({width,...prep}));
  await screenshot('turn-preparation-'+width);
  await evaluate(`[...document.querySelectorAll('.gb-combat-panel button')].find(b=>b.textContent.includes('Fin de tour')).click()`);await wait(600);
  const tavern=await evaluate(`({open:!!document.querySelector('.gb-tavern-modal'),turn:JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game.turn})`);
  if(!tavern.open||tavern.turn!==1)throw Error('Tavern missing');
  await evaluate(`document.querySelector('.gb-tavern-hand .gc-inspect, .gb-tavern-hand button').click()`);await wait(400);
  const action=await evaluate(`(()=>{const buttons=[...document.querySelectorAll('dialog[open] button')];const b=buttons.find(b=>b.textContent.trim()==='Jouer');if(b&&!b.disabled){b.click();return true}return false})()`);
  if(!action)throw Error('Tavern hand Action unavailable');
  await wait(6500);
  const played=await evaluate(`(()=>{const g=JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game;return {turn:g.turn,prompt:g.promptQueue[0]?.purpose,hand:g.hand.length}})()`);
  if(played.turn!==1||played.prompt!=='tavern')throw Error('Tavern Action lost offers');
  await screenshot('turn-tavern-'+width);
  await evaluate(`[...document.querySelectorAll('.gb-tavern-modal button')].find(b=>b.textContent.includes('Non merci') || b.getAttribute('aria-label')==='Non merci').click()`);await wait(600);
  const turn=await evaluate(`JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game.turn`);
  if(turn!==2)throw Error('Manual turn failed '+turn);
  report.push({width,height,prep,tavern,played,turn});
 }
 if(errors.length)throw Error(errors.join('\n'));
 console.log(JSON.stringify(report,null,2));
}finally{ws.close()}
