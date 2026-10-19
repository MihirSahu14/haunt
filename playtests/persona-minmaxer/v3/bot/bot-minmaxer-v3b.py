# Adaptive min-maxer bot v3b (whisper only for crowds or when rich; E at exact cost) (persona playtest v3). Boots exactly like playbench agent mode (v0.3.3: pause_at only,
# PROBE_JS seed, Enter/Space start), records held keys per 0.1 s step as a harness script, so runs replay in agent mode.
# usage: python bot-minmaxer-v3.py <game_dir> <seed> <push 0|N> <out.json> [shot.png] [script_out.json]
import json, sys, threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from datetime import timedelta
from pathlib import Path
sys.path.insert(0, r"C:\Users\mihir\Desktop\Projects\Game Design Plugin\scripts")
from playtest import EPOCH, PROBE_JS
from playwright.sync_api import sync_playwright
game, seed, push, out = Path(sys.argv[1]).resolve(), int(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
shot = sys.argv[5] if len(sys.argv) > 5 and sys.argv[5] != '-' else None
sout = sys.argv[6] if len(sys.argv) > 6 else None
BRAIN = r"""push=>{
const M=window.__mm||(window.__mm={wl:[],log:[],last:{},hs:0,prevFear:null,gone:{}});
if(mode==='title')return ['Enter'];
if(mode!=='game')return [];
const T=game.time, out=[];
const tap=k=>{if(M.last[k]===1){M.last[k]=0;return;}M.last[k]=1;out.push(k);};
const mv=(x,y)=>{if(x-ghost.x>25)out.push('d');if(ghost.x-x>25)out.push('a');if(y-ghost.y>25)out.push('s');if(ghost.y-y>25)out.push('w');};
const cx=r=>r.x+r.w/2, cy=r=>r.y+r.h/2;
const gr=roomAt(ghost.x,ghost.y);
// event log
family.forEach(m=>{if(m.state==='gone'&&!M.gone[m.id]){M.gone[m.id]=1;M.log.push({t:+T.toFixed(1),ev:'gone',id:m.id,ecto:Math.round(game.energy),susp:Math.round(threat.suspicion)});}});
const h=threat.hunter&&threat.hunter.state!=='flee'?threat.hunter:null;
if(threat.hunter&&!M.spawn){M.spawn=1;M.log.push({t:+T.toFixed(1),ev:'exorcist',susp:Math.round(threat.suspicion),ecto:Math.round(game.energy)});}
if(threat.hunter&&threat.hunter.scares!==M.hs){M.hs=threat.hunter.scares;M.log.push({t:+T.toFixed(1),ev:'falter',n:M.hs,before:M.prevFear,after:family.map(m=>m.id+':'+Math.round(m.fear)+':'+m.state),pres:Math.round(threat.presence)});}
M.prevFear=family.map(m=>m.id+':'+Math.round(m.fear)+':'+m.state);
M.minPres=Math.min(M.minPres??100,threat.presence);M.maxSusp=Math.max(M.maxSusp??0,threat.suspicion);
if(game.energy<10)M.lowT=(M.lowT||0)+0.1;
if(threat.paused)return ['Escape'];
const vin=id=>victimsIn(id);
const fresh=(o,v)=>v.some(m=>!(m.habit&&m.habit[o.type]));
// ---------------- exorcist: haunt unused types in his room from the far wall
if(h){
  const hr=roomAt(h.x,h.y-20);
  const ld=Math.hypot(ghost.x-h.x,ghost.y-(h.y-60));
  if(!hr)return out;
  const cand=OBJECTS.filter(o=>o.room===hr.id&&!h.used[o.type]&&o.cool<=0);
  if(cand.length===0){ // no new type here: wait in a neighbour room, he follows
    const nb=ROOMS.filter(r=>r.id!==hr.id&&Math.abs(cy(r)-cy(hr))<50).sort((a,b)=>Math.abs(cx(a)-cx(hr))-Math.abs(cx(b)-cx(hr)))[0]||ROOMS[0];
    mv(cx(nb),cy(nb));return out;}
  const o=cand.sort((a,b)=>Math.abs(b.x-h.x)-Math.abs(a.x-h.x))[0];
  const ty=hr.y+30;
  if(!gr||gr.id!==hr.id||Math.hypot(ghost.x-o.x,ghost.y-ty)>90){mv(o.x,ty);if(ld<235){out.length=0;mv(ghost.x<h.x?hr.x+20:hr.x+hr.w-20,ty);}return out;}
  if(game.energy>=threatCost(o))tap('e');
  else if(threat.manifest&&!(threat.manifestCool>0)&&game.energy>=45&&!h.used.manifest)tap('r');
  return out;
}
// ---------------- push suspicion to call him
if(push&&!threat.hunterDone&&threat.hunterT<0&&threat.suspicion>=push&&goneCount()>=1){
  if(gr&&vin(gr.id).length===0){const o=OBJECTS.find(o=>o.room===gr.id&&o.cool<=0);if(o&&game.energy>=threatCost(o)){tap('e');return out;}}
  const er=ROOMS.filter(r=>vin(r.id).length===0&&OBJECTS.some(o=>o.room===r.id&&o.cool<=0&&threatCost(o)<=game.energy)).sort((a,b)=>Math.hypot(cx(a)-ghost.x,cy(a)-ghost.y)-Math.hypot(cx(b)-ghost.x,cy(b)-ghost.y))[0];
  if(er){mv(cx(er),cy(er));return out;}
}
if(threat.hunterT>0&&push){ // wait quietly for him; keep whispering
}
// ---------------- farm: best room by fear-weighted people minus travel
let best=null,bs=-1e9;
for(const r of ROOMS){const v=vin(r.id);if(!v.length)continue;let s=0;v.forEach(m=>s+=1+m.fear/40);s-=Math.hypot(cx(r)-ghost.x,cy(r)-ghost.y)/500;if(s>bs){bs=s;best=r;}}
if(!best)return out;
const v=vin(best.id);
const tgt=v.reduce((a,m)=>m.fear>a.fear?m:a,v[0]);
if(!gr||gr.id!==best.id){mv(Math.min(Math.max(tgt.x,best.x+40),best.x+best.w-40),best.y+best.h-90);return out;}
const maxF=Math.max(...v.map(m=>m.fear));
const objs=OBJECTS.filter(o=>o.room===best.id&&o.cool<=0);
const numb=v.every(m=>m.scaredAgo<5);
const comboOn=T-game.lastScare<=3;
// R finisher
if(threat.manifest&&!(threat.manifestCool>0)&&game.energy>=45&&maxF>=55){tap('r');return out;}
// E finisher at 99: any ready object
if(maxF>=97&&objs.length){const o=objs[0];if(game.energy>=threatCost(o)){mv(o.x,o.y-o.h/2);tap('e');return out;}}
// fresh E: full value when not numb, or to extend a combo with a new type
const fo=objs.filter(o=>fresh(o,v)&&game.energy>=threatCost(o)&&(!numb||(comboOn&&o.type!==game.lastType)));
if(fo.length){const o=fo[0];const d=Math.hypot(ghost.x-o.x,ghost.y-(o.y-o.h/2));
  const other=OBJECTS.filter(p=>p.room===best.id&&p!==o&&p.cool<=0).some(p=>Math.hypot(ghost.x-p.x,ghost.y-(p.y-p.h/2))<d);
  if(other){mv(o.x,o.y-o.h/2);return out;} tap('e');return out;}
// Q: cheap fear, no suspicion
if(threat.whisper&&threat.whisperCool<=0&&v.some(m=>m.fear<76)&&((v.length>=2&&game.energy>=8)||game.energy>=70)){tap('q');return out;}
mv(Math.min(Math.max(tgt.x,best.x+40),best.x+best.w-40),best.y+best.h-90);
return out;}"""
# instrument whisper (wrapper calls the original; measurement only)
WRAP = """()=>{const M=window.__mm||(window.__mm={wl:[],log:[],last:{},hs:0,prevFear:null,gone:{}});const f=threatWhisper;
window.threatWhisper=threatWhisper=function(){const e0=game.energy,s0=threat.suspicion,v=family.map(m=>[m.id,m.fear,m.scaredAgo]);f();
M.wl.push({t:+game.time.toFixed(1),de:+(game.energy-e0).toFixed(1),ds:+(threat.suspicion-s0).toFixed(1),f:family.map((m,i)=>m.id+':'+v[i][1].toFixed(0)+'>'+m.fear.toFixed(0)+(m.scaredAgo<v[i][2]?'R':''))});};}"""
class Q(SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = ThreadingHTTPServer(("127.0.0.1", 0), partial(Q, directory=str(game)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    pg.clock.pause_at(EPOCH + timedelta(seconds=1))
    pg.add_init_script(PROBE_JS.replace("__CFG__", json.dumps({"seed": seed, "overrides": {}})))
    pg.goto(f"http://127.0.0.1:{srv.server_port}/index.html", wait_until="load")
    for _ in range(20):
        pg.clock.run_for(500)
        if pg.query_selector("canvas"): break
    box = pg.locator("canvas").first.bounding_box()
    pg.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
    pg.keyboard.press("Enter"); pg.clock.run_for(200)
    rd = "()=>{const s=window.__playbench.read();return !!(s&&s.paused)}"
    if pg.evaluate(rd): pg.keyboard.press("Space")
    pg.clock.run_for(800)
    for _ in range(3):
        if not pg.evaluate(rd): break
        pg.keyboard.press("Enter"); pg.clock.run_for(1000)
    pg.evaluate(WRAP)
    held, rec, script = set(), [], []
    for i in range(1, 3001):
        pg.clock.run_for(100)
        t = round(i / 10, 1)
        want = set(pg.evaluate(BRAIN, push))
        for k in held - want: pg.keyboard.up(k)
        for k in want - held: pg.keyboard.down(k)
        if want != held: script.append({"t": t, "keys": sorted(want)})
        held = want
        st = pg.evaluate("()=>window.__game.state()")
        if i % 50 == 0: rec.append({'t': st['t'], 'ecto': st['ecto'], 'susp': st['suspicion'], 'fam': [(f['id'], f['fear'], f['state']) for f in st['family']]})
        if st['over']: break
    if shot: pg.screenshot(path=shot)
    mm = pg.evaluate("()=>({log:window.__mm.log,minPres:window.__mm.minPres,maxSusp:window.__mm.maxSusp,lowT:window.__mm.lowT,clock:threat.clock,step:%d,lose:threat.gameOver&&threat.gameOver.reason,won:mode==='ending'})" % i)
    wl = pg.evaluate("()=>window.__mm.wl")
    json.dump({'mm': mm, 'whispers': wl, 'trace': rec, 'final': st}, open(out, 'w'), indent=1)
    if sout: json.dump(script, open(sout, 'w'))
    print(json.dumps({k: mm[k] for k in ('clock', 'step', 'lose', 'won', 'maxSusp', 'minPres')}), 'gone:', [(e['id'], e['t']) for e in mm['log'] if e['ev'] == 'gone'], 'whispers:', len(wl))
    b.close()
srv.shutdown()
