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




await call('Runtime.enable');
try {
 for(const width of [1920,390]) {
  await viewport(width,width===1920?945:844);
  await navigate('/');await evaluate(`localStorage.removeItem('ossuaire.solo.v1')`);await navigate('/solo');
  await evaluate(`(()=>{const previous=Math.random;Math.random=()=>.8;document.querySelector('.sim-random-button').click();Math.random=previous;document.querySelector('.sim-random-button').focus()})()`);await wait();
  const result=await evaluate(`(()=>{const hint=document.querySelector('.sim-random-tooltip');return {text:document.querySelector('.sim-random-result')?.textContent,tooltip:getComputedStyle(hint).visibility,overflow:document.documentElement.scrollWidth>innerWidth}})()`);
  if(result.tooltip!=='visible'||result.overflow||!result.text.includes('Revenant'))throw Error(JSON.stringify(result));
  await screenshot('random-hero-'+width);
  await evaluate(`document.querySelector('.sim-launch .button-primary').click()`);await wait(2500);
  const g=await evaluate(`JSON.parse(localStorage.getItem('ossuaire.solo.v1')).game`);
  if(g.race!=='Revenant'||g.klass!=='Voleur'||g.oaths.length!==2||g.promptQueue.length)throw Error('Random choice was not preserved at launch');
  await navigate('/');await evaluate(`localStorage.removeItem('ossuaire.solo.v1')`);await navigate('/solo');
  await evaluate(`document.querySelector('.sim-random-button').click()`);await wait();
  await evaluate(`document.querySelector('.sim-choice-grid .sim-choice').click()`);await wait();
  if(await evaluate(`!!document.querySelector('.sim-random-result')`))throw Error('Manual class choice did not reset random oath');
  console.log(JSON.stringify({width,tooltip:true,randomLaunch:true,revenantOaths:true,manualReset:true}));
 }
 if(errors.length)throw Error(errors.join('\n'));
}finally{ws.close()}
