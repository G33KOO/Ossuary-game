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
  for (const width of [1920,390,320]) {
    await viewport(width,width===1920?945:844)
    await navigate('/')
    await evaluate(`(async()=>{const e=await import('/src/game/engine.ts'),{CARDS}=await import('/src/game/data.ts');let g=e.newGame('Mage','Humain',42);g.promptQueue=[];g.oaths=[];g.draws=[];g.hand=[CARDS.find(c=>c.name==='Trouvaille').id];localStorage.setItem('ossuaire-locale','fr');localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:g}));})()`)
    await navigate('/solo')
    const pile=await evaluate(`(()=>{const images=[...document.querySelectorAll('.gb-side-right .gb-back img')];return images.length===3&&images.every(i=>i.complete&&i.naturalWidth===900&&getComputedStyle(i).objectFit==='contain')})()`)
    if(!pile)throw Error('Missing complete loot deck illustration')
    await screenshot('card-backs-board-'+width)
    await evaluate("document.querySelector('.gb-side-right .gb-pile').click()")
    await wait(350)
    const flight=await evaluate("!!document.querySelector('.gb-draw-flight-back .kind-loot.has-illustration img')")
    if(!flight)throw Error('Missing animated loot back')
    await wait(2300)
    await evaluate("document.querySelector('.gb-hand .gb-card').click()")
    await wait(650)
    await evaluate("document.querySelectorAll('.card-face-switch button')[1].click()")
    const detail=await evaluate(`(()=>{const d=document.querySelector('.card-dialog'),i=d.querySelector('.dialog-art'),r=d.getBoundingClientRect(),buttons=[...d.querySelectorAll('.dialog-actions .button')];return {back:i?.src.includes('/card-backs/butin.webp'),noBadges:!d.querySelector('.dialog-power-badge,.dialog-class-badge'),fits:d.scrollHeight-d.clientHeight<2&&r.left>=0&&r.right<=innerWidth,actions:buttons.length>0&&buttons.every(b=>b.getBoundingClientRect().bottom<innerHeight)}})()`)
    if(!detail.back||!detail.noBadges||!detail.fits||!detail.actions)throw Error(JSON.stringify({width,detail}))
    await screenshot('card-back-detail-'+width)
    await evaluate("document.querySelector('.card-dialog .modal-close').click()")
    await navigate('/cartes?type=Arme')
    await evaluate("document.querySelector('.lore-card').click()")
    await wait(650)
    await evaluate("document.querySelectorAll('.card-face-switch button')[1].click()")
    if(!await evaluate("document.querySelector('.dialog-art').src.includes('/card-backs/butin.webp')"))throw Error('Catalogue back missing')
    await screenshot('card-back-catalog-'+width)
    await evaluate("document.querySelector('.card-dialog .modal-close').click()")
    for(const [type,kind,art] of [['Monstre','monster','monstre'],['Boss','boss',null],['Classe','class','classe']]){
      await navigate('/cartes?type='+type)
      await evaluate("document.querySelector('.lore-card').click()")
      await wait(650)
      await evaluate("document.querySelectorAll('.card-face-switch button')[1].click()")
      if(!await evaluate(art?`document.querySelector('.dialog-art').src.includes('/card-backs/${art}.webp')`:`!!document.querySelector('.dialog-back-preview .gb-back.kind-${kind}')`))throw Error('Wrong deck back '+kind)
      await evaluate("document.querySelector('.card-dialog .modal-close').click()")
    }
    await navigate('/')
    await evaluate(`(async()=>{const e=await import('/src/game/engine.ts'),{CARDS}=await import('/src/game/data.ts');let g=e.newGame('Mage','Humain',42);g.promptQueue=[];g.oaths=[];g.draws=[];g.monsterDeck.unshift(CARDS.find(c=>c.name==='Balancier').id);localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:g}));})()`)
    await navigate('/solo')
    if(!await evaluate("document.querySelectorAll('.gb-side-left .gb-back.has-illustration img').length===3"))throw Error('Monster deck back missing')
    await evaluate("document.querySelector('.gb-side-left .gb-pile').click()")
    await wait(350)
    if(!await evaluate("document.querySelector('.gb-draw-flight-back .kind-monster img')?.src.includes('/card-backs/monstre.webp')"))throw Error('Monster flight back missing')
    await screenshot('monster-back-flight-'+width)
    await wait(2300)
    await evaluate("document.querySelector('.gb-foe .gb-card').click()")
    await wait(650)
    await evaluate("document.querySelectorAll('.card-face-switch button')[1].click()")
    if(!await evaluate("document.querySelector('.dialog-art').src.includes('/card-backs/monstre.webp')"))throw Error('Solo monster back missing')
    await screenshot('monster-card-back-'+width)
    await evaluate("document.querySelector('.card-dialog .modal-close').click()")
    await navigate('/')
    await evaluate(`(async()=>{const e=await import('/src/game/engine.ts');let g=e.newGame('Mage','Humain',42);g.promptQueue=[];g.oaths=[];g.level=10;g=e.reduce(g,{t:'challengeBoss',bossId:e.BOSS_IDS[0]});g.promptQueue=[];g.draws=[];g.combat.bossHand=g.lootDeck.splice(0,4);localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:g}));})()`)
    await navigate('/solo')
    const boss=await evaluate("document.querySelectorAll('.gb-boss-hand-zone .gb-back.kind-loot.has-illustration img').length===4")
    if(!boss)throw Error('Boss hand must use Loot backs')
    await evaluate("document.querySelector('.gb-native-group .gb-card.type-classe').click()")
    await wait(650)
    await evaluate("document.querySelectorAll('.card-face-switch button')[1].click()")
    const classBack=await evaluate("document.querySelector('.dialog-art').src.includes('/card-backs/classe.webp')")
    if(!classBack)throw Error('Solo class back missing')
    await screenshot('class-card-back-'+width)
    await evaluate("document.querySelector('.card-dialog .modal-close').click()")
    console.log(JSON.stringify({width,pile,flight,detail,boss,classBack}))
  }
  if(errors.length)throw Error(errors.join('\n'))
} finally {ws.close()}
