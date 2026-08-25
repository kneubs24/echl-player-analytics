
let DATA=[];
const $=id=>document.getElementById(id);
const clean=v => (v===undefined||v===null) ? "" : String(v).trim();
const num=v => { const n=parseFloat(clean(v).replace("%","")); return Number.isFinite(n)?n:null; };
const isPctMetric=m => /%$/.test(clean(m)) || ["CORSI For %","Fenwick For %","xG For %",
    "xGF",
    "xGA","Faceoff Win %","Accurate Passes %","Puck Battles Won %","DZ Puck Losses"].includes(clean(m));
const CATEGORY_ORDER=["Offense","Possession","Puck Management","Discipline","Skill","Role / Context","Role"];
const METRIC_ORDER={
  "Offense":[
    "Goals",
    "Expected Goals",
    "First Assists",
    "Second Assists",
    "Points",
    "Scoring Chances",
    "Inner Slot Shots",
    "Shots per 60",
    "xG per Shot",
    "Shots on Goal",
    "Passes to Slot",
    "Pre-Shot Passes",
    "Assists",
    "Plus/Minus"
  ],
  "Possession":[
    "CORSI For %",
    "Fenwick For %",
    "xG For %",
    "CORSI"
  ],
  "Puck Management":[
    "Puck Loss Rate",
    "DZ Puck Losses",
    "Accurate Passes %",
    "Puck Battles Won %",
    "Loose Puck Recovery"
  ],
  "Discipline":[
    "Penalty Differential",
    "Penalties Drawn"
  ],
  "Skill":[
    "Faceoff Win %"
  ],
  "Role / Context":[
    "TOI",
    "Puck Control Time",
    "Hits"
  ],
  "Role":[
    "TOI",
    "Puck Control Time",
    "Hits"
  ]
};
const CHART_METRICS=["Points","Expected Goals","CORSI For %","xG For %","Puck Loss Rate","TOI","Hits"];

function field(row,names){for(const n of names){if(Object.prototype.hasOwnProperty.call(row,n)) return row[n];}return "";}
function fmt(v,metric,percentile=false){
  if(v===null||v===undefined||clean(v)===""||clean(v).toUpperCase()==="N/A") return "N/A";
  let n=num(v); if(n===null) return clean(v);
  if(percentile){if(n<=1)n*=100;return `${Math.round(n)}%`;}
  if(isPctMetric(metric)){if(n<=1)n*=100;return `${Math.round(n)}%`;}
  return n.toFixed(2);
}
function pctValue(v){let n=num(v);if(n===null)return null;return n<=1?n*100:n;}
function rowsFor(player,season){
  const team=$("team") ? $("team").value : "All Teams";
  return DATA.filter(r=>{
    const playerMatch=clean(field(r,["Player"]))===player;
    const seasonMatch=clean(field(r,["Season"]))===season;
    const teamMatch=team==="All Teams" || clean(field(r,["Team"]))===team;
    return playerMatch && seasonMatch && teamMatch;
  });
}
function metric(rows,name){return rows.find(r=>clean(field(r,["Metric"]))===name);}
function sortRows(rows){
  return [...rows].sort((a,b)=>{
    const ca=clean(field(a,["Category"])), cb=clean(field(b,["Category"]));
    const ia=CATEGORY_ORDER.indexOf(ca), ib=CATEGORY_ORDER.indexOf(cb);
    const ra=ia===-1?999:ia, rb=ib===-1?999:ib;

    if(ra!==rb) return ra-rb;

    const ma=clean(field(a,["Metric"]));
    const mb=clean(field(b,["Metric"]));
    const order=METRIC_ORDER[ca] || [];
    const mia=order.indexOf(ma), mib=order.indexOf(mb);
    const mra=mia===-1?999:mia, mrb=mib===-1?999:mib;

    if(mra!==mrb) return mra-mrb;
    return ma.localeCompare(mb);
  });
}
function render(){
  const player=$("player").value, season=$("season").value, rows=rowsFor(player,season);
  if(!rows.length)return;
  const first=rows[0];
  $("playerName").textContent=player;
  $("playerMeta").textContent=`${clean(field(first,["Position"]))} · ${clean(field(first,["Team"]))}`;
  $("gp").textContent=clean(field(first,["Season GP","Games played","Games Played"]))||"—";
  $("pts").textContent=clean(field(first,["Season Points"]))||"0";
  $("goals").textContent=clean(field(first,["Season Goals"]))||"0";
  $("assists").textContent=clean(field(first,["Season Assists"]))||"0";
  $("pim").textContent=clean(field(first,["Season PIM"]))||"0";

  const body=$("metrics");body.innerHTML="";let previousCategory=null;
  sortRows(rows).forEach(r=>{
    const category=clean(field(r,["Category"])),m=clean(field(r,["Metric"])),pp=pctValue(field(r,["Percentile"]));
    const tr=document.createElement("tr");
    if(previousCategory!==null&&category!==previousCategory)tr.classList.add("category-start");
    previousCategory=category;
    tr.innerHTML=`<td>${category}</td><td>${m}</td><td>${fmt(field(r,["Player Value","Per-game value"]),m)}</td><td>${fmt(field(r,["ECHL Avg"]),m)}</td><td>${pp===null?"N/A":`<div class="pct"><span>${Math.round(pp)}%</span><span class="bar"><i style="width:${Math.max(0,Math.min(100,pp))}%"></i></span></div>`}</td>`;
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
}
function populate(){
  const seasons=[...new Set(DATA.map(r=>clean(field(r,["Season"]))).filter(Boolean))].sort().reverse();
  $("season").innerHTML=seasons.map(s=>`<option>${s}</option>`).join("");
  if(seasons.includes("2025-26"))$("season").value="2025-26";
  refreshTeams();
  refreshPlayers();
}
function allPlayers(){
  return [...new Set(DATA.map(r=>clean(field(r,["Player"]))).filter(Boolean))].sort();
}
function latestSeasonForPlayer(player){
  const seasons=[...new Set(DATA.filter(r=>clean(field(r,["Player"]))===player).map(r=>clean(field(r,["Season"]))).filter(Boolean))];
  return seasons.sort((a,b)=>b.localeCompare(a))[0]||"";
}

function teamsForSeason(season){
  return [...new Set(
    DATA.filter(r=>clean(field(r,["Season"]))===season)
        .map(r=>clean(field(r,["Team"])))
        .filter(Boolean)
  )].sort();
}
function teamForPlayerSeason(player,season){
  const row=DATA.find(r=>clean(field(r,["Player"]))===player && clean(field(r,["Season"]))===season);
  return row ? clean(field(row,["Team"])) : "";
}
function playersForCurrentFilters(){
  const season=$("season").value;
  const team=$("team").value;
  return [...new Set(
    DATA.filter(r=>{
      const seasonMatch=clean(field(r,["Season"]))===season;
      const teamMatch=team==="All Teams" || clean(field(r,["Team"]))===team;
      return seasonMatch && teamMatch;
    }).map(r=>clean(field(r,["Player"]))).filter(Boolean)
  )].sort();
}
function refreshTeams(preferredTeam=""){
  const season=$("season").value;
  const teams=teamsForSeason(season);
  $("team").innerHTML=['All Teams',...teams].map(t=>`<option value="${t.replace(/"/g,"&quot;")}">${t}</option>`).join("");
  if(preferredTeam && teams.includes(preferredTeam)) $("team").value=preferredTeam;
  else $("team").value="All Teams";
}
function cyclePlayer(direction){
  const players=playersForCurrentFilters();
  if(!players.length) return;
  let current=$("player").value;
  let idx=players.indexOf(current);
  if(idx===-1) idx=direction>0?-1:0;
  idx=(idx+direction+players.length)%players.length;
  $("player").value=players[idx];
  render();
}

function findBestPlayerMatch(query){
  const q=clean(query).toLowerCase();
  if(!q) return "";
  const players=allPlayers();
  const exact=players.find(p=>p.toLowerCase()===q);
  if(exact) return exact;
  const starts=players.filter(p=>p.toLowerCase().startsWith(q));
  if(starts.length) return starts[0];
  const contains=players.filter(p=>p.toLowerCase().includes(q));
  return contains.length?contains[0]:"";
}
function resolvePlayerSearch(){
  const match=findBestPlayerMatch($("player").value);
  if(!match) return;
  $("player").value=match;
  const latest=latestSeasonForPlayer(match);
  if(latest) $("season").value=latest;
  const team=teamForPlayerSeason(match,latest);
  refreshTeams(team);
  render();
}
function refreshPlayers(){
  const players=allPlayers();
  $("players").innerHTML=players.map(p=>`<option value="${p.replace(/"/g,"&quot;")}"></option>`).join("");
  const filteredPlayers=playersForCurrentFilters();
  const current=$("player").value;
  if(!filteredPlayers.includes(current)){
    $("player").value=filteredPlayers.includes("Kyle Neuber")?"Kyle Neuber":(filteredPlayers[0]||"");
  }
  render();
}
function selectPlayerLatestSeason(){
  const player=$("player").value;
  if(!allPlayers().includes(player)) return;
  const latest=latestSeasonForPlayer(player);
  if(latest)$("season").value=latest;
  const team=teamForPlayerSeason(player,latest);
  refreshTeams(team);
  render();
}
$("season").addEventListener("change",()=>{
  refreshTeams();
  refreshPlayers();
});
$("team").addEventListener("change",()=>{
  refreshPlayers();
});
$("player").addEventListener("change",resolvePlayerSearch);
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
$("player").addEventListener("blur",resolvePlayerSearch);
$("player").addEventListener("input",()=>{
  const exact=allPlayers().find(p=>p.toLowerCase()===$("player").value.toLowerCase());
  if(exact){
    $("player").value=exact;
    selectPlayerLatestSeason();
  }
});


function parseCSV(text){
  const rows=[];
  let row=[], field="", inQuotes=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(inQuotes){
      if(ch === '"'){
        if(text[i+1] === '"'){ field+='"'; i++; }
        else inQuotes=false;
      }else{
        field+=ch;
      }
    }else{
      if(ch === '"') inQuotes=true;
      else if(ch === ','){ row.push(field); field=""; }
      else if(ch === '\n'){
        row.push(field); field="";
        if(row.some(v=>v!=="")) rows.push(row);
        row=[];
      }else if(ch !== '\r'){
        field+=ch;
      }
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

fetch("./ECHL_Player_Analytics.csv?v=24", {cache:"no-store"})
  .then(response=>{
    if(!response.ok) throw new Error(`CSV request failed: ${response.status}`);
    return response.text();
  })
  .then(text=>{
    DATA=parseCSV(text);
    if(!DATA.length) throw new Error("CSV loaded but contained no rows");
    populate();
  })
  .catch(error=>{
    console.error(error);
    $("playerName").textContent="Could not load analytics data";
    $("playerMeta").textContent="Refresh the page or verify ECHL_Player_Analytics.csv is in the repository.";
  });
