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




const rect = selector => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});return e?.getBoundingClientRect().toJSON()})()`)
await call('Runtime.enable')
try {
  for (const width of [1920, 390]) {
    await viewport(width, width === 1920 ? 945 : 844)
    for (const name of ['Balancier', 'Fouisseur', 'Gobeur', 'Tranchebec', 'Sans-Visage']) {
      await navigate('/')
      const id = await evaluate(`(async()=>{
        const e=await import('/src/game/engine.ts'),{CARDS}=await import('/src/game/data.ts');
        const c=CARDS.find(c=>c.name===${JSON.stringify(name)});
        if(!c)return null;
        let g=e.newGame('Mage','Humain',42);g.promptQueue=[];g.oaths=[];g.draws=[];
        g.equipment.armors={Bottes:CARDS.find(c=>c.type==='Armure'&&c.subtype==='Bottes').id};
        g.monsterDeck=g.monsterDeck.filter(id=>id!==c.id);g.monsterDeck.unshift(c.id);
        localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:g}));return c.id;
      })()`)
      if (!id) throw Error('Unknown monster '+name)
      await navigate('/solo')
      const source = await rect('.gb-side-left .gb-pile-stack .gb-back:nth-child(3)')
      await evaluate("document.querySelector('.gb-side-left .gb-pile').click()")
      await wait(350)
      const during = await evaluate(`(()=>{
        const f=document.querySelector('.gb-draw-flight'),a=f?.getAnimations()[0];
        const c=document.querySelector('.gb-combat-context [data-card-id="${id}"], .gb-foe [data-card-id="${id}"]');
        return {target:c?.getBoundingClientRect().toJSON(),left:parseFloat(f?.style.left),top:parseFloat(f?.style.top),width:parseFloat(f?.style.getPropertyValue('--flight-width')),first:a?.effect.getKeyframes()[0].transform,hidden:c&&getComputedStyle(c.closest('.gb-monster-encounter')??c).opacity==='0'||c&&getComputedStyle(c).visibility==='hidden'};
      })()`)
      if (!during.target || Math.abs(during.left-during.target.left)>1 || Math.abs(during.top-during.target.top)>1 || Math.abs(during.width-during.target.width)>1 || !during.hidden) throw Error(JSON.stringify({width,name,during}))
      const translations=during.first.match(/translate\(([-\d.]+)px, ([-\d.]+)px\)/)
      if(!translations || Math.abs(during.left+Number(translations[1])-source.left)>1 || Math.abs(during.top+Number(translations[2])-source.top)>1)throw Error('Wrong draw origin')
      await screenshot('monster-flight-'+width+'-'+name.replaceAll(' ','-'))
      await wait(2100)
      const final=await rect('.gb-combat-context [data-card-id="'+id+'"], .gb-foe [data-card-id="'+id+'"]')
      if(!final || Math.abs(final.left-during.left)>1 || Math.abs(final.top-during.top)>1 || Math.abs(final.width-during.width)>1)throw Error(JSON.stringify({width,name,during,final}))
      if(width===1920){const after=await rect('.gb-side-left .gb-pile-stack .gb-back:nth-child(3)');if(Math.abs(after.width-source.width)>1||Math.abs(after.left-source.left)>1)throw Error(JSON.stringify({source,after}))}
      await screenshot('monster-landed-'+width+'-'+name.replaceAll(' ','-'))
      console.log(JSON.stringify({width,name,accurateOrigin:true,stableLanding:true,stableDeck:width===1920 ? true : undefined}))
    }
  }
  for (const width of [1920, 390]) {
    await viewport(width, width === 1920 ? 945 : 844)
    await navigate('/')
    await evaluate(`(async()=>{const e=await import('/src/game/engine.ts'),{CARDS}=await import('/src/game/data.ts');const g=e.newGame('Mage','Humain',42);g.promptQueue=[];g.oaths=[];g.draws=[];g.monsterDeck.unshift(CARDS.find(c=>c.name==='Fournaise').id);localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:g}));})()`)
    await navigate('/solo')
    await evaluate("document.querySelector('.gb-side-left .gb-pile').click()")
    await wait(350)
    const arrivals=await evaluate(`[...document.querySelectorAll('.gb-draw-flight')].flatMap(f=>{const id=f.querySelector('[data-card-id]')?.dataset.cardId;const c=document.querySelector('.gb-board-choice [data-card-id="'+id+'"]');if(!c)return [];const r=c.getBoundingClientRect();return [{id,x:parseFloat(f.style.left),y:parseFloat(f.style.top),w:parseFloat(f.style.getPropertyValue('--flight-width')),target:r.toJSON()}]})`)
    if(arrivals.length<1||arrivals.some(a=>Math.abs(a.x-a.target.x)>1||Math.abs(a.y-a.target.y)>1||Math.abs(a.w-a.target.width)>1))throw Error('Wrong trial destinations')
    await wait(3000)
    for(const a of arrivals){const final=await rect('.gb-board-choice [data-card-id="'+a.id+'"]');if(!final||Math.abs(final.x-a.x)>1||Math.abs(final.y-a.y)>1)throw Error('Trial landing moved')}
    console.log(JSON.stringify({width,name:'Fournaise',stableChoiceLandings:true}))
  }
  if(errors.length)throw Error(errors.join('\n'))
} finally { ws.close() }
