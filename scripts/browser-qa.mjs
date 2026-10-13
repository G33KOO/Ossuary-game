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
async function fixture(mode = 'combat') {
  await navigate('/')
  await evaluate(`(async()=>{
    const e=await import('/src/game/engine.ts'); const {CARDS}=await import('/src/game/data.ts');
    let g=e.newGame('Mage','Revenant',42); g.promptQueue=[]; g.level=10;
    g=e.reduce(g,{t:'challengeBoss',bossId:e.BOSS_IDS[0]}); g.promptQueue=[]; g.draws=[];
    g.oaths=['OSS-CARD-232','OSS-CARD-234']; g.completedOaths=g.oaths;
    for(const slot of Object.keys(g.equipment.armors)) g.equipment.armors[slot]=CARDS.find(c=>c.type==='Armure'&&c.subtype===slot).id;
    g.equipment.extraArmor={slot:'Plastron',id:'OSS-CARD-014'};
    g.equipment.hands=['OSS-CARD-061','OSS-CARD-062']; g.equipment.artifact='OSS-CARD-085';
    g.hand=[CARDS.find(c=>c.name==='Trouvaille').id,'OSS-CARD-090','OSS-CARD-092','OSS-CARD-094','OSS-CARD-120','OSS-CARD-129'];
    g.lootDeck=g.lootDeck.filter(id=>!g.hand.includes(id));
    if('${mode}'==='monsters'){g.combat.kind='monster';g.combat.bossId=null;g.combat.monsters=CARDS.filter(c=>c.type==='Monstre').sort((a,b)=>(b.text?.length??0)-(a.text?.length??0)).slice(0,3).map(c=>c.id)}
    if('${mode}'==='idle'||'${mode}'==='tavern'){g.combat=null;g.phase='main'}
    if('${mode}'==='tavern'){const choices=g.lootDeck.splice(0,3);g.promptQueue=[{purpose:'tavern',options:choices.map(id=>({id,cardId:id})),optional:true,ctx:{choices}}]}
    localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:g}));
  })()`)
  await navigate('/solo')
}

const report = []
await call('Runtime.enable')
try {
  for (const [width, height] of [[1920,945],[1280,800],[390,844],[320,568]]) {
    await viewport(width,height)
    for (const route of ['/', '/mecaniques', '/cartes']) {
      await navigate(route)
      const overflow = await evaluate('document.documentElement.scrollWidth-innerWidth')
      report.push({ width,height,route,overflow })
      await screenshot(`${width}-${height}-${route.replaceAll('/','')||'home'}`)
    }
  }
  for (const height of [1080,945,900]) {
    await viewport(1920,height)
    const positions = []
    for (const mode of ['combat','monsters','idle']) {
      await fixture(mode)
      const geometry = await evaluate(`(()=>{const t=document.querySelector('.gb-table'),p=document.querySelector('.gb-combat-panel').getBoundingClientRect(),b=document.querySelector('.gb-board').getBoundingClientRect();return {panelY:p.y,boardY:b.y,gap:b.top-p.bottom,scroll:t.scrollHeight-t.clientHeight,overlap:[...document.querySelectorAll('.gb-foe .gb-card,.gb-monster-effect,.gb-idle,.gb-side .gb-discard')].some(n=>n.getBoundingClientRect().bottom>p.top),handClipped:[...document.querySelectorAll('.gb-hand .gb-card')].some(n=>n.getBoundingClientRect().bottom>innerHeight)}})()`)
      positions.push(geometry.panelY)
      report.push({height,mode,...geometry})
      await screenshot(`desktop-${height}-${mode}`)
    }
    if (Math.max(...positions)-Math.min(...positions)>1) errors.push(`Combat panel moves at height ${height}`)
  }
  for (const [width,height] of [[390,844],[320,568]]) {
    await viewport(width,height)
    await fixture('idle')
    await evaluate(`document.querySelector('.gb-mobile-nav button:last-child').click()`)
    report.push({width,height,information:await evaluate(`({open:!!document.querySelector('.gb-information-modal[open]'),timelineVisible:getComputedStyle(document.querySelector('.gb-information-modal .gb-level-timeline')).display!=='none'})`)})
    await screenshot(`mobile-${width}-information`)
    await evaluate(`document.querySelectorAll('.gb-information-modal .gb-level-node')[4].click()`)
    report.push({width,height,timelineTooltip:await evaluate(`!!document.querySelector('.gb-information-modal .gb-timeline-tooltip')`)})
    await evaluate(`document.querySelector('.gb-information-modal .modal-close').click()`)
    // Playable Actions must retain a visible action in their mobile detail dialog.
    await evaluate(`document.querySelector('.gb-hand .gb-card').click()`)
    await wait(650)
    report.push({width,height,details:await evaluate(`(()=>{const d=document.querySelector('.card-dialog'),a=d.querySelector('.dialog-actions .button');return {overflow:d.scrollHeight-d.clientHeight,actionVisible:!!a&&a.getBoundingClientRect().bottom<innerHeight}})()`)})
    await screenshot(`mobile-${width}-details`)
    const handBefore = await evaluate(`JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game.hand.length`)
    await evaluate(`document.querySelector('.card-dialog .dialog-actions .button').click()`)
    await wait(400)
    report.push({width,height,playedFromDetails:await evaluate(`!document.querySelector('.card-dialog')&&JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game.hand.length===${handBefore}+1`)})
    await fixture('tavern')
    report.push({width,height,tavern:await evaluate(`(()=>{const d=document.querySelector('.app-modal[open]'),r=d.getBoundingClientRect();return {centerError:Math.abs((r.top+r.bottom)/2-innerHeight/2),width:r.width,overflow:d.scrollHeight-d.clientHeight}})()`)})
    await screenshot(`mobile-${width}-tavern`)
    await evaluate(`document.querySelector('.sim-pick > .button').click()`)
    await evaluate(`document.querySelector('.app-modal > button.button').click()`)
    report.push({width,height,tavernReturned:await evaluate(`document.querySelectorAll('.app-modal .sim-pick').length===3`)})
  }
  const cards=JSON.parse(await fs.readFile('src/data/cards.json','utf8'))
  const longest=[...new Set(cards.map(card=>card.type))].map(type=>cards.filter(card=>card.type===type).sort((a,b)=>(b.text?.length??0)+(b.requirement?.length??0)-(a.text?.length??0)-(a.requirement?.length??0))[0])
  await viewport(320,568)
  for(const card of longest){
    await navigate('/cartes?q='+card.id)
    await evaluate(`document.querySelector('.lore-card').click()`)
    await wait(600)
    report.push({card:card.id,type:card.type,detailOverflow:await evaluate(`(()=>{const d=document.querySelector('.card-dialog');return d.scrollHeight-d.clientHeight})()`)})
    await screenshot('detail-'+card.type.replaceAll(' ','-'))
    await evaluate(`document.querySelector('.card-dialog .modal-close').click()`)
  }
  await viewport(1920,945)
  await fixture('idle')
  let before=await evaluate(`JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game.hand.length`)
  await evaluate(`(()=>{window.qaTransfer=new DataTransfer();document.querySelector('.gb-hand .gb-card-wrap').dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:window.qaTransfer}))})()`)
  await wait(150)
  await evaluate(`(()=>{const target=document.querySelector('.gb-arena');target.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:window.qaTransfer}));target.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:window.qaTransfer}))})()`)
  await wait(400)
  report.push({dragPlay:await evaluate(`JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game.hand.length===${before}+1`)})
  await fixture('tavern')
  const offered=await evaluate(`document.querySelector('.sim-pick .gb-card-wrap').dataset.cardId`)
  await evaluate(`(()=>{window.qaTransfer=new DataTransfer();document.querySelector('.gb-tavern-hand .gb-card-wrap').dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:window.qaTransfer}))})()`)
  await wait(150)
  await evaluate(`(()=>{const target=document.querySelector('.sim-pick');target.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:window.qaTransfer}));target.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:window.qaTransfer}))})()`)
  await wait(400)
  report.push({dragTrade:await evaluate(`!document.querySelector('.gb-tavern-modal')&&JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game.hand.includes(${JSON.stringify(offered)})`)})
  await navigate('/cartes?q=OSS-CARD-007')
  await evaluate(`document.querySelector('.lore-card').click()`)
  await wait(600)
  const previousArt=await evaluate(`document.querySelector('.dialog-art').src`)
  await evaluate(`document.querySelector('.variant-switch button[aria-pressed="false"]').click()`)
  report.push({genderSwitch:await evaluate(`document.querySelector('.dialog-art').src!==${JSON.stringify(previousArt)}`)})
  const tilt=await evaluate(`(()=>{const r=document.querySelector('.dialog-tilt-card').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`)
  await call('Input.dispatchMouseEvent',{type:'mousePressed',x:tilt.x,y:tilt.y,button:'left',clickCount:1})
  await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:tilt.x+30,y:tilt.y+25,button:'left',buttons:1})
  await wait(100)
  report.push({tiltWorks:await evaluate(`(()=>{const s=document.querySelector('.dialog-tilt-card').style;const x=parseFloat(s.getPropertyValue('--tilt-x')),y=parseFloat(s.getPropertyValue('--tilt-y'));return (x!==0||y!==0)&&Math.abs(x)<=12&&Math.abs(y)<=12})()`)})
  await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:tilt.x+30,y:tilt.y+25,button:'left',clickCount:1})
  await wait(150)
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
  await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
  await wait(150)
  report.push({keyboardClose:await evaluate(`!document.querySelector('.card-dialog')`)})
  await viewport(320,568)
  await fixture('monsters')
  await navigate('/')
  await evaluate(`(async()=>{const {CARDS}=await import('/src/game/data.ts');const s=JSON.parse(localStorage.getItem('ossuaire.solo.v1'));s.game.combat.monsters=['Reliquaire','Céramid'].map(name=>CARDS.find(c=>c.name===name).id);s.game.combat.playerBonus=100;s.game.combat.monsterBonus=0;s.game.combat.bossBonus=0;s.game.combat.flags=[];s.game.monsterDeck.unshift(CARDS.find(c=>c.name==='Tranchebec').id);localStorage.setItem('ossuaire.solo.v1',JSON.stringify(s))})()`)
  await navigate('/solo')
  await evaluate(`document.querySelector('.gb-controls .button-primary').click()`)
  await wait(1700)
  for(let i=0;i<2;i++) { await evaluate("document.querySelector('.gb-effect-presentation .button-primary').click()"); await wait(150) }
  await wait(1800)
  report.push({rewardCardsFit:await evaluate(`(()=>{const cards=[...document.querySelectorAll('.gb-reveal .gb-card')];return cards.length===5&&cards.every(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})})()`)})
  await screenshot('mobile-five-rewards')
  await wait(4000)
  report.push({chainedMonsterAnimated:await evaluate(`!!document.querySelector('.gb-reveal .gb-reveal-card.from-monster')&&document.querySelectorAll('.gb-foe .gb-card').length===0`)})
  await wait(2300)
  report.push({chainedMonsterShownAfter:await evaluate(`document.querySelectorAll('.gb-foe .gb-card').length===1`)})
  for (const entry of report) {
    if (entry.route && entry.overflow>1) errors.push(`Page overflow: ${entry.route} at ${entry.width}`)
    if (entry.mode && (entry.scroll>1 || entry.overlap || entry.handClipped)) errors.push(`Board geometry: ${entry.mode} at ${entry.height}`)
    if (entry.details && (entry.details.overflow>1 || !entry.details.actionVisible)) errors.push(`Mobile detail: ${entry.width}`)
    if (entry.tavern && entry.tavern.centerError>1) errors.push(`Tavern centering: ${entry.width}`)
    if (entry.tavernReturned===false) errors.push(`Tavern return: ${entry.width}`)
    if (entry.playedFromDetails===false) errors.push(`Play from detail: ${entry.width}`)
    if (entry.timelineTooltip===false) errors.push(`Timeline tooltip: ${entry.width}`)
    if (entry.detailOverflow>1) errors.push(`Long card details: ${entry.card}`)
    for(const key of ['dragPlay','dragTrade','genderSwitch','tiltWorks','keyboardClose','rewardCardsFit','chainedMonsterAnimated','chainedMonsterShownAfter']) if(entry[key]===false) errors.push(key)
  }
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify({report,errors},null,2))
  console.log(JSON.stringify({report,errors,output},null,2))
} finally { ws.close() }
if (errors.length) process.exitCode=1
