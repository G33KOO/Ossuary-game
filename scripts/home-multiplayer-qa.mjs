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
  for(const locale of ['fr','en'])for(const theme of ['dark','light'])for(const width of [1920,1280,768,390,320]){
    await viewport(width,width>760?945:844)
    await navigate('/')
    await evaluate(`localStorage.setItem('ossuaire-locale', '${locale}');localStorage.setItem('ossuaire-theme', '${theme}')`)
    await navigate('/')
    const layout=await evaluate(`(()=>{
      const h=document.querySelector('.hero'),r=h.getBoundingClientRect(),c=document.querySelector('.hero-actions .button-primary');
      const stats=[...document.querySelectorAll('.stat-strip > div')];
      return {overflow:document.documentElement.scrollWidth-innerWidth,primary:c.getAttribute('href'),pillars:document.querySelectorAll('.rivalry-card').length,statsFit:stats.every(s=>s.scrollWidth<=s.clientWidth+1),fanVisible:[...document.querySelectorAll('.fan-card')].every(e=>{const b=e.getBoundingClientRect();return b.left>=r.left&&b.right<=r.right&&b.top>=r.top&&b.bottom<=r.bottom}),heading:document.querySelector('.hero h1').textContent,title:document.title};
    })()`)
    if(layout.overflow>1||layout.primary!=='/mecaniques'||layout.pillars!==3||!layout.statsFit||!layout.fanVisible)throw Error(JSON.stringify({locale,theme,width,layout}))
    if(locale==='fr'&&theme==='dark'&&[1920,390].includes(width)){
      await screenshot('home-multiplayer-hero-'+width)
      await evaluate("document.querySelector('.intro-section').scrollIntoView({block:'start',behavior:'instant'})")
      await screenshot('home-multiplayer-rivalries-'+width)
    }
    console.log(JSON.stringify({locale,theme,width,...layout}))
  }
  if(errors.length)throw Error(errors.join('\n'))
}finally{ws.close()}
