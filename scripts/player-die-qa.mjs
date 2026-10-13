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

const report=[]
await call('Runtime.enable')
try {
  for(const [width,height] of [[1920,945],[390,844],[320,568]]) {
    await viewport(width,height)
    await setup('flee')
    await evaluate(`document.querySelector('.gb-player-die-control').scrollIntoView({block:'center'})`)
    const before=await evaluate(`(()=>{const c=document.querySelector('.gb-player-die-control');return {ready:c.classList.contains('is-ready'),icon:!!c.querySelector('.gb-ready-die-icon'),caption:c.querySelector('.gb-die-invitation')?.textContent,buttonHeight:c.querySelector('button').getBoundingClientRect().height,panel:document.querySelector('.gb-combat-panel').getBoundingClientRect().top,overflow:document.querySelector('.gb-table').scrollWidth-document.querySelector('.gb-table').clientWidth}})()`)
    await screenshot(`player-die-ready-${width}`)
    await evaluate(`document.querySelector('.gb-player-die-button').click()`)
    await wait(200)
    const rolling=await evaluate(`!!document.querySelector('.gb-player-die-control .is-rolling')&&!document.querySelector('.gb-player-die-control.is-ready')&&!document.querySelector('.gb-die-tooltip')`)
    await wait(1300)
    const after=await evaluate(`(()=>{const c=document.querySelector('.gb-player-die-control');return {ready:c.classList.contains('is-ready'),icon:!!c.querySelector('.gb-ready-die-icon'),blocked:c.querySelector('button').disabled,result:c.querySelector('.gb-die-face').textContent,panel:document.querySelector('.gb-combat-panel').getBoundingClientRect().top,fleeBlocked:document.querySelector('.gb-controls .gb-flee-button').disabled}})()`)
    const pass=before.ready&&before.icon&&before.caption==='Lancer'&&before.buttonHeight>=44&&before.overflow===0&&rolling&&!after.ready&&!after.icon&&after.blocked&&Number(after.result)>0&&after.fleeBlocked&&(width<1400||Math.abs(after.panel-before.panel)<1)
    report.push({width,before,rolling,after,pass});if(!pass)errors.push(`Playable die at ${width}`)
    await setup('artifact')
    if(await evaluate(`!!document.querySelector('.gb-player-die-control.is-ready')||!!document.querySelector('.gb-die-invitation')`))errors.push('Idle board advertises a playable die')
  }
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]})
  await setup('flee')
  const reduced=await evaluate(`getComputedStyle(document.querySelector('.gb-player-die-control .gb-die-face')).animationName==='none'&&!!document.querySelector('.gb-die-invitation')`)
  report.push({reducedMotion:reduced});if(!reduced)errors.push('Reduced motion')
  await call('Emulation.setEmulatedMedia',{features:[]})
  console.log(JSON.stringify({report,errors},null,2))
  await fs.writeFile(path.join(output,'player-die-report.json'),JSON.stringify({report,errors},null,2))
} finally { ws.close() }
if(errors.length)process.exitCode=1
