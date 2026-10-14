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


async function setup(combat){await navigate('/');await evaluate(`(async()=>{const e=await import('/src/game/engine.ts');const {CARDS}=await import('/src/game/data.ts');const id=name=>CARDS.find(c=>c.name===name).id;let g=e.newGame('Mage','Humain',42);g.promptQueue=[];g.oaths=[];g.level=10;g.bossPressure=3;g.hand=[id('Providence'),id('Force')];if(`+JSON.stringify(combat)+`){g=e.reduce(g,{t:'challengeBoss',bossId:e.BOSS_IDS[0]});g.promptQueue=[];g.combat.bossHand=g.lootDeck.splice(0,9);g.combat.bossEquip=['Masse Nautile','Gants Nervur\u00e9s','Bottes Longue-Piste'].map(id);g.draws=[];}localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:g}));})()`);await navigate('/solo')}
await call('Runtime.enable');try{for(const [width,height] of [[1920,945],[1366,768],[390,844],[320,568]]){
await viewport(width,height);await setup(true);const layout=await evaluate(`(()=>{const c=document.querySelector('.gb-boss-core > .gb-card-wrap').getBoundingClientRect(),h=document.querySelector('.gb-boss-hand-zone').getBoundingClientRect(),e=document.querySelector('.gb-boss-equipment-zone').getBoundingClientRect(),a=document.querySelector('.gb-arena').getBoundingClientRect(),t=document.querySelector('.gb-table').getBoundingClientRect(),b=document.querySelector('.gb-board').getBoundingClientRect(),en=document.querySelector('.gb-boss-enrage-mobile').getBoundingClientRect();return {cardRect:[c.top,c.bottom],handRect:[h.top,h.bottom],equipmentRect:[e.top,e.bottom],handLeft:h.right<=c.left+1,equipmentRight:e.left>=document.querySelector('.gb-boss-summary').getBoundingClientRect().right-1,arenaHeight:a.height,tableHeight:t.height,boardHeight:b.height,cardWidth:c.width,handAbove:h.bottom<=c.top+1,equipmentBelow:e.top>=c.bottom-1,arenaWidth:a.width,tableWidth:t.width,overflow:document.documentElement.scrollWidth-innerWidth,boardOverlap:e.bottom>b.top+1,enrageInArena:!!document.querySelector('.gb-arena .gb-boss-enrage'),mobileEnrage:en.height>0&&en.top>=0&&en.bottom<innerHeight,tableScroll:document.querySelector('.gb-table').scrollHeight-document.querySelector('.gb-table').clientHeight}})()`);await screenshot('boss-layout-'+width);if(!layout.handLeft||!layout.equipmentRight||layout.overflow>1||layout.boardOverlap||layout.enrageInArena||layout.cardWidth<90||(width>760?layout.arenaWidth<layout.tableWidth*.9:!layout.mobileEnrage))throw Error(JSON.stringify({width,layout}));await screenshot('boss-layout-'+width);console.log(JSON.stringify({width,layout}));
await setup(false);await evaluate(`document.querySelector('.gb-side-boss .kind-boss').click()`);await wait(1800);const reveal=await evaluate(`!!document.querySelector('.gb-arena .gb-board-boss-draw')&&!document.querySelector('dialog[open]')&&!document.querySelector('.gb-board-boss-draw .gb-boss-draw-continue').disabled`);if(!reveal)throw Error('Boss reveal is not inline');await screenshot('boss-reveal-'+width);
}if(errors.length)throw Error(errors.join('\n'));}finally{ws.close()}
