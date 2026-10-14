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

await call('Runtime.enable')
try {
  for (const [width,height] of [[1920,945],[1920,900],[390,844],[320,568]]) {
    await viewport(width,height)
    for (const mode of ['victory','defeat','boss']) {
      await navigate('/')
      await evaluate(`(async()=>{
        const e=await import('/src/game/engine.ts'),{CARDS,ARMOR_SLOTS}=await import('/src/game/data.ts');
        let g=e.newGame('Mage','Humain',42);g.promptQueue=[];g.oaths=CARDS.filter(c=>c.type==='Serment').slice(0,2).map(c=>c.id);
        for(const slot of ARMOR_SLOTS)g.equipment.armors[slot]=CARDS.find(c=>c.type==='Armure'&&c.subtype===slot).id;
        g.equipment.hands=CARDS.filter(c=>c.type==='Arme'&&!c.tags?.includes('deux mains')).slice(0,2).map(c=>c.id);
        g.equipment.extraArmor={slot:'Plastron',id:CARDS.find(c=>c.type==='Armure'&&c.subtype==='Plastron'&&c.id!==g.equipment.armors.Plastron).id};
        g.level=10;g.monsterDeck.unshift(CARDS.find(c=>c.name==='Balancier').id);
        g=e.reduce(g,${JSON.stringify(mode)}==='boss'?{t:'challengeBoss',bossId:e.BOSS_IDS[0]}:{t:'fightMonster'});
        g.promptQueue=[];g.draws=[];g.combat.playerDie=3;g.combat.playerBonus=${JSON.stringify(mode)}==='defeat'?-100:100;
        if(g.combat.kind==='boss'){g.combat.bossReady=true;g.combat.bossHand=[];g.combat.bossDie=2;}
        localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:g}));
      })()`)
      await navigate('/solo')
      await evaluate("document.querySelector('.gb-controls > button:not(.gb-flee-button)').click()")
      await wait(350)
      const inspect=()=>evaluate(`(()=>{const e=document.querySelector('.gb-combat-resolution'),b=document.querySelector('.gb-board').getBoundingClientRect(),r=e?.getBoundingClientRect(),t=document.querySelector('.gb-table');if(!r)return null;return {beat:e.dataset.beat,above:r.bottom<=b.top+1,gap:b.top-r.bottom,center:Math.abs((r.left+r.right-b.left-b.right)/2),scroll:t.scrollHeight-t.clientHeight,overflow:document.documentElement.scrollWidth-innerWidth,visible:r.top>=t.getBoundingClientRect().top&&r.top< t.getBoundingClientRect().bottom,copyFits:[...e.children].every(c=>c.getBoundingClientRect().right<=r.right+1)}})()`)
      const initial=await inspect()
      await screenshot('resolution-band-'+width+'-'+height+'-'+mode)
      if(!initial?.above||initial.gap>12||initial.center>2||initial.overflow>1||!initial.copyFits||(width===1920&&initial.scroll>2)||(width<760&&!initial.visible))throw Error(JSON.stringify({width,height,mode,initial}))
      if(mode==='defeat'){
        await wait(2400)
        const final=await inspect()
        if(final?.beat!=='result'||!final.above||!final.copyFits)throw Error(JSON.stringify({width,final}))
        await screenshot('resolution-consequence-'+width+'-'+height)
      }
      console.log(JSON.stringify({width,height,mode,initial}))
    }
  }
  if(errors.length)throw Error(errors.join('\n'))
}finally{ws.close()}
