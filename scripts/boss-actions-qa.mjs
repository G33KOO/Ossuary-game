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



async function setup(mode){await navigate('/');await evaluate(`(async()=>{const e=await import('/src/game/engine.ts');const {CARDS}=await import('/src/game/data.ts');const id=n=>CARDS.find(c=>c.name===n).id;let g=e.newGame('Mage','Humain',42);g.promptQueue=[];g.oaths=[];g.level=10;g.bossPressure=2;g.bossEnrageArmed=true;g=e.reduce(g,{t:'challengeBoss',bossId:e.BOSS_IDS[0]});g.promptQueue=[];g.draws=[];g.hand=[];g.combat.bossBonus=0;g.combat.bossPlayedCards=[];g.combat.bossEquip=[];const mode=`+JSON.stringify(mode)+`;if(mode==='sequence'){g.hand=['Faiblesse','Chance'].map(id);g.combat.playerDie=3;g.combat.bossHand=['Force','Chance','Malchance'].map(id)}else if(mode==='counter'){g.hand=[id('Faiblesse')];g.combat.bossHand=[id('Contre-sort')]}else {g.combat.bossHand=[id('Peur')];if(mode==='player-counter')g.hand=[id('Contre-sort')]}localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:g}));})()`);await navigate('/solo')}
async function next(){await evaluate(`(async()=>{for(let i=0;i<60;i++){const b=document.querySelector('.gb-effect-presentation .button-primary');if(b&&!b.disabled){b.click();return}await new Promise(r=>setTimeout(r,100))}throw Error('Missing effect continuation')})()`);await wait(150)}
async function state(){await wait(350);return evaluate(`JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game`)}
async function playFirst(){await evaluate(`document.querySelector('.gb-hand .gb-card').click()`);await wait(650);await evaluate(`document.querySelector('.dialog-actions .button').click()`);await wait(2000)}
await call('Runtime.enable');try{for(const width of [1920,390]){await viewport(width,width===1920?945:844);
await setup('sequence');await evaluate(`document.querySelector('.gb-controls > button:not(.gb-flee-button)').click()`);let g=await state();if(g.combat.bossDie!==null||g.combat.bossBonus!==2)throw Error('Boost did not precede roll');await next();g=await state();if(g.combat.bossDie===null)throw Error('Boss roll missing');await next();await next();await next();g=await state();if(g.phase!=='combat'||!g.combat.bossReady)throw Error('Verdict was not paused');await screenshot('boss-response-window-'+width);await playFirst();g=await state();if(g.phase!=='combat'||g.combat.monsterBonus!==-2)throw Error('Player action after Boss roll unavailable');await evaluate(`document.querySelector('.gb-controls > button:not(.gb-flee-button)').click()`);await wait(250);if(!await evaluate(`!document.querySelector('.gb-controls > button:not(.gb-flee-button)').disabled`))throw Error('Ready step left controls locked');
await setup('counter');await playFirst();g=await state();if(g.combat.monsterBonus!==0||!g.log.some(e=>e.code==='actionCancelled')||!await evaluate(`!!document.querySelector('.gb-effect-presentation.effect-cancelled')`))throw Error('Automatic Counterspell missing');await screenshot('boss-counterspell-'+width);await next();
await setup('fear');await evaluate(`document.querySelector('.gb-controls > button:not(.gb-flee-button)').click()`);await next();await screenshot('boss-fear-'+width);await next();g=await state();if(g.combat||g.phase!=='main'||g.level!==10||!g.endTurnPending)throw Error('Fear did not return to preparation');await evaluate(`document.querySelector('.gb-stage-actions .button-primary').click()`);g=await state();if(g.bossPressure!==3)throw Error('Fear did not prolong enrage');
await setup('player-counter');await evaluate(`document.querySelector('.gb-controls > button:not(.gb-flee-button)').click()`);await wait(350);if(!await evaluate(`!!document.querySelector('.gb-counter-response')&&!!document.querySelector('.gb-hand .is-playable')`))throw Error('Player response missing');await wait(2500);g=await state();if(!g.combat||g.promptQueue[0]?.purpose!=='boss-counter')throw Error('Counter window expired');await screenshot('boss-counter-response-'+width);await playFirst();g=await state();if(!g.combat||!g.log.some(e=>e.code==='playerCounter'))throw Error('Player could not counter Fear');await next();console.log(JSON.stringify({width,sequence:true,automaticCounter:true,fear:true,playerCounter:true}));
}if(errors.length)throw Error(errors.join('\n'));}finally{ws.close()}
