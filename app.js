
let DATA=[];
const $=id=>document.getElementById(id);
const clean=v => (v===undefined||v===null) ? "" : String(v).trim();
const num=v => { const n=parseFloat(clean(v).replace("%","")); return Number.isFinite(n)?n:null; };
const isPctMetric=m => /%$/.test(clean(m)) || ["CORSI For %","Fenwick For %","xG For %","Faceoff Win %","Accurate Passes %","Puck Battles Won %","DZ Puck Losses"].includes(clean(m));
const CATEGORY_ORDER=["Offense","Possession","Puck Management","Discipline","Skill","Role / Context","Role"];
const METRIC_ORDER={
  "Offense":[
    "Goals",
    "Expected Goals",
    "First Assists",
    "Second Assists",
    "Points",
    "Scoring Chances",
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
    "Puck Losses",
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
const CHART_METRICS=["Points","Expected Goals","CORSI For %","xG For %","Puck Losses","TOI","Hits"];

function field(row,names){for(const n of names){if(Object.prototype.hasOwnProperty.call(row,n)) return row[n];}return "";}
function fmt(v,metric,percentile=false){
  if(v===null||v===undefined||clean(v)===""||clean(v).toUpperCase()==="N/A") return "N/A";
  let n=num(v); if(n===null) return clean(v);
  if(percentile){if(n<=1)n*=100;return `${Math.round(n)}%`;}
  if(isPctMetric(metric)){if(n<=1)n*=100;return `${Math.round(n)}%`;}
  return n.toFixed(2);
}
function pctValue(v){let n=num(v);if(n===null)return null;return n<=1?n*100:n;}
function rowsFor(player,season){return DATA.filter(r=>clean(field(r,["Player"]))===player&&clean(field(r,["Season"]))===season);}
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
      <div class="percentile-card-box" style="background:${x.value<50?\'#8a4650\':\'#1d5d8d\'};border-color:${x.value<50?\'#a65a64\':\'#3b6d95\'}">${Math.round(x.value)}%</div>
    </div>
  `).join("");
}
function populate(){
  const seasons=[...new Set(DATA.map(r=>clean(field(r,["Season"]))).filter(Boolean))].sort().reverse();
  $("season").innerHTML=seasons.map(s=>`<option>${s}</option>`).join("");
  if(seasons.includes("2025-26"))$("season").value="2025-26";
  refreshPlayers();
}
function allPlayers(){
  return [...new Set(DATA.map(r=>clean(field(r,["Player"]))).filter(Boolean))].sort();
}
function latestSeasonForPlayer(player){
  const seasons=[...new Set(DATA.filter(r=>clean(field(r,["Player"]))===player).map(r=>clean(field(r,["Season"]))).filter(Boolean))];
  return seasons.sort((a,b)=>b.localeCompare(a))[0]||"";
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
  render();
}
function refreshPlayers(){
  const players=allPlayers();
  $("players").innerHTML=players.map(p=>`<option value="${p.replace(/"/g,"&quot;")}"></option>`).join("");
  const current=$("player").value;
  if(!players.includes(current)){
    const seasonPlayers=[...new Set(DATA.filter(r=>clean(field(r,["Season"]))===$("season").value).map(r=>clean(field(r,["Player"]))).filter(Boolean))].sort();
    $("player").value=seasonPlayers.includes("Kyle Neuber")?"Kyle Neuber":(seasonPlayers[0]||players[0]||"");
  }
  render();
}
function selectPlayerLatestSeason(){
  const player=$("player").value;
  if(!allPlayers().includes(player)) return;
  const latest=latestSeasonForPlayer(player);
  if(latest)$("season").value=latest;
  render();
}
$("season").addEventListener("change",()=>{
  const season=$("season").value;
  const players=[...new Set(DATA.filter(r=>clean(field(r,["Season"]))===season).map(r=>clean(field(r,["Player"]))).filter(Boolean))].sort();
  if(!players.includes($("player").value))$("player").value=players.includes("Kyle Neuber")?"Kyle Neuber":(players[0]||"");
  render();
});
$("player").addEventListener("change",resolvePlayerSearch);
$("player").addEventListener("keydown",e=>{
  if(e.key==="Enter"){
    e.preventDefault();
    resolvePlayerSearch();
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

if(typeof Papa==="undefined"){
  $("playerName").textContent="Could not load analytics library";
}else{
  Papa.parse("./ECHL_Player_Analytics.csv?v=16",{
    download:true,header:true,dynamicTyping:false,skipEmptyLines:true,
    complete:r=>{DATA=r.data;populate();},
    error:e=>{
      $("playerName").textContent="Could not load analytics data";
      console.error(e);
    }
  });
}
