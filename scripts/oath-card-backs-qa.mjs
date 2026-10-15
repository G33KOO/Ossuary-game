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
  for(const width of [1920,390,320]){
    await viewport(width,width===1920?945:844)
    await navigate('/')
    await evaluate(`(async()=>{const e=await import('/src/game/engine.ts');const g=e.newGame('Mage','Humain',42);localStorage.setItem('ossuaire-locale','fr');localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:g}));const i=new Image();i.src='/images/card-backs/serment.webp';await i.decode();})()`)
    await navigate('/solo')
    const dealing=await evaluate(`(()=>{const backs=[...document.querySelectorAll('.gb-choice-oath-back img')];return {count:backs.length,loaded:backs.every(i=>i.complete&&i.naturalWidth===900),animated:[...document.querySelectorAll('.gb-choice-oath-turn')].every(e=>e.getAnimations().length>0),locked:!!document.querySelector('.gb-choice-card > button:disabled')}})()`)
    if(dealing.count!==3||!dealing.loaded||!dealing.animated||!dealing.locked)throw Error(JSON.stringify({width,dealing}))
    await screenshot('oath-backs-deal-'+width)
    await wait(1300)
    if(!await evaluate("!document.querySelector('.gb-choice-card > button').disabled"))throw Error('Oath choice stays blocked')
    await evaluate("document.querySelector('.gb-choice-card .gb-card').click()")
    await wait(650)
    await evaluate("document.querySelectorAll('.card-face-switch button')[1].click()")
    const modal=await evaluate("(()=>{const d=document.querySelector('.card-dialog'),i=d.querySelector('.dialog-art');return {image:i?.src.includes('/card-backs/serment.webp'),fits:d.scrollHeight<=d.clientHeight+1,noBadges:!d.querySelector('.dialog-power-badge,.dialog-class-badge')}})()")
    if(!modal.image||!modal.fits||!modal.noBadges)throw Error(JSON.stringify({width,modal}))
    await screenshot('oath-back-detail-'+width)
    await evaluate("document.querySelector('.card-dialog .modal-close').click()")
    await evaluate("document.querySelector('.gb-choice-card > button').click()")
    await wait(650)
    if(!await evaluate("JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game.oaths.length===1&&!document.querySelector('.gb-board-choice')"))throw Error('Cannot keep the chosen Oath')
    await navigate('/cartes?type=Serment')
    await evaluate("document.querySelector('.lore-card').click()")
    await wait(650)
    await evaluate("document.querySelectorAll('.card-face-switch button')[1].click()")
    if(!await evaluate("document.querySelector('.dialog-art').src.includes('/card-backs/serment.webp')"))throw Error('Catalogue oath back missing')
    await evaluate("document.querySelector('.card-dialog .modal-close').click()")
    console.log(JSON.stringify({width,dealing,modal,selected:true,catalogue:true}))
  }
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]})
  await navigate('/')
  await evaluate(`(async()=>{const e=await import('/src/game/engine.ts');localStorage.setItem('ossuaire.solo.v1',JSON.stringify({v:1,game:e.newGame('Mage','Humain',42)}));})()`)
  await navigate('/solo')
  if(!await evaluate("!document.querySelector('.gb-choice-card > button').disabled&&!document.querySelector('.gb-choice-oath-turn').getAnimations().length"))throw Error('Reduced motion broken')
  console.log(JSON.stringify({reducedMotion:true}))
  if(errors.length)throw Error(errors.join('\n'))
}finally{await call('Emulation.setEmulatedMedia',{features:[]});ws.close()}
