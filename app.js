
let DATA=[], chart;
const $=id=>document.getElementById(id);
const clean=v => (v===undefined||v===null) ? "" : String(v).trim();
const num=v => { const n=parseFloat(clean(v).replace("%","")); return Number.isFinite(n)?n:null; };
const isPctMetric=m => /%$/.test(clean(m)) || ["CORSI For %","Fenwick For %","xG For %","Faceoff Win %","Accurate Passes %","Puck Battles Won %","DZ Puck Losses"].includes(clean(m));
function field(row, names){ for(const n of names){ if(Object.prototype.hasOwnProperty.call(row,n)) return row[n]; } return ""; }
function fmt(v, metric, percentile=false){
  if(v===null||v===undefined||clean(v)===""||clean(v).toUpperCase()==="N/A") return "N/A";
  let n=num(v); if(n===null) return clean(v);
  if(percentile) { if(n<=1) n*=100; return `${Math.round(n)}%`; }
  if(isPctMetric(metric)){ if(n<=1) n*=100; return `${Math.round(n)}%`; }
  return n.toFixed(2);
}
function rowsFor(player,season){return DATA.filter(r=>clean(field(r,["Player"]))===player && clean(field(r,["Season"]))===season)}
function metric(rows,name){return rows.find(r=>clean(field(r,["Metric"]))===name)}
function render(){
  const player=$("player").value, season=$("season").value, rows=rowsFor(player,season);
  if(!rows.length) return;
  const first=rows[0];
  $("playerName").textContent=player;
  $("playerMeta").textContent=`${clean(field(first,["Position"]))} · ${clean(field(first,["Team"]))}`;
  $("gp").textContent=clean(field(first,["Games played","Games Played"]))||"—";
  const setStat=(id,name)=>{const r=metric(rows,name); $(id).textContent=r?fmt(field(r,["Player Value","Per-game value"]),name):"—"};
  setStat("toi","TOI"); setStat("cf","CORSI For %"); setStat("ff","Fenwick For %"); setStat("xgf","xG For %");

  const body=$("metrics"); body.innerHTML="";
  rows.forEach(r=>{
    const m=clean(field(r,["Metric"])), p=field(r,["Percentile"]), pn=num(p);
    let pp=pn===null?null:(pn<=1?pn*100:pn);
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${clean(field(r,["Category"]))}</td><td>${m}</td><td>${fmt(field(r,["Player Value","Per-game value"]),m)}</td><td>${fmt(field(r,["ECHL Avg"]),m)}</td>
    <td>${pp===null?"N/A":`<div class="pct"><span>${Math.round(pp)}%</span><span class="bar"><i style="width:${Math.max(0,Math.min(100,pp))}%"></i></span></div>`}</td>`;
    body.appendChild(tr);
  });

  const wanted=["CORSI For %","Fenwick For %","xG For %","Puck Losses","DZ Puck Losses","Accurate Passes %","Puck Battles Won %","Faceoff Win %"];
  const chartRows=wanted.map(name=>metric(rows,name)).filter(Boolean).map(r=>({label:clean(field(r,["Metric"])),value:(()=>{let n=num(field(r,["Percentile"]));return n===null?null:(n<=1?n*100:n)})()})).filter(x=>x.value!==null);
  if(chart) chart.destroy();
  chart=new Chart($("profileChart"),{type:"bar",data:{labels:chartRows.map(x=>x.label),datasets:[{data:chartRows.map(x=>x.value),borderWidth:0}]},
    options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${Math.round(c.raw)}th percentile`}}},
      scales:{x:{min:0,max:100,ticks:{callback:v=>v+"%",color:"#9fb0c6"},grid:{color:"#26354a"}},y:{ticks:{color:"#f4f7fb"},grid:{display:false}}}}});
}
function populate(){
  const seasons=[...new Set(DATA.map(r=>clean(field(r,["Season"]))).filter(Boolean))].sort().reverse();
  $("season").innerHTML=seasons.map(s=>`<option>${s}</option>`).join("");
  if(seasons.includes("2025-26")) $("season").value="2025-26";
  refreshPlayers();
}
function refreshPlayers(){
  const season=$("season").value;
  const players=[...new Set(DATA.filter(r=>clean(field(r,["Season"]))===season).map(r=>clean(field(r,["Player"]))).filter(Boolean))].sort();
  $("players").innerHTML=players.map(p=>`<option value="${p.replace(/"/g,"&quot;")}"></option>`).join("");
  const preferred=players.includes("Kyle Neuber")?"Kyle Neuber":players[0];
  if(!players.includes($("player").value)) $("player").value=preferred||"";
  render();
}
$("season").addEventListener("change",refreshPlayers);
$("player").addEventListener("change",render);
$("player").addEventListener("input",()=>{if([...$("players").options].some(o=>o.value===$("player").value))render()});
Papa.parse("ECHL_Player_Analytics.csv",{download:true,header:true,dynamicTyping:false,skipEmptyLines:true,complete:r=>{DATA=r.data;populate();},error:e=>{document.body.innerHTML=`<pre>Could not load CSV: ${e}</pre>`}});
