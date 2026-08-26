let DATA=[];
let PROJECTIONS={};
const $=id=>document.getElementById(id);
const clean=v => (v===undefined||v===null) ? "" : String(v).trim();
const num=v => { const n=parseFloat(clean(v).replace("%","")); return Number.isFinite(n)?n:null; };
const isPctMetric=m => ["CORSI For %","Fenwick For %","xG For %","xGF","xGA","Faceoff Win %",
    "Accurate Passes %","Puck Battles Won %","DZ Puck Losses"].includes(clean(m));

const CATEGORY_ORDER=["Offense","Possession","Puck Management","Discipline","Skill","Role / Context"];
const METRIC_ORDER={
  "Offense":["Goals","Expected Goals","First Assists","Second Assists","Points","Scoring Chances",
    "Inner Slot Shots","Shots per 60","xG per Shot","Shots on Goal","Passes to Slot","Pre-Shot Passes","Assists","Plus/Minus"],
  "Possession":["CORSI For %","Fenwick For %","xG For %","CORSI"],
  "Puck Management":["Puck Loss Rate","DZ Puck Losses","Accurate Passes %","Puck Battles Won %","Loose Puck Recovery"],
  "Discipline":["Penalty Differential","Penalties Drawn"],
  "Skill":["Faceoff Win %"],
  "Role / Context":["TOI","Puck Control Time","Hits"]
};
const CHART_METRICS=["Points","Expected Goals","CORSI For %","xG For %","Puck Loss Rate","TOI","Hits"];

const OUTCOME_ORDER=["NHL","AHL","DEL","ECHL","No pro league yet / never"];
const OUTCOME_COLOR={
  "NHL":"var(--tier-nhl)","AHL":"var(--tier-ahl)","DEL":"var(--tier-del)",
  "ECHL":"var(--tier-echl)","No pro league yet / never":"var(--tier-none)"
};
const OUTCOME_LABEL={
  "NHL":"NHL","AHL":"AHL","DEL":"Europe (DEL)","ECHL":"ECHL","No pro league yet / never":"No pro yet / never"
};

const LEAGUE_VALUE={"NHL":100,"AHL":65,"DEL":60,"ECHL":30,"No pro league yet / never":0};
const PRIOR_STRENGTH=20;

function modelOutcomePrior(){
  const counts={};
  OUTCOME_ORDER.forEach(k=>counts[k]=0);
  let total=0;
  Object.values(PROJECTIONS).forEach(p=>{
    (p.top_comps||[]).forEach(c=>{
      const key=c.peak_league || "No pro league yet / never";
      if(Object.prototype.hasOwnProperty.call(counts,key)){
        counts[key]++; total++;
      }
    });
  });
  if(!total){
    return {"NHL":4,"AHL":19,"DEL":1,"ECHL":31,"No pro league yet / never":45};
  }
  const prior={};
  OUTCOME_ORDER.forEach(k=>prior[k]=100*counts[k]/total);
  return prior;
}

function calibratedProjection(proj){
  if(!proj) return null;
  const prior=modelOutcomePrior();
  const n=Number(proj.n_comps)||10;
  const probs={};
  OUTCOME_ORDER.forEach(k=>{
    const raw=Number((proj.outcome_probs||{})[k]||0);
    const rawCount=raw/100*n;
    const priorCount=prior[k]/100*PRIOR_STRENGTH;
    probs[k]=100*(rawCount+priorCount)/(n+PRIOR_STRENGTH);
  });
  const score=OUTCOME_ORDER.reduce((sum,k)=>sum + probs[k]/100*(LEAGUE_VALUE[k]||0),0);
  return {...proj, calibrated_probs:probs, calibrated_score:score, prior};
}

function field(row,names){for(const n of names){if(Object.prototype.hasOwnProperty.call(row,n)) return row[n];}return "";}
function fmt(v,metric,percentile=false){
  if(v===null||v===undefined||clean(v)===""||clean(v).toUpperCase()==="N/A") return "N/A";
  let n=num(v); if(n===null) return clean(v);
  if(percentile){if(n<=1)n*=100;return `${Math.round(n)}%`;}
  if(isPctMetric(metric)){if(n<=1)n*=100;return `${Math.round(n)}%`;}
  return n.toFixed(2);
}
function pctValue(v){let n=num(v);if(n===null)return null;return n<=1?n*100:n;}

function playerKey(name,dob){return `${clean(name)}|${clean(dob)}`;}

function rowsFor(player){
  return DATA.filter(r=>clean(field(r,["Player"]))===player);
}
function metric(rows,name){return rows.find(r=>clean(field(r,["Metric"]))===name);}
function sortRows(rows){
  return [...rows].sort((a,b)=>{
    const ca=clean(field(a,["Category"])), cb=clean(field(b,["Category"]));
    const ia=CATEGORY_ORDER.indexOf(ca), ib=CATEGORY_ORDER.indexOf(cb);
    const ra=ia===-1?999:ia, rb=ib===-1?999:ib;
    if(ra!==rb) return ra-rb;
    const ma=clean(field(a,["Metric"])), mb=clean(field(b,["Metric"]));
    const order=METRIC_ORDER[ca] || [];
    const mia=order.indexOf(ma), mib=order.indexOf(mb);
    const mra=mia===-1?999:mia, mrb=mib===-1?999:mib;
    if(mra!==mrb) return mra-mrb;
    return ma.localeCompare(mb);
  });
}

function renderProjection(pkey){
  const rawProj=PROJECTIONS[pkey];
  const proj=calibratedProjection(rawProj);
  const panel=$("projectionSection");
  if(!proj){
    panel.style.display="none";
    return;
  }
  panel.style.display="";

  $("scoreValue").textContent=proj.calibrated_score!==null && proj.calibrated_score!==undefined
    ? proj.calibrated_score.toFixed(1) : "—";
  $("nCompsNote").textContent=`${proj.n_comps} comps found`;

  const bars=$("probabilityBars");
  bars.innerHTML="";
  OUTCOME_ORDER.forEach(key=>{
    const val=(proj.calibrated_probs&&proj.calibrated_probs[key])||0;
    const row=document.createElement("div");
    row.className="prob-row";
    row.innerHTML=`
      <div class="prob-label">${OUTCOME_LABEL[key]}</div>
      <div class="prob-track"><div class="prob-fill" style="width:${val}%;background:${OUTCOME_COLOR[key]}"></div></div>
      <div class="prob-pct">${Math.round(val)}%</div>
    `;
    bars.appendChild(row);
  });

  const list=$("compsList");
  list.innerHTML="";
  const maxDist=Math.max(...proj.top_comps.map(c=>c.distance), 1);
  proj.top_comps.forEach(c=>{
    const outcomeKey=c.peak_league || "No pro league yet / never";
    const similarity=Math.round(100*(1-c.distance/(maxDist*1.15)));
    const row=document.createElement("div");
    row.className="comp-row";
    row.innerHTML=`
      <div>
        <div class="comp-name">${c.Player}</div>
        <div class="comp-meta">${c.Season} · ${c.Team}</div>
      </div>
      <div class="comp-meta">similarity</div>
      <span class="comp-outcome" style="background:${OUTCOME_COLOR[outcomeKey]}22;color:${OUTCOME_COLOR[outcomeKey]};border:1px solid ${OUTCOME_COLOR[outcomeKey]}55">${OUTCOME_LABEL[outcomeKey]}</span>
      <div class="comp-sim">${similarity}%</div>
    `;
    list.appendChild(row);
  });
}

function render(){
  const player=$("player").value;
  const rows=rowsFor(player);
  if(!rows.length)return;
  const first=rows[0];
  const dob=field(first,["DOB"]);
  const pkey=playerKey(player,dob);

  $("playerName").textContent=player;
  $("playerMeta").textContent=`${clean(field(first,["Position"]))} · ${clean(field(first,["Team"]))}`;
  $("gp").textContent=clean(field(first,["Season GP"]))||"—";
  $("pts").textContent=clean(field(first,["Season Points"]))||"0";
  $("goals").textContent=clean(field(first,["Season Goals"]))||"0";
  $("assists").textContent=clean(field(first,["Season Assists"]))||"0";
  $("pim").textContent=clean(field(first,["Season PIM"]))||"0";

  const age=field(first,["age_at_season"]);
  const seasonNum=field(first,["observed_season_number"]);
  $("ageBadge").textContent=`Age ${Math.round(num(age)||0)} · Season ${Math.round(num(seasonNum)||0)} observed`;

  const body=$("metrics");body.innerHTML="";let previousCategory=null;
  sortRows(rows).forEach(r=>{
    const category=clean(field(r,["Category"])),m=clean(field(r,["Metric"])),pp=pctValue(field(r,["Percentile"]));
    const tr=document.createElement("tr");
    if(previousCategory!==null&&category!==previousCategory)tr.classList.add("category-start");
    previousCategory=category;
    tr.innerHTML=`<td>${category}</td><td>${m}</td><td>${fmt(field(r,["Per-game value"]),m)}</td><td>${fmt(field(r,["NCAA Avg"]),m)}</td><td>${pp===null?"N/A":`<div class="pct"><span>${Math.round(pp)}%</span><span class="bar"><i style="width:${Math.max(0,Math.min(100,pp))}%"></i></span></div>`}</td>`;
    body.appendChild(tr);
  });

  const chartRows=CHART_METRICS.map(name=>metric(rows,name)).filter(Boolean).map(r=>({
    label:clean(field(r,["Metric"])),
    value:pctValue(field(r,["Percentile"]))
  })).filter(x=>x.value!==null);

  const snapshot=$("profileSnapshot");
  snapshot.innerHTML=chartRows.map(x=>`
    <div class="percentile-card">
      <div class="percentile-card-label">${x.label}</div>
      <div class="percentile-card-box ${x.value<50 ? "below-midpoint" : "at-or-above-midpoint"}">${Math.round(x.value)}%</div>
    </div>
  `).join("");

  renderProjection(pkey);
}

let PLAYER_INDEX={}; // player name -> first row (for DOB / quick lookups)

function buildPlayerIndex(){
  PLAYER_INDEX={};
  DATA.forEach(r=>{
    const p=clean(field(r,["Player"]));
    if(p && !PLAYER_INDEX[p]) PLAYER_INDEX[p]=r;
  });
}

function allPlayers(){
  return [...new Set(DATA.map(r=>clean(field(r,["Player"]))).filter(Boolean))].sort();
}
function filteredPlayers(){
  const pos=$("position").value;
  const team=$("team").value;
  return Object.keys(PLAYER_INDEX).filter(p=>{
    const row=PLAYER_INDEX[p];
    const posMatch=pos==="All" || clean(field(row,["Position"]))===pos;
    const teamMatch=team==="All" || clean(field(row,["Team"]))===team;
    return posMatch && teamMatch;
  });
}
function sortedByScorePlayers(){
  const sortMode=$("sortMode").value;
  let players=filteredPlayers();
  if(sortMode==="score"){
    players.sort((a,b)=>{
      const ka=playerKey(a, field(PLAYER_INDEX[a],["DOB"]));
      const kb=playerKey(b, field(PLAYER_INDEX[b],["DOB"]));
      const pa=calibratedProjection(PROJECTIONS[ka]);
      const pb=calibratedProjection(PROJECTIONS[kb]);
      const sa=(pa&&pa.calibrated_score)||0;
      const sb=(pb&&pb.calibrated_score)||0;
      return sb-sa;
    });
  } else {
    players.sort();
  }
  return players;
}

function teamsForCurrentPosition(){
  const pos=$("position").value;
  return [...new Set(
    Object.values(PLAYER_INDEX)
      .filter(r=>pos==="All" || clean(field(r,["Position"]))===pos)
      .map(r=>clean(field(r,["Team"])))
      .filter(Boolean)
  )].sort();
}
function refreshTeams(){
  const current=$("team").value || "All";
  const teams=teamsForCurrentPosition();
  $("team").innerHTML=['All',...teams].map(t=>`<option value="${t.replace(/"/g,"&quot;")}">${t==="All"?"All Teams":t}</option>`).join("");
  $("team").value=teams.includes(current)?current:"All";
}
function cyclePlayer(direction){
  const players=sortedByScorePlayers();
  if(!players.length) return;
  let idx=players.indexOf($("player").value);
  if(idx===-1) idx=direction>0?-1:0;
  idx=(idx+direction+players.length)%players.length;
  $("player").value=players[idx];
  render();
}
function refreshPlayers(){
  const players=sortedByScorePlayers();
  $("players").innerHTML=players.map(p=>`<option value="${p.replace(/"/g,"&quot;")}"></option>`).join("");
  const current=$("player").value;
  if(!players.includes(current)){
    $("player").value=players[0]||"";
  }
  render();
}
function findBestPlayerMatch(query){
  const q=clean(query).toLowerCase();
  if(!q) return "";
  const players=sortedByScorePlayers();
  const exact=players.find(p=>p.toLowerCase()===q);
  if(exact) return exact;
  const starts=players.filter(p=>p.toLowerCase().startsWith(q));
  if(starts.length) return starts[0];
  const contains=players.filter(p=>p.toLowerCase().includes(q));
  return contains.length ? contains[0] : "";
}
function resolvePlayerSearch(){
  const match=findBestPlayerMatch($("player").value);
  if(!match) return;
  $("player").value=match;
  render();
}

$("position").addEventListener("change",()=>{
  refreshTeams();
  refreshPlayers();
});
$("team").addEventListener("change",refreshPlayers);
$("sortMode").addEventListener("change",refreshPlayers);
$("player").addEventListener("change",resolvePlayerSearch);
$("player").addEventListener("blur",resolvePlayerSearch);
$("player").addEventListener("keydown",e=>{
  if(e.key==="Enter"){
    e.preventDefault();
    resolvePlayerSearch();
  }else if(e.key==="ArrowDown"){
    e.preventDefault();
    cyclePlayer(1);
  }else if(e.key==="ArrowUp"){
    e.preventDefault();
    cyclePlayer(-1);
  }
});
$("player").addEventListener("input",()=>{
  const exact=sortedByScorePlayers().find(p=>p.toLowerCase()===$("player").value.toLowerCase());
  if(exact){ $("player").value=exact; render(); }
});

function parseCSV(text){
  const rows=[];
  let row=[], field="", inQuotes=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(inQuotes){
      if(ch === '"'){ if(text[i+1] === '"'){ field+='"'; i++; } else inQuotes=false; }
      else { field+=ch; }
    }else{
      if(ch === '"') inQuotes=true;
      else if(ch === ','){ row.push(field); field=""; }
      else if(ch === '\n'){ row.push(field); field=""; if(row.some(v=>v!=="")) rows.push(row); row=[]; }
      else if(ch !== '\r'){ field+=ch; }
    }
  }
  if(field!=="" || row.length){ row.push(field); if(row.some(v=>v!=="")) rows.push(row); }
  if(!rows.length) return [];
  const headers=rows[0];
  return rows.slice(1).map(values=>{
    const obj={};
    headers.forEach((h,i)=>obj[h]=values[i]??"");
    return obj;
  });
}

Promise.all([
  fetch("./ncaa_report.csv?v=32",{cache:"no-store"}).then(r=>{ if(!r.ok) throw new Error("report fetch failed"); return r.text(); }),
  fetch("./projections.json?v=32",{cache:"no-store"}).then(r=>{ if(!r.ok) throw new Error("projections fetch failed"); return r.json(); })
]).then(([csvText,projJson])=>{
  DATA=parseCSV(csvText);
  PROJECTIONS=projJson;
  if(!DATA.length) throw new Error("report CSV loaded but contained no rows");
  buildPlayerIndex();
  refreshTeams();
  refreshPlayers();
}).catch(error=>{
  console.error(error);
  $("playerName").textContent="Could not load prospect data";
  $("playerMeta").textContent="Refresh the page or verify ncaa_report.csv / projections.json are in the repository.";
});
