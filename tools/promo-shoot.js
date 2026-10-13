// render release/promo/*.png with headless Chrome from tools/promo.html
// needs the static server on :8765 (python -m http.server 8765)
// usage: node tools/promo-shoot.js [mode]
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:8765/tools/promo.html?mode=';
const OUT = path.join(__dirname, '..', 'release', 'promo');
const JOBS = [
  ['cover', 'cover.png'],
  ['banner', 'banner.png'],
  ['tile', 'bg-tile.png'],
  ['title', 'shot-1.png'],
  ['haunt', 'shot-2.png'],
  ['scare', 'shot-3.png'],
  ['exorcist', 'shot-4.png'],
];

const only = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });
for (const job of JOBS) {
  if (only && only !== job[0]) continue;
  const args = ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--no-first-run', '--user-data-dir=' + path.join(require('os').tmpdir(), 'haunt-promo-chrome'), '--virtual-time-budget=3000', '--dump-dom', BASE + job[0]];
  const dom = cp.execFileSync(CHROME, args, { maxBuffer: 256 * 1024 * 1024, encoding: 'utf8' });
  const m = /data:image\/png;base64,([A-Za-z0-9+/=]+)/.exec(dom);
  if (!m) {
    const e = /<pre id="err">([\s\S]*?)<\/pre>/.exec(dom);
    console.log(job[0] + ': FAILED ' + (e ? e[1] : '(no output)'));
    continue;
  }
  const buf = Buffer.from(m[1], 'base64');
  fs.writeFileSync(path.join(OUT, job[1]), buf);
  // PNG header: width at byte 16, height at byte 20
  console.log(job[1] + ' ' + buf.readUInt32BE(16) + 'x' + buf.readUInt32BE(20));
}
