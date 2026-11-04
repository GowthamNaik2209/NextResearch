// Count leader-line crossings per camera view in a sector explorer (SOP gate 3: must be 0 everywhere).
// Usage, with the dev server up: node scripts/check-crossings.mjs <sector> [1440x900,375x812] [light|dark] [shotPrefix]
// BASE=http://localhost:3000 points it at another server (default http://localhost:3100); PORT=9461 runs several at once.
// Launches its own headless Chrome (throwaway profile, swiftshader) on port 9455, then closes it.
// Desktop: .leader-svg lines whose callout is shown. Phone: .mtag-leaders lines with opacity > 0.
// Also lists leaders that run through another visible callout/tag box ("thru").
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const sector = process.argv[2] || 'hospitals';
const sizes = (process.argv[3] || '1440x900,375x812').split(',');
const theme = process.argv[4] || 'light';
const shotPrefix = process.argv[5] || '';
const BASE = process.env.BASE || 'http://localhost:3100';
const PORT = Number(process.env.PORT || 9455);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'xchrome-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', 'about:blank',
], { stdio: 'ignore' });
let ver;
for (let i = 0; i < 60 && !ver; i++) { await sleep(250); try { ver = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); } catch {} }
const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pend = new Map();
ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); if (m.error) p.rej(new Error(JSON.stringify(m.error))); else p.res(m.result); } });
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
await send('Page.enable'); await send('Runtime.enable'); await send('Page.bringToFront');

const MEASURE = `(()=>{
  const segs=[]; const boxes=[];
  const stage=document.querySelector('.leader-svg')?.parentElement; const sr=stage.getBoundingClientRect();
  const phone=getComputedStyle(document.querySelector('.callout-rail.rail-left')||document.body).display==='none' || !document.querySelector('.callout-rail .callout') || document.querySelector('.callout-rail').offsetParent===null;
  if(!phone){
    const boxEls=[...document.querySelectorAll('.callout-rail .callout')];
    const lines=[...document.querySelectorAll('.leader-svg line')];
    // Lines are in zone order, callouts in rail order: pair them by zone colour.
    boxEls.forEach((b)=>{ const shown=b.style.opacity!=='0'; const r=b.getBoundingClientRect(); const zc=b.style.getPropertyValue('--zc').trim().toLowerCase(); const starts=(x)=>{const X=+x.getAttribute('x1')+sr.left,Y=+x.getAttribute('y1')+sr.top; return X>=r.left-3&&X<=r.right+3&&Y>=r.top-3&&Y<=r.bottom+3;}; /* zones can share a colour: pair by the line that starts at this box */ const same=lines.filter(x=>x.getAttribute('stroke').toLowerCase()===zc); const l=same.find(starts)??same[0];
      if(shown){ boxes.push({n:b.textContent,x0:r.left-sr.left,x1:r.right-sr.left,y0:r.top-sr.top,y1:r.bottom-sr.top});
        segs.push({n:b.textContent,x1:+l.getAttribute('x1'),y1:+l.getAttribute('y1'),x2:+l.getAttribute('x2'),y2:+l.getAttribute('y2')}); }});
  } else {
    const tags=[...document.querySelectorAll('.mtag')]; const lines=[...document.querySelectorAll('.mtag-leaders line')];
    tags.forEach((g,i)=>{ if(g.style.opacity==='0') return; const r=g.getBoundingClientRect(); boxes.push({n:g.title,x0:r.left-sr.left,x1:r.right-sr.left,y0:r.top-sr.top,y1:r.bottom-sr.top});
      const l=lines[i]; if(+l.getAttribute('opacity')>0) segs.push({n:g.title,x1:+l.getAttribute('x1'),y1:+l.getAttribute('y1'),x2:+l.getAttribute('x2'),y2:+l.getAttribute('y2')}); });
  }
  return {phone,segs,boxes};
})()`;
const cross = (a, b) => {
  const o = (px, py, qx, qy, rx, ry) => Math.sign((qx - px) * (ry - py) - (qy - py) * (rx - px));
  return o(a.x1, a.y1, a.x2, a.y2, b.x1, b.y1) * o(a.x1, a.y1, a.x2, a.y2, b.x2, b.y2) < 0 && o(b.x1, b.y1, b.x2, b.y2, a.x1, a.y1) * o(b.x1, b.y1, b.x2, b.y2, a.x2, a.y2) < 0;
};
const segBox = (s, b) => { // does segment pass through box interior (shrunk by 2px)?
  const x0 = b.x0 + 2, x1 = b.x1 - 2, y0 = b.y0 + 2, y1 = b.y1 - 2;
  for (let k = 1; k < 40; k++) { const f = k / 40; const x = s.x1 + (s.x2 - s.x1) * f, y = s.y1 + (s.y2 - s.y1) * f; if (x > x0 && x < x1 && y > y0 && y < y1) return true; }
  return false;
};

let total = 0;
for (const sz of sizes) {
  const [w, h] = sz.split('x').map(Number);
  const mobile = w < 768;
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
  await send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: 5 });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }] });
  await send('Page.navigate', { url: `${BASE}/sector/${sector}/explore` });
  // Wait for the model: callouts (desktop) or tags (phone) exist and the loader is gone; screenshots drive frames.
  for (let k = 0; k < 120; k++) { await sleep(1000); await send('Page.captureScreenshot', { format: 'jpeg', quality: 10 }).catch(() => 0); const ok = await ev(`document.querySelectorAll('.callout, .mtag').length>0 && !/Loading the 3D model/.test(document.body.innerText)`).catch(() => false); if (ok) break; if (k === 119) console.log('model never loaded at', sz); }
  await sleep(1500);
  await ev(`document.documentElement.dataset.theme=${JSON.stringify(theme)}; document.documentElement.classList.toggle('dark', ${theme === 'dark'}); 1`);
  let views = []; for (let k = 0; k < 20 && !views.length; k++) { if (k) await sleep(1000); views = await ev(`[...document.querySelectorAll('.view-btn')].map(b=>b.textContent.trim())`); }
  const runs = [['initial', null], ...views.map((v) => [v, v])];
  for (const [name, label] of runs) {
    if (label) { await ev(`(()=>{const b=[...document.querySelectorAll('.view-btn')].find(b=>b.textContent.trim()===${JSON.stringify(label)}); b.click(); return 1;})()`); await sleep(1500); }
    // Wait until every leader has stopped moving (the camera has landed); swiftshader is slow.
    // Headless Chrome only produces frames on demand: a screenshot forces one, so take one before each read.
    const frame = () => send('Page.captureScreenshot', { format: 'jpeg', quality: 10 });
    await frame(); let m = await ev(MEASURE); let stable = 0;
    for (let k = 0; k < 60 && stable < 3; k++) { await sleep(500); await frame(); const m2 = await ev(MEASURE); stable = JSON.stringify(m2) === JSON.stringify(m) && m2.boxes.length ? stable + 1 : 0; m = m2; }
    const pairs = [];
    for (let i = 0; i < m.segs.length; i++) for (let j = i + 1; j < m.segs.length; j++) if (cross(m.segs[i], m.segs[j])) pairs.push(`${m.segs[i].n} X ${m.segs[j].n}`);
    const thru = [];
    for (const s of m.segs) for (const b of m.boxes) if (b.n !== s.n && segBox(s, b)) thru.push(`${s.n} > [${b.n}]`);
    total += pairs.length;
    console.log(`${sz} ${name.padEnd(16)} leaders=${m.segs.length} crossings=${pairs.length}${pairs.length ? '  ' + pairs.join('; ') : ''}${thru.length ? '  thru: ' + thru.join('; ') : ''}`);
    if (shotPrefix) { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${shotPrefix}_${w}_${name.replace(/[^a-z0-9]+/gi, '')}.png`, Buffer.from(r.data, 'base64')); }
  }
}
console.log('TOTAL crossings', total);
ws.close(); chrome.kill(); await sleep(500); fs.rmSync(prof, { recursive: true, force: true });
