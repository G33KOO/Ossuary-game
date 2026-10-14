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



async function setup(){await navigate('/');return await evaluate(`(async()=>{const e=await import('/src/game/engine.ts');const {CARDS,ARMOR_SLOTS,printedPower}=await import('/src/game/data.ts');const id=n=>CARDS.find(c=>c.name===n).id;let g=e.newGame('Mage','Humain',42);g.promptQueue=[];g.oaths=[];g.level=10;g.lootDeck=[];g.hand=['Force','Trouvaille'].map(id);for(const slot of ARMOR_SLOTS)g.equipment.armors[slot]=CARDS.find(c=>c.type==='Armure'&&c.subtype===slot&&printedPower(c.id)===1).id;const strongest=CARDS.filter(c=>c.type==='Armure').sort((a,b)=>printedPower(b.id)-printedPower(a.id))[0];g.equipment.armors[strongest.subtype]=strongest.id;g=e.reduce(g,{t:'challengeBoss',bossId:id('L\u2019Envers')});g.draws=[];localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:g}));return {target:strongest.id,power:printedPower(strongest.id)};})()`)}
await call('Runtime.enable');try{for(const width of [1920,390,320]){await viewport(width,width===1920?945:844);const expected=await setup();await navigate('/solo');const result=await evaluate(`(()=>{const t=document.querySelector('.gb-envers-target'),r=document.querySelector('.gb-envers-response'),a=t.getBoundingClientRect(),b=r.getBoundingClientRect();return {target:t.querySelector('[data-card-id]').dataset.cardId,optionIds:[...r.querySelectorAll('.gb-choice-card [data-card-id]')].map(c=>c.dataset.cardId),equipmentHighlighted:!!document.querySelector('.gb-board .gb-envers-threat'),overlap:a.right>b.left+1,overflow:document.documentElement.scrollWidth-innerWidth,discard:[...r.querySelectorAll('.gb-choice-card >button')].every(b=>b.textContent==='D\u00e9fausser')}})()`);if(result.target!==expected.target||result.optionIds.includes(expected.target)||!result.equipmentHighlighted||result.overlap||result.overflow>1||!result.discard)throw Error(JSON.stringify({width,result}));await screenshot('envers-target-'+width);await evaluate(`document.querySelector('.gb-choice-card > button').click()`);await wait(650);let g=await evaluate(`JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game`);if(g.combat.stolenArmor!==null||g.hand.length!==1)throw Error('Protection failed');await setup();await navigate('/solo');await evaluate(`document.querySelector('.gb-board-choice-options > button').click()`);await wait(650);g=await evaluate(`JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game`);if(g.combat.stolenArmor!==expected.target||g.combat.bossBonus!==expected.power)throw Error('Wrong armor stolen');console.log(JSON.stringify({width,selectedAutomatically:true,targetVisible:true,protect:true,yield:true}));}if(errors.length)throw Error(errors.join('\n'));}finally{ws.close()}
