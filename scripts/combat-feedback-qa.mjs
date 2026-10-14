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

const report = []
const check = (name, passed) => { report.push({ name, passed }); if (!passed) errors.push(name) }
async function next() {
  await evaluate(`(async()=>{for(let i=0;i<50;i++){const b=document.querySelector('.gb-combat-resolution .button-primary')??document.querySelector('.gb-effect-presentation .button-primary');if(b&&!b.disabled){b.click();return}await new Promise(r=>setTimeout(r,100))}throw Error('Presentation did not finish')})()`)
  await wait(150)
}
async function setup(mode) {
  await navigate('/')
  await evaluate(`(async()=>{
    const e=await import('/src/game/engine.ts'); const {CARDS}=await import('/src/game/data.ts');
    const id=name=>CARDS.find(c=>c.name===name).id;
    let g=e.newGame('Mage','Elfe',42);g.promptQueue=[];g.level=4;g.oaths=[];
    g.hand=['Force','Chance','Trouvaille'].map(id);
    g.equipment.armors.Plastron=id('Plastron Cœur-de-Dragon');g.equipment.armors.Bottes=id('Bottes Longue-Piste');
    const mode=${JSON.stringify(mode)};
    if(['Gobeur','Tranchebec','Souriant'].includes(mode))g.monsterDeck=[id(mode)];
    if(['flee','harvest','sans-visage','boss'].includes(mode)){
      g.monsterDeck=[id(mode==='sans-visage'?'Sans-Visage':'Tranchebec')];g=e.reduce(g,{t:'fightMonster'});g.draws=[];
      if(mode==='flee'){for(let seed=1;seed<200;seed++){const test=e.reduce({...g,seed},{t:'flee'});if(test.log.some(x=>x.code==='fleeFailed')){g.seed=seed;break}}}
      if(mode==='harvest'){g.equipment.hands=[id('Hache Fétiche à deux mains')];g.combat.playerBonus=100;g.hand=[]}
      if(mode==='sans-visage'){g.combat.playerBonus=100;g.hand=[];for(let seed=1;seed<200;seed++){const test=e.reduce({...g,seed},{t:'resolve'});if(test.log.filter(x=>x.code==='sansVisageRolled').length===2){g.seed=seed;break}}}
      if(mode==='boss'){g.combat=null;g.phase='main';g.level=10;g=e.reduce(g,{t:'challengeBoss',bossId:e.BOSS_IDS[0]});g.promptQueue=[];g.combat.bossHand=['Chance','Malchance'].map(id);g.combat.playerBonus=100;g.combat.playerDie=3;g.combat.playerRoll={sides:6,raw:[2],bonus:1,total:3,mode:'single'};g.combat.playerDieModifier=1}
    }
    if(mode==='suzeraine'){g.level=10;g.lootDeck=[];g=e.reduce(g,{t:'challengeBoss',bossId:id('La Suzeraine')})}
    if(mode==='artifact')g.hand=[CARDS.find(c=>c.type==='Artefact de classe'&&c.requirement.includes('Mage')).id];
    if(mode==='tavern'){const choices=g.lootDeck.splice(0,3);g.retainedMonsters=[id('Vitrail')];g.promptQueue=[{purpose:'tavern',options:choices.map(id=>({id,cardId:id})),optional:true,ctx:{choices,remaining:2}}]}
    g.draws=[];localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:g}));
  })()`)
  await navigate('/solo')
}
await call('Runtime.enable')
try {
  for(const [width,height] of [[1920,945],[390,844],[320,568]]) {
    await viewport(width,height)
    await setup('tavern')
    const choices=await evaluate(`JSON.stringify([...document.querySelectorAll('.gb-tavern-offer .gb-card-wrap')].map(n=>n.dataset.cardId))`)
    check(`tavern-hand-visible-${width}`,await evaluate(`document.querySelectorAll('.gb-hand .gb-card').length===3&&!document.querySelector('.gb-tavern-inventory')`))
    await evaluate(`document.querySelector('.gb-hand .gb-card').click()`)
    await wait(650)
    check(`hand-detail-${width}`,await evaluate(`!!document.querySelector('.card-dialog[open]')`))
    await evaluate(`document.querySelector('.card-dialog .modal-close').click()`)
    check(`tavern-preserved-${width}`,await evaluate(`JSON.stringify([...document.querySelectorAll('.gb-tavern-offer .gb-card-wrap')].map(n=>n.dataset.cardId))===${JSON.stringify(choices)}`))
    await setup('Souriant')
    await evaluate(`document.querySelector('.gb-pile.kind-monster').click()`)
    await wait(2600)
    check(`two-dice-${width}`,await evaluate(`document.querySelectorAll('.gb-effect-presentation .gb-die').length===2`))
    check(`effect-fits-${width}`,await evaluate(`(()=>{const d=document.querySelector('.gb-effect-presentation');return d.scrollHeight-d.clientHeight<2&&d.querySelector('.button-primary').getBoundingClientRect().bottom<innerHeight})()`))
    await screenshot(`souriant-${width}`)
    await next()
    check(`board-two-dice-${width}`,await evaluate(`document.querySelectorAll('.gb-player-die-control .gb-die').length===2&&document.querySelectorAll('.gb-player-die-control .gb-die.is-positive').length===2`))
  }
  await viewport(1920,945)
  await setup('Gobeur')
  await evaluate(`document.querySelector('.gb-pile.kind-monster').click()`)
  await wait(2600)
  check('Gobeur-effect-shown',await evaluate(`document.querySelector('.gb-effect-presentation').textContent.includes('neutraliser')`))
  await next()
  for(let i=0;i<2;i++) { await evaluate(`document.querySelector('.gb-choice-card > .button').click()`); await next() }
  check('Gobeur-neutralized-board',await evaluate(`document.querySelectorAll('.gb-board .is-neutralized').length===2`))
  await screenshot('gobeur-neutralized')
  await setup('Tranchebec')
  await evaluate(`document.querySelector('.gb-pile.kind-monster').click()`)
  await wait(2600)
  check('Tranchebec-die-shown',await evaluate(`document.querySelectorAll('.gb-effect-presentation .gb-die').length===1`))
  await next()
  check('Tranchebec-board-die',await evaluate(`!!document.querySelector('.gb-monster-effect .gb-die')&&document.querySelectorAll('.gb-monster-rewards').length>0`))
  await setup('suzeraine')
  check('Suzeraine-choice',await evaluate(`document.querySelector('.gb-board-choice').textContent.includes('première Action')&&document.querySelectorAll('.gb-board-choice-options button').length===2`))
  await evaluate(`document.querySelectorAll('.gb-board-choice-options button')[1].click()`)
  await next()
  check('Suzeraine-no-auto-bonus',await evaluate(`JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game.combat.bossBonus===0`))
  await setup('artifact')
  check('artifact-red-overlay',await evaluate(`document.querySelector('.gb-hand .gb-card-wrap').classList.contains('is-unavailable')&&document.querySelector('.gb-unavailable-hint').textContent.includes('10')`))
  await evaluate(`document.querySelector('.gb-hand .gb-card').click()`)
  await wait(600)
  check('artifact-explanation',await evaluate(`document.querySelector('.card-dialog .gb-card-use-reason').textContent.includes('10')&&document.querySelector('.card-dialog .button').disabled`))
  await screenshot('artifact-blocked')
  await viewport(320,568)
  await setup('sans-visage')
  await evaluate(`document.querySelector('.gb-controls .button-primary').click()`)
  await wait(3400)
  check('Sans-Visage-first-roll',await evaluate(`document.querySelector('.gb-effect-presentation').textContent.includes('jet 1')`))
  await wait(2000)
  check('Sans-Visage-waits-for-player',await evaluate(`document.querySelector('.gb-effect-presentation').textContent.includes('jet 1')&&!document.querySelector('.gb-draw-flights')`))
  await screenshot('sans-visage-roll')
  await next()
  await wait(1000)
  check('Sans-Visage-terminal-roll',await evaluate(`document.querySelector('.gb-effect-presentation').textContent.includes('jet 2')`))
  await next()
  check('Sans-Visage-loot-after-rolls',await evaluate(`!!document.querySelector('.gb-draw-flights')`))
  await setup('flee')
  await evaluate(`document.querySelector('.gb-controls .gb-flee-button').click()`)
  await wait(550)
  check('flee-die-animation',await evaluate(`!!document.querySelector('.gb-effect-presentation .gb-die.is-rolling')`))
  await next()
  check('flee-failure-step',await evaluate(`document.querySelector('.gb-effect-presentation').textContent.includes('échoue')`))
  await next()
  check('flee-level-loss-step',await evaluate(`document.querySelector('.gb-effect-change').textContent.includes('4 → 3')`))
  await screenshot('flee-level-loss')
  await setup('harvest')
  await evaluate(`document.querySelector('.gb-controls .button-primary').click()`)
  await wait(5200)
  check('Fetish-sacrifice-choice',await evaluate(`document.querySelector('.gb-board-choice').textContent.includes('Sacrifier')`))
  await evaluate(`document.querySelector('.gb-choice-card > .button').click()`)
  check('Fetish-sacrifice-effect',await evaluate(`document.querySelector('.gb-effect-presentation').textContent.includes('sacrifiée')`))
  await viewport(1920,945)
  await setup('boss')
  await evaluate(`document.querySelector('.gb-controls .button-primary').click()`)
  for(let i=0;i<3;i++)await next()
  check('boss-waits-before-verdict',await evaluate(`!!document.querySelector('.gb-controls .button-primary')&&!document.querySelector('.gb-recap-modal')`))
  await evaluate(`document.querySelector('.gb-controls .button-primary').click()`);await next()
  check('final-recap-visible',await evaluate(`!!document.querySelector('.gb-recap-modal')&&document.querySelectorAll('.gb-recap-modal .gb-inventory-grid .gb-card').length>=2`))
  await screenshot('boss-final-recap')
  await evaluate(`document.querySelector('.gb-recap-modal > .button').click()`)
  check('final-board-retained',await evaluate(`!!document.querySelector('.gb-foe .gb-card')&&!!document.querySelector('.gb-opponent-status .gb-die')&&!!document.querySelector('.gb-final-banner')`))
  check('negative-player-die',await evaluate(`!!document.querySelector('.gb-player-die-control .gb-die.is-negative')`))
  await screenshot('boss-final-board')
  await navigate('/solo')
  check('final-board-persists',await evaluate(`!!document.querySelector('.gb-final-banner')&&!!document.querySelector('.gb-foe .gb-card')`))
  for(const [width,height] of [[390,844],[320,568]]) {
    await viewport(width,height)
    await evaluate(`document.querySelector('.gb-final-banner').click()`)
    check(`final-recap-mobile-${width}`,await evaluate(`(()=>{const d=document.querySelector('.gb-recap-modal'),r=d.getBoundingClientRect();return d.scrollHeight-d.clientHeight<2&&Math.abs((r.top+r.bottom)/2-innerHeight/2)<1&&d.querySelector('.button-primary').getBoundingClientRect().bottom<innerHeight})()`))
    await screenshot(`boss-mobile-recap-${width}`)
    await evaluate(`document.querySelector('.gb-recap-modal .modal-close').click()`)
  }
  await fs.writeFile(path.join(output,'combat-feedback-report.json'),JSON.stringify({report,errors},null,2))
  console.log(JSON.stringify({report,errors,output},null,2))
} finally { ws.close() }
if(errors.length)process.exitCode=1
