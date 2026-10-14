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


async function setup(mode){await navigate('/');await evaluate(`(async()=>{const e=await import('/src/game/engine.ts');const {CARDS}=await import('/src/game/data.ts');const id=name=>CARDS.find(c=>c.name===name).id;let g=e.newGame('Mage','Humain',42);g.promptQueue=[];g.oaths=[];g.hand=g.lootDeck.splice(0,5);g.equipment.armors.Plastron=id('Plastron C\u0153ur-de-Dragon');g.equipment.armors.Bottes=id('Bottes Longue-Piste');const mode=`+JSON.stringify(mode)+`;if(mode==='fournaise'){g.monsterDeck=[id('Fournaise'),id('Tranchebec'),id('Souriant')];g=e.reduce(g,{t:'fightMonster'})}if(mode==='gobeur'){g.monsterDeck=[id('Gobeur')];g=e.reduce(g,{t:'fightMonster'})}if(mode==='suzeraine'){g.level=10;g=e.reduce(g,{t:'challengeBoss',bossId:id('La Suzeraine')})}if(mode==='thief'){const choices=g.lootDeck.splice(0,5);g.promptQueue=[{purpose:'thief-pick',options:choices.map(id=>({id,cardId:id})),optional:false,ctx:{choices}}]}if(mode==='discard'){g.promptQueue=[{purpose:'discard-one',options:g.hand.map(id=>({id,cardId:id})),optional:false,ctx:{}}]}if(mode==='boss')g.level=10;g.draws=[];localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:g}));})()`);await navigate('/solo');await wait(1100)}
await call('Runtime.enable');try{
 for(const width of [1920,1366,390,320]){
 await viewport(width,width===1920?945:width===1366?768:844);
 for(const mode of ['fournaise','gobeur','suzeraine','thief','discard']){
 await setup(mode);const layout=await evaluate(`(()=>{const c=document.querySelector('.gb-board-choice'),r=c.getBoundingClientRect(),p=document.querySelector('.gb-stage-actions')?.getBoundingClientRect();return {inline:!!c.closest('.gb-arena'),modal:!!document.querySelector('dialog[open]'),overlap:p?r.bottom>p.top+1:false,overflow:document.documentElement.scrollWidth-innerWidth,count:c.querySelectorAll('.gb-choice-card').length}})()`);if(!layout.inline||layout.modal||layout.overlap||layout.overflow>1)throw Error(JSON.stringify({width,mode,layout}));await screenshot('board-choice-'+mode+'-'+width);
 if(mode==='fournaise'){
 const furnace=await evaluate(`document.querySelector('.gb-board-choice').textContent.includes('Fournaise')&&document.querySelectorAll('.gb-choice-card').length===2`);if(!furnace)throw Error('Fournaise choices');await evaluate(`document.querySelectorAll('.gb-choice-card > .button')[1].click()`);await wait(1100);const effect=await evaluate(`({inline:!!document.querySelector('.gb-arena .gb-board-effect'),modal:!!document.querySelector('dialog[open]'),dice:document.querySelectorAll('.gb-board-effect .gb-die').length,next:!document.querySelector('.gb-board-effect .button').disabled})`);if(!effect.inline||effect.modal||effect.dice!==2||!effect.next)throw Error(JSON.stringify(effect));await screenshot('board-effect-'+width);await evaluate(`document.querySelector('.gb-board-effect .button').click()`);await wait(300);if(await evaluate(`!!document.querySelector('.gb-board-effect')`))throw Error('Effect did not advance');
 }else{await evaluate(`document.querySelector('.gb-board-choice button.button-primary, .gb-board-choice-options button').click()`);await wait(300);}
 console.log(JSON.stringify({width,mode,layout}));
 }
 await setup('boss');await evaluate(`document.querySelector('.gb-arena .kind-boss').click()`);await wait(1700);const boss=await evaluate(`({inline:!!document.querySelector('.gb-arena .gb-board-boss-draw'),modal:!!document.querySelector('dialog[open]'),ready:!document.querySelector('.gb-board-boss-draw .gb-boss-draw-continue').disabled})`);if(!boss.inline||boss.modal||!boss.ready)throw Error(JSON.stringify(boss));console.log(JSON.stringify({width,boss}));
 }
 if(errors.length)throw Error(errors.join('\n'));
}finally{ws.close()}
