
let DATA=[], COMPS={}, PLAYER_INDEX={};
const $=id=>document.getElementById(id);
const clean=v=>String(v??"").trim();
const num=v=>{const n=Number(v); return Number.isFinite(n)?n:null;};
const fmt=v=>{const n=num(v); if(n===null)return "—"; return Math.abs(n)>=10?n.toFixed(1):n.toFixed(2);};

const SNAPSHOT=["Points","Expected Goals","CORSI For %","xG For %","Scoring Chances","Puck Loss Rate","TOI","Hits"];
const ORDER=["Goals","Expected Goals","Assists","Points","Scoring Chances","Inner Slot Shots","Shots on Goal","CORSI For %","xG For %","Puck Loss Rate","Hits","TOI"];

function buildIndex(){
  PLAYER_INDEX={};
  DATA.forEach(r=>{
    const k=clean(r.player_key);
    if(k && !PLAYER_INDEX[k]) PLAYER_INDEX[k]=r;
  });
}
function filteredKeys(){
  const team=$("team").value, pos=$("position").value;
  return Object.keys(PLAYER_INDEX).filter(k=>{
    const r=PLAYER_INDEX[k];
    return (team==="All"||clean(r.Team)===team) && (pos==="All"||clean(r.Position)===pos);
  }).sort((a,b)=>clean(PLAYER_INDEX[a].Player).localeCompare(clean(PLAYER_INDEX[b].Player)));
}
function refreshTeams(){
  const pos=$("position").value;
  const current=$("team").value||"All";
  const teams=[...new Set(Object.values(PLAYER_INDEX).filter(r=>pos==="All"||clean(r.Position)===pos).map(r=>clean(r.Team)).filter(Boolean))].sort();
  $("team").innerHTML=['All',...teams].map(t=>`<option value="${t.replace(/"/g,"&quot;")}">${t==="All"?"All Teams":t}</option>`).join("");
  $("team").value=teams.includes(current)?current:"All";
}
function refreshPlayers(){
  const keys=filteredKeys();
  $("players").innerHTML=keys.map(k=>`<option value="${clean(PLAYER_INDEX[k].Player).replace(/"/g,"&quot;")}"></option>`).join("");
  const currentKey=findKeyByName($("player").value,keys);
  if(!currentKey && keys.length)$("player").value=PLAYER_INDEX[keys[0]].Player;
  render();
}
function findKeyByName(name,keys=filteredKeys()){
  const q=clean(name).toLowerCase();
  return keys.find(k=>clean(PLAYER_INDEX[k].Player).toLowerCase()===q) ||
         keys.find(k=>clean(PLAYER_INDEX[k].Player).toLowerCase().startsWith(q)) ||
         keys.find(k=>clean(PLAYER_INDEX[k].Player).toLowerCase().includes(q));
}
function currentKey(){return findKeyByName($("player").value);}
function cyclePlayer(dir){
  const keys=filteredKeys(); if(!keys.length)return;
  const k=currentKey(); let i=keys.indexOf(k);
  if(i<0)i=dir>0?-1:0;
  i=(i+dir+keys.length)%keys.length;
  $("player").value=PLAYER_INDEX[keys[i]].Player; render();
}
function rowsFor(k){return DATA.filter(r=>clean(r.player_key)===k);}
function renderComps(k){
  const c=COMPS[k];
  const list=$("compsList");
  if(!c || !c.comps || !c.comps.length){
    list.innerHTML=`<div class="no-comp"><strong>No strong professional comparable identified</strong><span>No sufficiently close historical pro match for this profile.</span></div>`;
    $("compNote").textContent="No forced match";
    return;
  }
  $("compNote").textContent=`${c.comps.length} credible match${c.comps.length===1?"":"es"}`;
  list.innerHTML=c.comps.map((x,i)=>{
    const stats=(x.ncaa_stats||[]).map(s=>`
      <div class="comp-season">
        <span class="comp-season-name">${s.season} · ${s.team}</span>
        <span><b>${s.gp}</b> GP</span><span><b>${s.g??"—"}</b> G</span>
        <span><b>${s.a??"—"}</b> A</span><span><b>${s.pts??"—"}</b> PTS</span>
        <span><b>${s.xg_pg??"—"}</b> xG/G</span><span><b>${s.shots_pg??"—"}</b> SH/G</span>
      </div>`).join("");
    return `<div class="comp-card">
      <div class="comp-main">
        <div class="comp-rank">${i+1}</div>
        <div><strong>${x.player}</strong><div class="comp-meta">${x.ncaa_team} · ${x.height}${x.weight?` · ${x.weight} lbs`:""} · last NCAA ${x.last_ncaa}</div></div>
        <div class="comp-outcome"><span>${x.pro_league}</span><small>Primary pro league · ${x.pro_gp} GP in dataset</small></div>
      </div>
      <div class="comp-stats">${stats}</div>
    </div>`;
  }).join("");
}
function renderSnapshot(rows){
  const by=Object.fromEntries(rows.map(r=>[r.Metric,r]));
  $("profileSnapshot").innerHTML=SNAPSHOT.filter(m=>by[m]).map(m=>{
    const p=Math.round(num(by[m].Percentile)||0);
    return `<div class="ncaa-snapshot-card ${p<50?"low":""}">
      <div class="ncaa-snapshot-label">${m}</div>
      <div class="ncaa-snapshot-value">${p}%</div>
    </div>`;
  }).join("");
}
function renderTable(rows){
  const ordered=[...rows].sort((a,b)=>ORDER.indexOf(a.Metric)-ORDER.indexOf(b.Metric));
  $("metrics").innerHTML=ordered.map(r=>{
    const p=Math.round(num(r.Percentile)||0);
    return `<tr><td>${r.Category}</td><td>${r.Metric}</td><td>${fmt(r["Per-game value"])}</td><td>${fmt(r["NCAA Avg"])}</td><td><span class="pct-pill ${p<50?"low":""}">${p}%</span></td></tr>`;
  }).join("");
}

function countryFlag(nationality){
  const n=clean(nationality).toLowerCase();
  const map={
    "usa":"🇺🇸","united states":"🇺🇸","american":"🇺🇸",
    "canada":"🇨🇦","canadian":"🇨🇦",
    "sweden":"🇸🇪","swedish":"🇸🇪",
    "finland":"🇫🇮","finnish":"🇫🇮",
    "norway":"🇳🇴","norwegian":"🇳🇴",
    "denmark":"🇩🇰","danish":"🇩🇰",
    "germany":"🇩🇪","german":"🇩🇪",
    "czech republic":"🇨🇿","czechia":"🇨🇿","czech":"🇨🇿",
    "slovakia":"🇸🇰","slovak":"🇸🇰",
    "switzerland":"🇨🇭","swiss":"🇨🇭",
    "russia":"🇷🇺","russian":"🇷🇺",
    "latvia":"🇱🇻","latvian":"🇱🇻",
    "austria":"🇦🇹","austrian":"🇦🇹",
    "france":"🇫🇷","french":"🇫🇷",
    "united kingdom":"🇬🇧","england":"🇬🇧","british":"🇬🇧"
  };
  return map[n]||"";
}
function handLabel(v){
  const h=clean(v).toLowerCase();
  if(h==="r"||h==="right") return "Shoots R";
  if(h==="l"||h==="left") return "Shoots L";
  return h ? `Shoots ${clean(v)}` : "";
}

function render(){
  const k=currentKey(); if(!k)return;
  const rows=rowsFor(k); if(!rows.length)return;
  const r=rows[0];
  $("player").value=r.Player;
  $("playerName").textContent=r.Player;
  $("playerMeta").textContent=`${r.Position} · ${r.Team}`;
  const detailParts=[];
  const flag=countryFlag(r.Nationality);
  if(clean(r.Nationality) && clean(r.Nationality)!=="[object Object]") detailParts.push(`<span class="detail-chip country-chip">${flag} ${clean(r.Nationality)}</span>`);
  if(clean(r["Height Display"])) detailParts.push(`<span class="detail-chip">${clean(r["Height Display"])}</span>`);
  if(clean(r["Weight Display"])) detailParts.push(`<span class="detail-chip">${clean(r["Weight Display"])} lbs</span>`);
  const hand=handLabel(r["Active hand"]);
  if(hand) detailParts.push(`<span class="detail-chip">${hand}</span>`);
  $("playerDetails").innerHTML=detailParts.join("");
  $("yearBadge").textContent=`Entering NCAA Year ${Math.round(num(r["Entering NCAA Season"])||0)}`;
  $("gp").textContent=Math.round(num(r["Season GP"])||0);
  $("pts").textContent=Math.round(num(r["Season Points"])||0);
  $("goals").textContent=Math.round(num(r["Season Goals"])||0);
  $("assists").textContent=Math.round(num(r["Season Assists"])||0);
  $("pim").textContent=Math.round(num(r["Season PIM"])||0);
  renderComps(k); renderSnapshot(rows); renderTable(rows);
}
function resolve(){const k=findKeyByName($("player").value); if(k){$("player").value=PLAYER_INDEX[k].Player; render();}}

$("team").addEventListener("change",refreshPlayers);
$("position").addEventListener("change",()=>{refreshTeams();refreshPlayers();});
$("player").addEventListener("keydown",e=>{
  if(e.key==="ArrowDown"){e.preventDefault();cyclePlayer(1);}
  else if(e.key==="ArrowUp"){e.preventDefault();cyclePlayer(-1);}
  else if(e.key==="Enter"){e.preventDefault();resolve();}
});
$("player").addEventListener("change",resolve);

Promise.all([
  fetch("./ncaa_final_year_report.csv?v=38").then(r=>{if(!r.ok)throw new Error("report");return r.text();}),
  fetch("./ncaa_final_year_comps.json?v=38").then(r=>{if(!r.ok)throw new Error("comps");return r.json();})
]).then(([text,comps])=>{
  DATA=Papa.parse(text,{header:true,skipEmptyLines:true}).data;
  COMPS=comps; buildIndex(); refreshTeams(); refreshPlayers();
}).catch(err=>{
  $("playerName").textContent="Data failed to load";
  console.error(err);
});
