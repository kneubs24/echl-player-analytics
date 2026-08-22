
let DATA=[], chart;
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
const CHART_METRICS=["CORSI For %","Fenwick For %","xG For %","Puck Losses","DZ Puck Losses","Accurate Passes %","Puck Battles Won %","Faceoff Win %"];

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

  const chartRows=CHART_METRICS.map(name=>metric(rows,name)).filter(Boolean).map(r=>({label:clean(field(r,["Metric"])),value:pctValue(field(r,["Percentile"]))})).filter(x=>x.value!==null);
  if(chart)chart.destroy();
  const labelPlugin={id:"barValueLabels",afterDatasetsDraw(c){const{ctx}=c;ctx.save();ctx.fillStyle="#f4f7fb";ctx.font="700 12px Segoe UI, Arial";ctx.textBaseline="middle";const meta=c.getDatasetMeta(0);meta.data.forEach((bar,i)=>{const v=c.data.datasets[0].data[i];ctx.fillText(`${Math.round(v)}%`,Math.min(bar.x+8,c.chartArea.right-34),bar.y);});ctx.restore();}};
  chart=new Chart($("profileChart"),{
    type:"bar",
    data:{labels:chartRows.map(x=>x.label),datasets:[{data:chartRows.map(x=>x.value),borderWidth:0}]},
    plugins:[labelPlugin],
    options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,layout:{padding:{right:42}},
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${Math.round(c.raw)}th percentile`}},
        annotation:{annotations:{medianLine:{type:"line",xMin:50,xMax:50,borderColor:"#c7d4e4",borderWidth:1.5,borderDash:[6,6],label:{display:true,content:"50th",position:"start",color:"#c7d4e4",backgroundColor:"rgba(11,18,32,.9)"}}}}},
      scales:{x:{min:0,max:100,ticks:{callback:v=>v+"%",color:"#9fb0c6"},grid:{color:"#26354a"}},y:{ticks:{color:"#f4f7fb"},grid:{display:false}}}}
  });
}
function populate(){
  const seasons=[...new Set(DATA.map(r=>clean(field(r,["Season"]))).filter(Boolean))].sort().reverse();
  $("season").innerHTML=seasons.map(s=>`<option>${s}</option>`).join("");
  if(seasons.includes("2025-26"))$("season").value="2025-26";
  refreshPlayers();
}
function refreshPlayers(){
  const season=$("season").value;
  const players=[...new Set(DATA.filter(r=>clean(field(r,["Season"]))===season).map(r=>clean(field(r,["Player"]))).filter(Boolean))].sort();
  $("players").innerHTML=players.map(p=>`<option value="${p.replace(/"/g,"&quot;")}"></option>`).join("");
  const preferred=players.includes("Kyle Neuber")?"Kyle Neuber":players[0];
  if(!players.includes($("player").value))$("player").value=preferred||"";
  render();
}
$("season").addEventListener("change",refreshPlayers);
$("player").addEventListener("change",render);
$("player").addEventListener("input",()=>{if([...$("players").options].some(o=>o.value===$("player").value))render();});

if(typeof Papa==="undefined"){
  $("playerName").textContent="Could not load analytics library";
}else{
  Papa.parse("./ECHL_Player_Analytics.csv?v=9",{
    download:true,header:true,dynamicTyping:false,skipEmptyLines:true,
    complete:r=>{DATA=r.data;populate();},
    error:e=>{
      $("playerName").textContent="Could not load analytics data";
      console.error(e);
    }
  });
}
