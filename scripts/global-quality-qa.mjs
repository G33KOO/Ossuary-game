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



const report=[];await call('Runtime.enable');try{
for(const theme of ['dark','light'])for(const [width,height] of [[1920,945],[1366,768],[390,844],[320,568]]){
await viewport(width,height);await navigate('/');await evaluate(`localStorage.setItem('ossuaire-theme',`+JSON.stringify(theme)+`);localStorage.removeItem('ossuaire.solo.v1')`);
for(const route of ['/','/mecaniques','/cartes','/solo']){
await navigate(route);const geometry=await evaluate(`(()=>{const broken=[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src);return {overflow:document.documentElement.scrollWidth-innerWidth,broken,heading:!!document.querySelector('h1'),font:getComputedStyle(document.body).fontFamily}})()`);if(geometry.overflow>1||geometry.broken.length||!geometry.heading)throw Error(JSON.stringify({theme,width,route,geometry}));report.push({theme,width,route,...geometry});if(width===1920||width===390)await screenshot('quality-'+theme+'-'+width+'-'+(route.slice(1)||'home'));
if(route==='/cartes'){await evaluate(`document.querySelector('.lore-card').click()`);await wait(700);const modal=await evaluate(`(()=>{const d=document.querySelector('.card-dialog'),r=d.getBoundingClientRect();return {center:Math.abs((r.top+r.bottom)/2-innerHeight/2),overflow:document.documentElement.scrollWidth-innerWidth,visible:r.top>=0&&r.bottom<=innerHeight+1}})()`);if(!modal.visible||modal.center>2||modal.overflow>1)throw Error(JSON.stringify({theme,width,modal}));await screenshot('quality-detail-'+theme+'-'+width);await evaluate(`document.querySelector('.card-dialog .modal-close').click()`);}
}
}await fs.writeFile(path.join(output,'global-quality-report.json'),JSON.stringify({report,errors},null,2));console.log(JSON.stringify({pages:report.length,errors,output}));if(errors.length)throw Error(errors.join('\n'));}finally{ws.close()}
