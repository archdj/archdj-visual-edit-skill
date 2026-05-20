#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ANNOTATE_PORT = 3099;
const OUTPUT_FILE = path.join(process.cwd(), '.visual-edit-annotations.json');
const BASE_PORTS = [3000, 5173, 8080, 4200, 4321, 3001, 8000];

// ── Route detection ──────────────────────────────────────────────────────────

function detectRoutes() {
  const cwd = process.cwd();
  const routes = [];

  // Next.js App Router
  const appDir = findDir(cwd, ['src/app', 'app']);
  if (appDir) {
    walkDir(appDir, (filePath) => {
      if (/page\.(tsx|jsx|js|ts)$/.test(filePath)) {
        const rel = path.relative(appDir, filePath);
        const parts = rel.split(path.sep).slice(0, -1); // remove filename
        const route = '/' + parts
          .filter(p => !p.startsWith('(') && !p.startsWith('_'))
          .join('/');
        routes.push({ route: route || '/', file: path.relative(cwd, filePath) });
      }
    });
    if (routes.length) return routes;
  }

  // Next.js Pages Router
  const pagesDir = findDir(cwd, ['pages', 'src/pages']);
  if (pagesDir) {
    walkDir(pagesDir, (filePath) => {
      if (/\.(tsx|jsx|js|ts)$/.test(filePath)) {
        const rel = path.relative(pagesDir, filePath);
        const parts = rel.split(path.sep);
        if (parts.some(p => p.startsWith('_') || p === 'api')) return;
        const name = parts[parts.length - 1].replace(/\.(tsx|jsx|js|ts)$/, '');
        const dirs = parts.slice(0, -1);
        const route = dirs.concat(name === 'index' ? [] : [name]).join('/');
        routes.push({ route: '/' + route, file: path.relative(cwd, filePath) });
      }
    });
    if (routes.length) return routes;
  }

  // Static HTML
  const htmlFiles = fs.readdirSync(cwd).filter(f => f.endsWith('.html'));
  if (htmlFiles.length) {
    return htmlFiles.map(f => ({ route: '/' + f, file: f }));
  }

  return [{ route: '/', file: '(root)' }];
}

function findDir(cwd, candidates) {
  for (const c of candidates) {
    const p = path.join(cwd, c);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function walkDir(dir, cb) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      walkDir(full, cb);
    } else if (entry.isFile()) {
      cb(full);
    }
  }
}

// ── Dev server detection ──────────────────────────────────────────────────────

function detectDevServer() {
  for (const port of BASE_PORTS) {
    try {
      execSync(`curl -s --max-time 1 -o /dev/null http://localhost:${port}`, { stdio: 'ignore' });
      return `http://localhost:${port}`;
    } catch {}
  }
  return null;
}

// ── HTML UI ───────────────────────────────────────────────────────────────────

function buildUI(baseUrl, routes) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>Visual Edit</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0d0d0d;color:#e8e8e8;display:flex;height:100vh;overflow:hidden}

/* Sidebar */
.sidebar{width:230px;background:#141414;border-right:1px solid #222;display:flex;flex-direction:column;flex-shrink:0}
.sb-header{padding:14px 16px;border-bottom:1px solid #222}
.sb-header h1{font-size:13px;font-weight:700;color:#fff}
.sb-header p{font-size:11px;color:#555;margin-top:3px}
.page-list{flex:1;overflow-y:auto;padding:6px}
.pi{padding:9px 10px;border-radius:5px;cursor:pointer;font-size:12px;color:#888;display:flex;flex-direction:column;gap:2px;margin-bottom:1px;position:relative;user-select:none}
.pi:hover{background:#1c1c1c;color:#ccc}
.pi.active{background:#172038;color:#60a5fa}
.pi .route{font-weight:600;font-size:12px}
.pi .file{font-size:10px;color:#444}
.pi .badge{position:absolute;right:8px;top:50%;transform:translateY(-50%);background:#ef4444;color:#fff;border-radius:10px;font-size:10px;padding:1px 6px;font-weight:600}
.sb-footer{padding:10px;border-top:1px solid #222}
.submit-btn{width:100%;padding:10px;background:#2563eb;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s}
.submit-btn:hover{background:#1d4ed8}
.submit-btn:disabled{background:#222;color:#555;cursor:not-allowed}

/* Main */
.main{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative}
.toolbar{padding:8px 14px;background:#141414;border-bottom:1px solid #222;display:flex;align-items:center;gap:10px;flex-shrink:0}
.toolbar span.label{font-size:11px;color:#555}
.scale-wrap{display:flex;align-items:center;gap:6px;margin-left:auto;font-size:11px;color:#555}
.scale-wrap input{width:80px;accent-color:#2563eb}
.clear-btn{padding:5px 10px;border-radius:4px;border:1px solid #3f0e0e;background:transparent;color:#ef4444;font-size:11px;cursor:pointer}
.clear-btn:hover{background:#3f0e0e}

.frame-area{flex:1;overflow:auto;background:#111;position:relative;display:flex}
.frame-wrap{position:relative;transform-origin:top left;flex-shrink:0}
.page-iframe{display:block;border:none;background:#fff}
.draw-canvas{position:absolute;top:0;left:0;cursor:crosshair;pointer-events:all}

/* Panel */
.panel{width:260px;background:#141414;border-left:1px solid #222;display:flex;flex-direction:column;flex-shrink:0}
.panel-hd{padding:12px 14px;border-bottom:1px solid #222;font-size:12px;font-weight:600}
.ann-list{flex:1;overflow-y:auto;padding:8px}
.ann-item{background:#1a1a1a;border-radius:6px;padding:10px;margin-bottom:8px;border:1px solid #222}
.ann-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px}
.ann-num{font-size:11px;font-weight:700}
.ann-del{background:none;border:none;color:#444;cursor:pointer;font-size:14px;line-height:1;padding:0 2px}
.ann-del:hover{color:#ef4444}
.ann-ta{width:100%;background:#0d0d0d;border:1px solid #2a2a2a;border-radius:4px;color:#ddd;font-size:12px;padding:7px 8px;resize:none;min-height:60px;font-family:inherit;line-height:1.5}
.ann-ta:focus{outline:none;border-color:#2563eb}
.ann-ta::placeholder{color:#444}
.empty{text-align:center;padding:40px 16px;color:#333;font-size:12px;line-height:1.8}
</style>
</head>
<body>

<div class="sidebar">
  <div class="sb-header">
    <h1>Visual Edit</h1>
    <p>페이지 선택 → 박스로 표시 → 전송</p>
  </div>
  <div class="page-list" id="pageList"></div>
  <div class="sb-footer">
    <button class="submit-btn" id="submitBtn" onclick="submitAll()">Claude에게 전송 →</button>
  </div>
</div>

<div class="main">
  <div class="toolbar">
    <span class="label">▭ 드래그로 영역 선택</span>
    <div class="scale-wrap">
      확대
      <input type="range" min="25" max="100" value="65" id="scaleSlider" oninput="applyScale(this.value)">
      <span id="scaleLabel">65%</span>
    </div>
    <button class="clear-btn" onclick="clearCurrent()">이 페이지 초기화</button>
  </div>
  <div class="frame-area" id="frameArea">
    <div class="frame-wrap" id="frameWrap">
      <iframe class="page-iframe" id="pageFrame" src="about:blank" width="1440" height="900"></iframe>
      <canvas class="draw-canvas" id="drawCanvas" width="1440" height="900"></canvas>
    </div>
  </div>
</div>

<div class="panel">
  <div class="panel-hd">어노테이션 <span id="annCountLabel" style="color:#555;font-weight:400"></span></div>
  <div class="ann-list" id="annList"><div class="empty">박스를 그리면<br>여기에 코멘트를<br>입력할 수 있습니다</div></div>
</div>

<script>
const BASE_URL = ${JSON.stringify(baseUrl)};
const ROUTES = ${JSON.stringify(routes)};

let currentRoute = null;
let scale = 0.65;
let annotations = {};   // { route: [{id,x,y,w,h,comment,color}] }
let drawing = false, sx, sy;
let nextId = 1;
const COLORS = ['#ef4444','#3b82f6','#22c55e','#f59e0b','#a855f7','#ec4899'];
let colorCursor = 0;

const canvas = document.getElementById('drawCanvas');
const ctx = canvas.getContext('2d');
const iframe = document.getElementById('pageFrame');
const wrap = document.getElementById('frameWrap');

// Build sidebar
(function buildSidebar() {
  const list = document.getElementById('pageList');
  ROUTES.forEach((r, i) => {
    const el = document.createElement('div');
    el.className = 'pi';
    el.id = 'pi-' + i;
    el.innerHTML = '<span class="route">' + r.route + '</span><span class="file">' + r.file + '</span>';
    el.onclick = () => loadPage(r, i);
    list.appendChild(el);
  });
  if (ROUTES.length) loadPage(ROUTES[0], 0);
})();

function loadPage(r, idx) {
  if (currentRoute === r.route) return;
  document.querySelectorAll('.pi').forEach(e => e.classList.remove('active'));
  document.getElementById('pi-' + idx).classList.add('active');
  currentRoute = r.route;
  iframe.src = BASE_URL + r.route;
  if (!annotations[currentRoute]) annotations[currentRoute] = [];
  redraw();
  renderPanel();
}

function applyScale(v) {
  scale = v / 100;
  document.getElementById('scaleLabel').textContent = v + '%';
  wrap.style.transform = 'scale(' + scale + ')';
  wrap.style.marginBottom = (900 * scale - 900) + 'px';
  wrap.style.marginRight = (1440 * scale - 1440) + 'px';
}

// Drawing
canvas.addEventListener('mousedown', e => {
  const p = toCanvas(e); sx = p.x; sy = p.y; drawing = true;
});
canvas.addEventListener('mousemove', e => {
  if (!drawing) return;
  const p = toCanvas(e);
  redraw();
  ghostRect(sx, sy, p.x - sx, p.y - sy);
});
canvas.addEventListener('mouseup', e => {
  if (!drawing) return; drawing = false;
  const p = toCanvas(e);
  const w = p.x - sx, h = p.y - sy;
  if (Math.abs(w) < 10 || Math.abs(h) < 10) return;
  const color = COLORS[colorCursor++ % COLORS.length];
  const ann = { id: nextId++, x: Math.min(sx,p.x), y: Math.min(sy,p.y), w: Math.abs(w), h: Math.abs(h), comment: '', color };
  annotations[currentRoute].push(ann);
  redraw(); renderPanel(); updateBadges();
  setTimeout(() => { const ta = document.getElementById('ta-' + ann.id); if(ta) ta.focus(); }, 80);
});

function toCanvas(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
}

function ghostRect(x, y, w, h) {
  ctx.save();
  ctx.strokeStyle = COLORS[colorCursor % COLORS.length];
  ctx.lineWidth = 2;
  ctx.setLineDash([6,3]);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

function redraw() {
  canvas.width = 1440; canvas.height = 900;
  const anns = annotations[currentRoute] || [];
  anns.forEach((a, i) => {
    ctx.strokeStyle = a.color;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([]);
    ctx.strokeRect(a.x, a.y, a.w, a.h);
    ctx.fillStyle = a.color + '18';
    ctx.fillRect(a.x, a.y, a.w, a.h);
    // number label
    ctx.fillStyle = a.color;
    ctx.fillRect(a.x, a.y - 22, 22, 22);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(i + 1, a.x + 11, a.y - 6);
    ctx.textAlign = 'left';
  });
}

function renderPanel() {
  const anns = annotations[currentRoute] || [];
  const label = document.getElementById('annCountLabel');
  label.textContent = anns.length ? '(' + anns.length + ')' : '';
  const list = document.getElementById('annList');
  if (!anns.length) { list.innerHTML = '<div class="empty">박스를 그리면<br>여기에 코멘트를<br>입력할 수 있습니다</div>'; return; }
  list.innerHTML = anns.map((a, i) => \`
    <div class="ann-item">
      <div class="ann-hd">
        <span class="ann-num" style="color:\${a.color}">● #\${i+1}</span>
        <button class="ann-del" onclick="deleteAnn(\${a.id})">✕</button>
      </div>
      <textarea class="ann-ta" id="ta-\${a.id}" placeholder="수정 내용을 설명하세요..." oninput="setComment(\${a.id},this.value)">\${a.comment}</textarea>
    </div>
  \`).join('');
}

function setComment(id, val) {
  const a = (annotations[currentRoute] || []).find(x => x.id === id);
  if (a) a.comment = val;
}

function deleteAnn(id) {
  annotations[currentRoute] = annotations[currentRoute].filter(a => a.id !== id);
  redraw(); renderPanel(); updateBadges();
}

function clearCurrent() {
  annotations[currentRoute] = [];
  redraw(); renderPanel(); updateBadges();
}

function updateBadges() {
  ROUTES.forEach((r, i) => {
    const el = document.getElementById('pi-' + i);
    if (!el) return;
    let badge = el.querySelector('.badge');
    const count = (annotations[r.route] || []).length;
    if (count > 0) {
      if (!badge) { badge = document.createElement('span'); badge.className = 'badge'; el.appendChild(badge); }
      badge.textContent = count;
    } else if (badge) badge.remove();
  });
}

async function submitAll() {
  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = '전송 중...';
  const payload = Object.entries(annotations)
    .filter(([,v]) => v.length > 0)
    .map(([route, anns]) => ({ route, annotations: anns }));
  try {
    await fetch('/submit', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    btn.textContent = '✓ Claude에게 전송됨';
    btn.style.background = '#16a34a';
  } catch(e) {
    btn.textContent = '전송 실패 — 다시 시도';
    btn.disabled = false;
    btn.style.background = '#ef4444';
  }
}

// Init scale
applyScale(65);
</script>
</body>
</html>`;
}

// ── HTTP Server ────────────────────────────────────────────────────────────────

function startServer(baseUrl, routes) {
  const ui = buildUI(baseUrl, routes);

  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(ui);
    } else if (req.method === 'POST' && req.url === '/submit') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        fs.writeFileSync(OUTPUT_FILE, body, 'utf8');
        console.log(`\n✅ 어노테이션 저장됨: ${OUTPUT_FILE}`);
        console.log(`   Claude가 이 파일을 읽고 수정을 시작합니다.\n`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      });
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  server.listen(ANNOTATE_PORT, () => {
    const url = `http://localhost:${ANNOTATE_PORT}`;
    console.log(`\n🎨 Visual Edit 어노테이션 UI 실행 중`);
    console.log(`   ${url}\n`);
    console.log(`   감지된 페이지 (${routes.length}개):`);
    routes.forEach(r => console.log(`   ${r.route.padEnd(24)} ${r.file}`));
    console.log(`\n   브라우저에서 위 주소를 열거나 자동으로 열립니다.`);
    console.log(`   박스를 그리고 코멘트를 입력한 뒤 "Claude에게 전송"을 누르세요.\n`);

    // Auto-open browser
    const openCmd = process.platform === 'win32' ? `start ${url}`
      : process.platform === 'darwin' ? `open ${url}`
      : `xdg-open ${url}`;
    try { execSync(openCmd, { stdio: 'ignore' }); } catch {}
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

const baseUrl = detectDevServer();

if (!baseUrl) {
  console.error(`
❌ Dev server가 실행되지 않았습니다.

   확인한 포트: ${BASE_PORTS.join(', ')}

   먼저 프론트엔드를 실행하세요:
     npm run dev

   그 다음 다시 실행:
     node ~/.agents/skills/visual-edit/tools/visual-annotate.js
`);
  process.exit(1);
}

const routes = detectRoutes();

console.log(`\n🔍 Dev server: ${baseUrl}`);
startServer(baseUrl, routes);
