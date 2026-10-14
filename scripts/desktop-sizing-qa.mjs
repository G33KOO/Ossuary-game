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




await call('Runtime.enable');try{for(const height of [945,900,1080]){await viewport(1920,height);for(const mode of ['adventure','monster','boss','end-turn']){await navigate('/');await evaluate("(async()=>{const e=await import('/src/game/engine.ts');const {CARDS}=await import('/src/game/data.ts');const id=n=>CARDS.find(c=>c.name===n).id;const mode="+JSON.stringify(mode)+";let g=e.newGame('Mage','Humain',42);g.promptQueue=[];g.level=10;g.oaths=CARDS.filter(c=>c.type==='Serment').slice(0,2).map(c=>c.id);g.equipment.armors={Plastron:id('Plastron Cœur-de-Dragon'),Bottes:id('Bottes Longue-Piste'),Gants:id('Gants Nervurés'),Casque:id('Casque Bois-Cornu')};g.equipment.hands=['Baguette Runique','Orbe Astral'].map(id);g.equipment.artifact=id('Astrolabe des Arcanes');g.equipment.extraArmor={slot:'Plastron',id:CARDS.find(c=>c.type==='Armure'&&c.subtype==='Plastron'&&c.id!==g.equipment.armors.Plastron).id};if(mode==='monster'){g.monsterDeck.unshift(id('Fouisseur'));g=e.reduce(g,{t:'fightMonster'});g.promptQueue=[];}if(mode==='boss'){g=e.reduce(g,{t:'challengeBoss',bossId:e.BOSS_IDS[0]});g.promptQueue=[];g.combat.bossHand=g.lootDeck.splice(0,9);g.combat.bossEquip=['Masse Nautile','Gants Nervurés','Bottes Longue-Piste'].map(id)}if(mode==='end-turn')g.endTurnPending=true;g.hand=['Providence','Force','Chance','Masse Nautile','Baguette Brasier','Cupidité'].map(id);g.draws=[];localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:g}));})()");await navigate('/solo');const geometry=await evaluate("(()=>{const r=s=>document.querySelector(s).getBoundingClientRect();const table=document.querySelector('.gb-table');const board=r('.gb-board');const hand=r('.gb-hand');const level=r('.gb-level');const native=r('.gb-native-group');const power=r('.gb-hero-power');const die=r('.gb-player-die-control');const equip=r('.gb-equipment-group');const stage=document.querySelector('.gb-stage-actions')?.getBoundingClientRect();const foe=document.querySelector('.gb-boss-core > .gb-card-wrap,.gb-monster-encounter .gb-card-wrap')?.getBoundingClientRect();return {scroll:table.scrollHeight-table.clientHeight,overflow:document.documentElement.scrollWidth-innerWidth,handWidth:document.querySelector('.gb-hand .gb-card-wrap').getBoundingClientRect().width,boardBottom:board.bottom,handTop:hand.top,foeBottom:foe?.bottom,stageTop:stage?.top,stageLeft:stage?.left,foeRight:foe?.right,levelCenter:Math.abs((level.left+level.right)/2-(native.left+native.right)/2),powerCenter:Math.abs((power.left+die.right)/2-(equip.left+equip.right)/2)}})()");await screenshot('desktop-sizing-'+height+'-'+mode);if(geometry.scroll>2||geometry.overflow>1||geometry.boardBottom>geometry.handTop||geometry.levelCenter>2||geometry.powerCenter>3||(geometry.foeRight>geometry.stageLeft&&geometry.foeBottom>geometry.stageTop+2))throw Error(JSON.stringify({height,mode,geometry}));await evaluate("document.querySelector('.gb-hand .gb-card').focus()");await wait(250);const hover=await evaluate("(()=>{const b=document.querySelector('.gb-board').getBoundingClientRect();const cards=[...document.querySelectorAll('.gb-hand .gb-card')].map(c=>c.getBoundingClientRect());return {minTop:Math.min(...cards.map(r=>r.top)),maxBottom:Math.max(...cards.map(r=>r.bottom)),boardBottom:b.bottom}})()");if(hover.minTop<hover.boardBottom||hover.maxBottom>height+2)throw Error(JSON.stringify({height,mode,hover}));console.log(JSON.stringify({height,mode,geometry}));}}if(errors.length)throw Error(errors.join('\n'));}finally{ws.close()}
