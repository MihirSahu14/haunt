# Adaptive min-maxer bot (persona playtest v2). Read-only against the game: presses keys, reads globals.
# usage: python bot-minmaxer-v2.py <game_dir> <seed> <push_exorcist 0|1> <out.json> [shot.png]
import json, sys, datetime
from pathlib import Path
from playwright.sync_api import sync_playwright
game, seed, push, out = Path(sys.argv[1]).resolve(), int(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
shot = sys.argv[5] if len(sys.argv) > 5 else None
RNG = "(()=>{let a=%d>>>0;Math.random=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}})()" % seed
BRAIN = r"""push=>{
const M=window.__mm||(window.__mm={log:[],last:{},hs:0,prevFear:null,gone:{}});
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
const fo=objs.filter(o=>fresh(o,v)&&game.energy>=threatCost(o)+4&&(!numb||(comboOn&&o.type!==game.lastType)));
if(fo.length){const o=fo[0];const d=Math.hypot(ghost.x-o.x,ghost.y-(o.y-o.h/2));
  const other=OBJECTS.filter(p=>p.room===best.id&&p!==o&&p.cool<=0).some(p=>Math.hypot(ghost.x-p.x,ghost.y-(p.y-p.h/2))<d);
  if(other){mv(o.x,o.y-o.h/2);return out;} tap('e');return out;}
// Q: cheap fear, no suspicion
if(threat.whisper&&threat.whisperCool<=0&&game.energy>=8&&maxF<99){tap('q');return out;}
mv(Math.min(Math.max(tgt.x,best.x+40),best.x+best.w-40),best.y+best.h-90);
return out;}"""
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    pg.clock.install(time=datetime.datetime(2024, 1, 1)); pg.clock.pause_at(datetime.datetime(2024, 1, 1, 0, 0, 1))
    pg.add_init_script(RNG)
    pg.goto((game / 'index.html').as_uri()); pg.clock.run_for(1500)
    held, rec = set(), []
    for i in range(3000):
        pg.clock.run_for(100)
        want = set(pg.evaluate(BRAIN, push))
        for k in held - want: pg.keyboard.up(k)
        for k in want - held: pg.keyboard.down(k)
        held = want
        st = pg.evaluate("()=>window.__game.state()")
        if i % 50 == 0: rec.append({'t': st['t'], 'ecto': st['ecto'], 'susp': st['suspicion'], 'fam': [(f['id'], f['fear'], f['state']) for f in st['family']]})
        if st['over']: break
    if shot: pg.screenshot(path=shot)
    mm = pg.evaluate("()=>({log:window.__mm.log,minPres:window.__mm.minPres,maxSusp:window.__mm.maxSusp,lowT:window.__mm.lowT,clock:threat.clock,lose:threat.gameOver&&threat.gameOver.reason,won:mode==='ending'})")
    json.dump({'mm': mm, 'trace': rec}, open(out, 'w'), indent=1)
    print(json.dumps(mm))
    b.close()
