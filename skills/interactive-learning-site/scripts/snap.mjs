// node snap.mjs <url> <outprefix> <width> [jsonSteps]
// Launch headless Chrome, load url, report console errors, then for each step
// {sel, js?, out} run js (optional) and screenshot the element matching sel.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const [url, prefix, width = '1400', stepsJson = '[]'] = process.argv.slice(2);
const steps = JSON.parse(stepsJson);
const port = 9300 + Math.floor(Math.random() * 500);
const prof = mkdtempSync(path.join(tmpdir(), 'snap-'));
const chrome = spawn('google-chrome', ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, `--window-size=${width},1000`, 'about:blank'],
  { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

let ws, id = 0;
const pending = new Map(), errors = [];
const send = (method, params = {}) => new Promise(res => {
  const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params }));
});
try {
  let target;
  for (let k = 0; k < 50 && !target; k++) {
    await sleep(200);
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch (e) {}
  }
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result || m); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push('EXC ' + JSON.stringify(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 400));
    if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type))
      errors.push(m.params.type + ' ' + m.params.args.map(a => a.value || a.description).join(' ').slice(0, 400));
  });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: +width, height: 1000, deviceScaleFactor: 1, mobile: +width < 500 });
  await send('Page.navigate', { url });
  await sleep(3500);
  const evalJs = async js => (await send('Runtime.evaluate', { expression: js, awaitPromise: true, returnByValue: true })).result?.value;
  for (const s of steps) {
    if (s.js) { const v = await evalJs(s.js); if (v !== undefined) console.log('js:', JSON.stringify(v).slice(0, 600)); await sleep(s.wait || 500); }
    if (s.sel) {
      const box = await evalJs(`(() => { const e = document.querySelector(${JSON.stringify(s.sel)}); if (!e) return null;
        e.scrollIntoView({block:'start'}); const r = e.getBoundingClientRect();
        return {x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height}; })()`);
      if (!box) { console.log('no element', s.sel); continue; }
      await sleep(300);
      const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
        clip: { x: box.x, y: box.y, width: box.w, height: Math.min(box.h, s.maxh || 2400), scale: 1 } });
      writeFileSync(`${prefix}-${s.out}.png`, Buffer.from(shot.data, 'base64'));
      console.log('wrote', `${prefix}-${s.out}.png`, Math.round(box.w) + 'x' + Math.round(box.h));
    }
  }
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
} finally {
  chrome.kill('SIGKILL');
  process.exit(0);
}
