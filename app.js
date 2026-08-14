/* =========================================================
   VolleyTeam Manager — logica applicativa
   Dati in un unico oggetto DB persistito in localStorage.
   ========================================================= */
'use strict';

const LS_KEY = 'volleyteam_db';
const MONTHS = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const today = () => new Date(new Date().toDateString());

/* =========================================================
   SCOUT — schemi per sport (una engine, tre tabellini).
   La schermata scout si costruisce da qui in base a DB.sport.
   ========================================================= */
function curSport(){ try{ return (DB && DB.sport) || 'pallavolo'; }catch(e){ return 'pallavolo'; } }
const clampVoto = v => Math.max(2.0, Math.min(10.0, v));

const SCOUT = {
  pallavolo:{
    groups:[
      {label:'Battuta',   fields:[['bErr','Err'],['bAce','Ace']]},
      {label:'Ricezione', fields:[['rTot','Tot'],['rPos','Pos'],['rPrf','Prf']]},
      {label:'Attacco',   fields:[['aTot','Tot'],['aErr','Err'],['aPt','Pt']]},
      {label:'Muro',      fields:[['mPt','Pt']]}
    ],
    voto(s){
      let parts=0, w=0;
      if(s.aTot>0){ const e=(s.aPt-s.aErr)/s.aTot; parts+=Math.max(-1,Math.min(1,e))*s.aTot; w+=s.aTot; }              // efficienza attacco
      if(s.rTot>0){ const err=s.rTot-s.rPos-s.rPrf; const e=(s.rPrf+s.rPos*0.5-err)/s.rTot; parts+=Math.max(-1,Math.min(1,e))*s.rTot; w+=s.rTot; } // qualità ricezione
      const eff = w? parts/w : 0;                 // -1..+1
      const conf = Math.min(1, w/10);             // poche azioni -> tira verso il 6
      let v = 6.0 + eff*3.2*conf;                 // nucleo su efficienza, normalizzato per volume
      v += s.bAce*0.18 - s.bErr*0.30 + s.mPt*0.22; // battuta e muro come plus/minus contenuti
      return clampVoto(v);
    },
    season(a){
      const atk=a.aTot?Math.round((a.aPt-a.aErr)/a.aTot*100):null;
      const rec=a.rTot?Math.round((a.rPos+a.rPrf)/a.rTot*100):null;
      return [['Efficienza attacco',atk!=null?atk:'—',atk!=null?'%':''],
              ['Ricezione positiva',rec!=null?rec:'—',rec!=null?'%':''],
              ['Ace totali',a.bAce||0,''],['Muri punto',a.mPt||0,'']];
    },
    note:'Voto: algoritmo dinamico (base 6.0) su battuta, ricezione, attacco e muro.'
  },
  calcio:{
    groups:[
      {label:'Offensiva',  fields:[['gol','Gol'],['assist','Ass'],['tiri','Tiri'],['tiriP','In porta']]},
      {label:'Disciplina', fields:[['falli','Falli'],['amm','Amm'],['esp','Esp']]},
      {label:'Portiere',   fields:[['parate','Parate'],['subiti','Subiti']]},
      {label:'',           fields:[['min','Min']]}
    ],
    voto(s){
      let v=6.0;
      v+=s.gol*1.0 + s.assist*0.6 + s.tiriP*0.1 + s.parate*0.15;
      v-=s.subiti*0.25 + s.falli*0.05 + s.amm*0.3 + s.esp*1.5;
      return clampVoto(v);
    },
    season(a){
      return [['Gol',a.gol||0,''],['Assist',a.assist||0,''],
              ['Tiri in porta',a.tiriP||0,''],['Parate',a.parate||0,''],
              ['Ammonizioni',a.amm||0,'']];
    },
    note:'Voto (base 6.0): +gol, assist, parate · −gol subiti, falli, cartellini.'
  },
  basket:{
    groups:[
      {label:'',        fields:[['punti','Pt']]},
      {label:'Rimbalzi',fields:[['roff','Off'],['rdif','Dif']]},
      {label:'',        fields:[['assist','Ass'],['rubate','Rub'],['perse','Perse'],['stoppate','Stop'],['falli','Falli']]},
      {label:'2 Punti', fields:[['fg2m','Fatti'],['fg2a','Tent']]},
      {label:'3 Punti', fields:[['fg3m','Fatti'],['fg3a','Tent']]},
      {label:'Liberi',  fields:[['ftm','Fatti'],['fta','Tent']]},
      {label:'',        fields:[['min','Min']]}
    ],
    voto(s){
      const miss=(s.fg2a-s.fg2m)+(s.fg3a-s.fg3m)+(s.fta-s.ftm);
      const val=s.punti+(s.roff+s.rdif)+s.assist+s.rubate+s.stoppate-s.perse-miss-s.falli*0.5;
      return clampVoto(6.0+val*0.15);
    },
    season(a){
      const p3=a.fg3a?Math.round(a.fg3m/a.fg3a*100):null;
      return [['Punti',a.punti||0,''],['Rimbalzi',(a.roff||0)+(a.rdif||0),''],
              ['Assist',a.assist||0,''],['% da 3',p3!=null?p3:'—',p3!=null?'%':''],
              ['Stoppate',a.stoppate||0,'']];
    },
    note:'Voto (base 6.0) dalla valutazione: punti, rimbalzi, assist, rubate, stoppate − perse, errori al tiro, falli.'
  }
};
function scoutFields(sport){ return SCOUT[sport||curSport()].groups.flatMap(g=>g.fields.map(f=>f[0])); }
function blankStat(sport){ const o={}; scoutFields(sport).forEach(k=>o[k]=0); return o; }
function computeVoto(s, sport){ return SCOUT[sport||curSport()].voto(s); }

/* ---------- SEED (dati d'esempio per non partire vuoti) ---------- */
function seedDB(){
    const players = [
        {id:1,name:'Giuseppe Manunta',number:10,role:'Centrale',hand:'Dx',height:196,status:'active',isCaptain:true,isViceCaptain:false},
        {id:2,name:'Federico Tola',number:7,role:'Schiacciatore',hand:'Dx',height:188,status:'active',isCaptain:false,isViceCaptain:true},
        {id:3,name:'Matteo Sanna',number:1,role:'Palleggiatore',hand:'Dx',height:182,status:'active',isCaptain:false,isViceCaptain:false},
        {id:4,name:'Luca Pinna',number:9,role:'Opposto',hand:'Dx',height:191,status:'active',isCaptain:false,isViceCaptain:false},
        {id:5,name:'Andrea Ruiu',number:4,role:'Libero',hand:'Dx',height:178,status:'active',isCaptain:false,isViceCaptain:false},
        {id:6,name:'Marco Vacca',number:13,role:'Schiacciatore',hand:'Sx',height:185,status:'injured',isCaptain:false,isViceCaptain:false}
    ];
    const events = [
        {id:201,type:'Partita',date:'2026-06-07',notes:'vs San Pio X',result:{w:3,l:1}},
        {id:202,type:'Allenamento',date:'2026-06-10',notes:'Ricezione + Palleggio'},
        {id:203,type:'Allenamento',date:'2026-06-12',notes:'Fase cambio-palla'},
        {id:204,type:'Partita',date:'2026-06-14',notes:'vs Dinamo BVL',result:{w:1,l:3}},
        {id:205,type:'Allenamento',date:'2026-06-29',notes:'Battuta in salto'},
        {id:206,type:'Partita',date:'2026-07-04',notes:'vs Ferrini',result:null}
    ];
    // tabellini d'esempio
    const mk = (pId,o)=>{const s=Object.assign(blankStat(),o);return{pId,...s,voto:+computeVoto(s).toFixed(1)};};
    const scoutHistory = [
        {matchId:201,date:'2026-06-07',opponent:'vs San Pio X',rows:[
            mk(1,{bAce:2,bErr:1,aTot:18,aErr:3,aPt:11,mPt:4}),
            mk(2,{bAce:1,bErr:2,rTot:22,rPos:15,rPrf:9,aTot:24,aErr:5,aPt:13}),
            mk(3,{bAce:0,bErr:1,aTot:4,aErr:1,aPt:2,mPt:1}),
            mk(4,{bAce:3,bErr:2,aTot:26,aErr:6,aPt:15}),
            mk(5,{rTot:30,rPos:22,rPrf:14}),
        ]},
        {matchId:204,date:'2026-06-14',opponent:'vs Dinamo BVL',rows:[
            mk(1,{bAce:1,bErr:2,aTot:15,aErr:5,aPt:7,mPt:2}),
            mk(2,{bAce:0,bErr:3,rTot:20,rPos:9,rPrf:5,aTot:22,aErr:8,aPt:9}),
            mk(3,{bAce:0,bErr:0,aTot:3,aErr:1,aPt:1,mPt:0}),
            mk(4,{bAce:2,bErr:4,aTot:25,aErr:9,aPt:11}),
            mk(5,{rTot:28,rPos:14,rPrf:8}),
        ]}
    ];
    const attendance = {
        202:{1:'present',2:'present',3:'present',4:'absent',5:'present',6:'excused'},
        203:{1:'present',2:'present',3:'absent',4:'present',5:'present',6:'excused'}
    };
    const rotationStats = {
        201:{P1:{f:6,s:4},P2:{f:5,s:6},P3:{f:8,s:3},P4:{f:4,s:7},P5:{f:7,s:4},P6:{f:6,s:5}}
    };
    const trainings = {
        202:{exercises:[{id:1,name:'Ricezione in bagher zona 5',cat:'Ricezione'},{id:2,name:'Palleggio in salto',cat:'Palleggio'}],
             grades:{1:{1:6,2:7},2:{1:6.5,2:7},3:{1:5.5,2:8},4:{1:6},5:{1:8,2:6.5}},
             notes:{2:'Buona spinta gambe, controlla la chiusura del piano.',5:'Ottima lettura in ricezione.'}},
        203:{exercises:[{id:1,name:'Attacco da posto 4',cat:'Attacco'},{id:2,name:'Muro di reparto',cat:'Muro'}],
             grades:{1:{1:6,2:7},2:{1:7.5,2:6},4:{1:7,2:6.5},5:{1:6}},
             notes:{2:'Bel braccio, varia di più le mani.'}}
    };
    return {teamName:'TEAM',players,events,scoutHistory,attendance,rotationStats,trainings,nextId:300};
}

/* ---------- LOAD / SAVE ---------- */
function loadDB(){
    try{
        const raw = localStorage.getItem(LS_KEY);
        if(raw) return JSON.parse(raw);
    }catch(e){ console.warn('DB corrotto, ricreo.', e); }
    // migrazione dalla vecchia versione VolleyStats 2.0
    try{
        const oldP = JSON.parse(localStorage.getItem('volley_players'));
        if(oldP && oldP.length){
            const db = seedDB();
            db.players = oldP.map(p=>({...p,hand:p.hand||'Dx',height:p.height||0,status:p.status||'active'}));
            db.events = JSON.parse(localStorage.getItem('volley_events')) || db.events;
            db.teamName = localStorage.getItem('volley_team_name') || 'TEAM';
            db.scoutHistory = []; db.attendance = {}; db.rotationStats = {};
            return db;
        }
    }catch(e){}
    return seedDB();
}
let DB = loadDB();
if(!DB.trainings) DB.trainings = {};
if(!DB.nextId) DB.nextId = Date.now();
function save(){ localStorage.setItem(LS_KEY, JSON.stringify(DB)); }
function uid(){ return DB.nextId++; }

/* ---------- HELPERS DATI ---------- */
function playerById(id){ return DB.players.find(p=>p.id===id); }
function activePlayers(){ return DB.players.filter(p=>p.status!=='suspended'); }
function fmtDate(iso){ const d=new Date(iso); return `${String(d.getDate()).padStart(2,'0')} ${MONTHS[d.getMonth()]}`; }
function fmtDateLong(iso){ const d=new Date(iso); return `${String(d.getDate()).padStart(2,'0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }

function getPlayerVoti(pId){
    const out=[];
    DB.scoutHistory.slice().sort((a,b)=>new Date(a.date)-new Date(b.date)).forEach(m=>{
        const r=m.rows.find(x=>x.pId===pId);
        if(r) out.push({date:m.date,voto:r.voto,opp:m.opponent});
    });
    return out;
}
function getSeasonStats(pId){
    const sport=curSport();
    const acc={...blankStat(sport),matches:0,voti:[]};
    const fields=scoutFields(sport);
    DB.scoutHistory.forEach(m=>{
        const r=m.rows.find(x=>x.pId===pId);
        if(!r) return;
        acc.matches++; acc.voti.push(r.voto);
        fields.forEach(k=>acc[k]+=r[k]||0);
    });
    acc.avgVoto = acc.voti.length? (acc.voti.reduce((a,b)=>a+b,0)/acc.voti.length):null;
    acc.lastVoto = acc.voti.length? acc.voti[acc.voti.length-1]:null;
    acc.cells = SCOUT[sport].season(acc);
    return acc;
}
function playerForm(pId){ // confronto media ultime 2 vs precedenti
    const v=getPlayerVoti(pId).map(x=>x.voto);
    if(v.length<2) return {dir:'flat',txt:'—'};
    const last=v.slice(-2), prev=v.slice(0,-2);
    const la=last.reduce((a,b)=>a+b,0)/last.length;
    const pa=prev.length? prev.reduce((a,b)=>a+b,0)/prev.length : la;
    const d=la-pa;
    if(d>0.25) return {dir:'up',txt:'↑ in crescita'};
    if(d<-0.25) return {dir:'down',txt:'↓ in calo'};
    return {dir:'flat',txt:'→ stabile'};
}
function playerAttendance(pId){
    let pres=0,tot=0;
    DB.events.filter(e=>e.type==='Allenamento').forEach(e=>{
        const a=DB.attendance[e.id];
        if(a && a[pId]){ if(a[pId]!=='excused'){tot++; if(a[pId]==='present')pres++;} }
    });
    return tot? Math.round(pres/tot*100):null;
}
function teamAvgVoto(){
    const all=DB.scoutHistory.flatMap(m=>m.rows.map(r=>r.voto));
    return all.length? (all.reduce((a,b)=>a+b,0)/all.length):null;
}
function teamRecord(){
    let w=0,l=0;
    DB.events.forEach(e=>{ if(e.type==='Partita'&&e.result){ if(e.result.w>e.result.l)w++; else l++; }});
    return {w,l};
}
function nextEvent(){
    const t=today();
    return DB.events.filter(e=>new Date(e.date)>=t).sort((a,b)=>new Date(a.date)-new Date(b.date))[0]||null;
}
function teamAttendancePct(){
    let pres=0,tot=0;
    Object.values(DB.attendance).forEach(map=>Object.values(map).forEach(v=>{
        if(v!=='excused'){tot++; if(v==='present')pres++;}
    }));
    return tot? Math.round(pres/tot*100):null;
}

/* ---------- CHARTS (SVG, zero dipendenze) ---------- */
function svgLine(values, opts={}){
    if(!values.length) return '<div class="empty-chart">Nessun voto registrato</div>';
    const w=opts.w||560, h=opts.h||170, pad=28, min=opts.min??2, max=opts.max??10;
    const iw=w-pad*2, ih=h-pad*2, n=values.length;
    const X=i=> pad + (n===1? iw/2 : iw*i/(n-1));
    const Y=v=> pad + ih*(1-(v-min)/(max-min));
    const pts=values.map((v,i)=>`${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
    const area=`${pad},${(pad+ih).toFixed(1)} ${pts} ${(pad+iw).toFixed(1)},${(pad+ih).toFixed(1)}`;
    let grid='';
    [4,6,8].forEach(g=>{const y=Y(g);grid+=`<line x1="${pad}" y1="${y}" x2="${pad+iw}" y2="${y}"/><text class="chart-axis" x="${pad-6}" y="${y+3}" text-anchor="end">${g}</text>`;});
    const dots=values.map((v,i)=>`<circle class="spark-dot" cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="3.6"/>`).join('');
    return `<div class="chart-box"><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
        <defs><linearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--brand)" stop-opacity=".28"/><stop offset="100%" stop-color="var(--brand)" stop-opacity="0"/></linearGradient></defs>
        <g class="chart-grid">${grid}</g>
        <polygon class="spark-area" points="${area}"/>
        <polyline class="spark-line" points="${pts}"/>${dots}</svg></div>`;
}
function svgBars(items, opts={}){
    if(!items.length) return '<div class="empty-chart">Nessun dato</div>';
    const w=opts.w||560, bh=34, gap=12, pad=70, h=items.length*(bh+gap)+gap;
    const maxV=Math.max(1,...items.map(i=>Math.abs(i.value)));
    let body='';
    items.forEach((it,idx)=>{
        const y=gap+idx*(bh+gap);
        const bw=(w-pad-20)*(Math.abs(it.value)/maxV);
        const col=it.color||'var(--brand)';
        body+=`<text class="chart-axis" x="0" y="${y+bh/2+4}" font-weight="700" fill="var(--text)">${it.label}</text>
        <rect x="${pad}" y="${y}" width="${(w-pad-20)}" height="${bh}" rx="8" fill="var(--surface-3)"/>
        <rect x="${pad}" y="${y}" width="${bw.toFixed(1)}" height="${bh}" rx="8" fill="${col}"/>
        <text class="chart-axis" x="${w-12}" y="${y+bh/2+4}" text-anchor="end" font-weight="800" fill="var(--text)">${it.display??it.value}</text>`;
    });
    return `<div class="chart-box"><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">${body}</svg></div>`;
}

/* ---------- TOAST / MODAL / CONFIRM ---------- */
function toast(msg,type='success'){
    const stack=document.getElementById('toast-stack');
    const el=document.createElement('div');
    el.className=`toast ${type}`;
    const ic={success:'fa-circle-check',danger:'fa-circle-xmark',warning:'fa-triangle-exclamation',info:'fa-circle-info'}[type];
    el.innerHTML=`<i class="fa-solid ${ic}"></i><span>${msg}</span>`;
    stack.appendChild(el);
    setTimeout(()=>{el.style.animation='fadeOut .3s forwards';setTimeout(()=>el.remove(),300);},3200);
}
let _confirmCb=null;
function confirmAction(text,cb){
    document.getElementById('confirm-text').textContent=text;
    document.getElementById('confirm-overlay').classList.add('show');
    _confirmCb=cb;
}
function openModal(html,wide){
    const m=document.getElementById('modal');
    m.className='modal'+(wide?' wide':'');
    m.innerHTML=html;
    document.getElementById('modal-overlay').classList.add('show');
}
function closeModal(){ document.getElementById('modal-overlay').classList.remove('show'); }

/* =========================================================
   LAYOUT — costruzione delle sezioni dentro <main>
   ========================================================= */
function buildLayout(){
    document.getElementById('main').innerHTML = `
    <!-- DASHBOARD -->
    <section id="dashboard" class="section active">
        <div id="dash-content"></div>
    </section>

    <!-- ROSTER -->
    <section id="roster" class="section">
        <div class="page-head"><div><div class="eyebrow">Squadra</div><h2>Roster &amp; Ruoli</h2>
            <p class="sub">Gestisci la rosa, i ruoli di leadership e lo stato fisico. Tocca un giocatore per la scheda completa con storico e statistiche.</p></div></div>
        <div class="card">
            <h3><i class="fa-solid fa-user-plus"></i> Aggiungi atleta</h3>
            <form onsubmit="addPlayer(event)">
                <div class="form-row">
                    <div class="fg"><label>Nome e cognome</label><input id="p-name" placeholder="Es. Giuseppe Manunta" required></div>
                    <div class="fg" style="min-width:90px;max-width:110px"><label>N° maglia</label><input id="p-number" type="number" min="1" max="99" placeholder="10" required></div>
                    <div class="fg"><label>Ruolo</label><select id="p-role" required>
                        <option value="">Scegli…</option><option>Palleggiatore</option><option>Schiacciatore</option><option>Centrale</option><option>Opposto</option><option>Libero</option></select></div>
                    <div class="fg" style="min-width:80px;max-width:100px"><label>Mano</label><select id="p-hand"><option>Dx</option><option>Sx</option></select></div>
                    <div class="fg" style="min-width:90px;max-width:110px"><label>Altezza cm</label><input id="p-height" type="number" min="120" max="230" placeholder="190"></div>
                    <div class="fg" style="flex:0"><label>&nbsp;</label><button class="btn btn-accent" type="submit"><i class="fa-solid fa-plus"></i> Inserisci</button></div>
                </div>
            </form>
            <p class="hint">Tocca il numero di maglia in tabella per assegnare i gradi: Standard ➔ Capitano 👑 ➔ Vice 🥈.</p>
        </div>
        <div class="card">
            <h3><i class="fa-solid fa-users"></i> Rosa <span id="roster-count" style="color:var(--muted);font-weight:600;font-size:.85rem"></span></h3>
            <div class="table-wrap"><table>
                <thead><tr><th>Maglia</th><th style="text-align:left">Giocatore</th><th>Ruolo</th><th>Stato</th><th>Media</th><th>Forma</th><th>Pres.</th><th>Azioni</th></tr></thead>
                <tbody id="roster-body"></tbody></table></div>
        </div>
    </section>

    <!-- CALENDARIO -->
    <section id="calendario" class="section">
        <div class="page-head"><div><div class="eyebrow">Agenda</div><h2>Calendario &amp; Match</h2>
            <p class="sub">Partite e allenamenti in un'unica agenda. Sulle partite puoi registrare il risultato a set.</p></div></div>
        <div class="card">
            <h3><i class="fa-solid fa-calendar-plus"></i> Nuovo evento</h3>
            <form onsubmit="addEvent(event)"><div class="form-row">
                <div class="fg"><label>Tipo</label><select id="e-type"><option>Partita</option><option>Allenamento</option></select></div>
                <div class="fg"><label>Data</label><input id="e-date" type="date" required></div>
                <div class="fg"><label>Avversario o focus tecnico</label><input id="e-notes" placeholder="Es. vs San Pio X — oppure Ricezione" required></div>
                <div class="fg" style="flex:0"><label>&nbsp;</label><button class="btn btn-accent" type="submit"><i class="fa-solid fa-check"></i> Salva</button></div>
            </div></form>
        </div>
        <div class="card">
            <h3><i class="fa-solid fa-list-check"></i> Prossimi e passati</h3>
            <div class="table-wrap"><table>
                <thead><tr><th>Tipo</th><th>Data</th><th style="text-align:left">Dettagli</th><th>Risultato</th><th>Azioni</th></tr></thead>
                <tbody id="cal-body"></tbody></table></div>
        </div>
    </section>

    <!-- SCOUT -->
    <section id="scout" class="section">
        <div class="page-head"><div><div class="eyebrow">Analisi</div><h2>Scout Gara</h2>
            <p class="sub">Inserisci il tabellino fondamentale per fondamentale: voti e statistiche vengono salvati nello storico di ogni atleta.</p></div></div>
        <div class="card">
            <div class="fg" style="max-width:420px"><label>Partita da analizzare</label>
                <select id="scout-select" onchange="setupScout()"><option value="">Scegli una partita…</option></select></div>
        </div>
        <div class="card" id="scout-panel" style="display:none">
            <h3 id="scout-title"><i class="fa-solid fa-clipboard-list"></i> Tabellino</h3>
            <div class="table-wrap"><table class="scout-table">
                <thead id="scout-head"></thead>
                <tbody id="scout-body"></tbody>
            </table></div>
            <div style="display:flex;justify-content:flex-end;margin-top:1.2rem">
                <button class="btn btn-accent" onclick="saveScout()"><i class="fa-solid fa-floppy-disk"></i> Registra statistiche</button>
            </div>
            <div class="legend-grid" id="scout-legend"></div>
        </div>
    </section>

    <!-- ROTAZIONI -->
    <section id="rotazioni" class="section">
        <div class="page-head"><div><div class="eyebrow">Tattica avanzata</div><h2>Analisi Rotazioni</h2>
            <p class="sub">Registra punti fatti e subiti in ciascuna rotazione (P1–P6) durante la gara. Scopri subito qual è la rotazione critica della squadra.</p></div></div>
        <div class="card">
            <div class="fg" style="max-width:420px"><label>Partita</label>
                <select id="rot-select" onchange="renderRotation()"><option value="">Scegli una partita…</option></select></div>
        </div>
        <div id="rot-panel" style="display:none">
            <div class="card"><h3><i class="fa-solid fa-arrows-spin"></i> Punti per rotazione</h3>
                <div class="rot-grid" id="rot-grid"></div>
            </div>
            <div class="card"><h3><i class="fa-solid fa-chart-simple"></i> Differenziale per rotazione</h3>
                <div id="rot-chart"></div>
                <p class="hint" id="rot-insight"></p>
            </div>
        </div>
    </section>

    <!-- FORMAZIONE -->
    <section id="formazione" class="section">
        <div class="page-head"><div><div class="eyebrow">Meritocrazia</div><h2>Formazione consigliata</h2>
            <p class="sub">L'app propone i titolari in base alla media voto: per ogni ruolo gioca chi rende di più. Chi merita, gioca.</p></div></div>
        <div id="formazione-content"></div>
    </section>

    <!-- PRESENZE -->
    <section id="presenze" class="section">
        <div class="page-head"><div><div class="eyebrow">Gestione gruppo</div><h2>Presenze Allenamenti</h2>
            <p class="sub">Segna chi c'è ad ogni seduta. Tieni d'occhio la costanza del gruppo e dei singoli.</p></div></div>
        <div class="card">
            <div class="fg" style="max-width:420px"><label>Seduta di allenamento</label>
                <select id="att-select" onchange="renderAttendance()"><option value="">Scegli una seduta…</option></select></div>
        </div>
        <div class="card" id="att-panel" style="display:none">
            <h3><i class="fa-solid fa-user-check"></i> Appello</h3>
            <div id="att-list"></div>
            <div style="margin-top:1rem"><span style="font-size:.78rem;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;font-weight:600">Presenza seduta</span>
                <div class="bar-track"><div class="bar-fill" id="att-bar" style="width:0%"></div></div>
                <span class="num" id="att-pct" style="font-weight:800;font-family:'Outfit'"></span></div>
        </div>
        <div class="card"><h3><i class="fa-solid fa-ranking-star"></i> Costanza stagionale</h3>
            <div id="att-season"></div>
        </div>
    </section>

    <!-- ALLENAMENTI -->
    <section id="allenamenti" class="section">
        <div class="page-head"><div><div class="eyebrow">Programmazione</div><h2>Allenamenti &amp; Voti</h2>
            <p class="sub">Costruisci la seduta con gli esercizi e assegna un voto a ogni giocatore. Le medie confluiscono nelle schede atleta e nell'app del giocatore.</p></div></div>
        <div class="card">
            <div class="form-row">
                <div class="fg" style="max-width:420px"><label>Seduta di allenamento</label>
                    <select id="tr-select" onchange="renderTraining()"><option value="">Scegli una seduta…</option></select></div>
                <div class="fg" style="flex:0"><label>&nbsp;</label><button class="btn btn-ghost" onclick="go('calendario')"><i class="fa-solid fa-calendar-plus"></i> Nuova seduta</button></div>
            </div>
            <p class="hint">Le sedute sono gli eventi di tipo "Allenamento" del calendario.</p>
        </div>
        <div id="tr-panel" style="display:none">
            <div class="card">
                <h3><i class="fa-solid fa-list-check"></i> Esercizi della seduta</h3>
                <form onsubmit="addExercise(event)"><div class="form-row">
                    <div class="fg"><label>Nome esercizio</label><input id="ex-name" placeholder="Es. Ricezione in bagher zona 5" required></div>
                    <div class="fg" style="max-width:190px"><label>Categoria</label><select id="ex-cat">
                        <option>Riscaldamento</option><option>Battuta</option><option>Ricezione</option><option>Palleggio</option><option>Attacco</option><option>Muro</option><option>Difesa</option><option>Fisico</option><option>Tattica</option></select></div>
                    <div class="fg" style="flex:0"><label>&nbsp;</label><button class="btn btn-accent" type="submit"><i class="fa-solid fa-plus"></i> Aggiungi</button></div>
                </div></form>
                <div id="ex-chips" style="margin-top:1rem"></div>
            </div>
            <div class="card" id="grade-card">
                <h3><i class="fa-solid fa-star-half-stroke"></i> Voti per giocatore <span style="color:var(--muted);font-weight:600;font-size:.82rem">(1–10, lascia vuoto se non valutato)</span></h3>
                <div class="table-wrap"><table class="scout-table" id="grade-table"></table></div>
                <p class="hint">Tocca l'icona nota accanto al giocatore per lasciargli un commento sulla seduta.</p>
            </div>
        </div>
    </section>
    <section id="tattica" class="section">
        <div class="page-head"><div><div class="eyebrow">Spogliatoio</div><h2>Lavagnetta Tattica</h2>
            <p class="sub">Disponi la rotazione trascinando i gettoni e disegna schemi, traiettorie e vettori direttamente sul campo.</p></div></div>
        <div class="tactical-wrap">
            <div id="court-area"><canvas id="courtCanvas"></canvas></div>
            <div>
                <div class="card" style="margin-bottom:1rem">
                    <h3 style="margin-bottom:.6rem"><i class="fa-solid fa-pen"></i> Strumenti</h3>
                    <label style="font-size:.72rem;text-transform:uppercase;letter-spacing:.6px;color:var(--muted);font-weight:600">Colore</label>
                    <div class="color-picker">
                        <div class="color-btn active" style="background:#22C55E" onclick="setPen('#22C55E',this)"></div>
                        <div class="color-btn" style="background:#F0463C" onclick="setPen('#F0463C',this)"></div>
                        <div class="color-btn" style="background:#5b9dff" onclick="setPen('#5b9dff',this)"></div>
                        <div class="color-btn" style="background:#F5B301" onclick="setPen('#F5B301',this)"></div>
                        <div class="color-btn" style="background:#ffffff" onclick="setPen('#ffffff',this)"></div>
                    </div>
                    <label style="font-size:.72rem;text-transform:uppercase;letter-spacing:.6px;color:var(--muted);font-weight:600;display:block;margin-top:14px">Spessore</label>
                    <input id="brush" type="range" min="1" max="10" value="3" style="width:100%;margin-top:6px;accent-color:var(--brand)">
                </div>
                <button class="btn btn-danger" style="width:100%;margin-bottom:10px" onclick="clearDraw()"><i class="fa-solid fa-eraser"></i> Cancella disegno</button>
                <button class="btn btn-ghost" style="width:100%" onclick="resetTokens()"><i class="fa-solid fa-arrows-spin"></i> Reset posizioni</button>
                <p class="hint" style="margin-top:14px;line-height:1.5">Trascina i gettoni P1–P6. Capitano in oro 👑, vice in argento 🥈.</p>
            </div>
        </div>
    </section>

    <!-- BACKUP -->
    <section id="backup" class="section">
        <div class="page-head"><div><div class="eyebrow">Sicurezza</div><h2>Backup &amp; Ripristino</h2>
            <p class="sub">I dati vivono in questo browser. Esporta un file di backup per non perderli e per spostarli su un altro dispositivo.</p></div></div>
        <div class="card"><h3><i class="fa-solid fa-file-export"></i> Esporta</h3>
            <p style="color:var(--muted);margin-bottom:1rem;font-size:.9rem">Scarica tutti i dati (rosa, calendario, statistiche, presenze, rotazioni) in un unico file JSON.</p>
            <button class="btn btn-accent" onclick="exportData()"><i class="fa-solid fa-download"></i> Scarica backup</button></div>
        <div class="card"><h3><i class="fa-solid fa-file-import"></i> Importa</h3>
            <p style="color:var(--muted);margin-bottom:1rem;font-size:.9rem">Carica un file di backup. Attenzione: sovrascrive i dati attuali.</p>
            <input type="file" id="import-file" accept="application/json" style="display:none" onchange="importData(event)">
            <button class="btn btn-ghost" onclick="document.getElementById('import-file').click()"><i class="fa-solid fa-upload"></i> Carica backup</button></div>
        <div class="card"><h3 style="color:var(--flame)"><i class="fa-solid fa-trash-can" style="color:var(--flame)"></i> Azzera tutto</h3>
            <p style="color:var(--muted);margin-bottom:1rem;font-size:.9rem">Cancella ogni dato e riparte da zero. Operazione irreversibile.</p>
            <button class="btn btn-danger" onclick="resetAll()"><i class="fa-solid fa-bomb"></i> Reset completo</button></div>
    </section>`;
}

/* =========================================================
   NAVIGAZIONE
   ========================================================= */
const RENDERERS = {
    dashboard:renderDashboard, roster:renderRoster, calendario:renderCalendar,
    scout:populateScout, rotazioni:populateRot, presenze:populateAtt, allenamenti:populateTraining, tattica:initBoard, backup:()=>{},
    formazione:renderFormazione
};
function go(sec){
    document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
    document.querySelectorAll('.nav button').forEach(b=>b.classList.remove('active'));
    document.getElementById(sec).classList.add('active');
    document.querySelector(`.nav button[data-sec="${sec}"]`).classList.add('active');
    (RENDERERS[sec]||(()=>{}))();
    closeSidebar();
    window.scrollTo({top:0,behavior:'instant'});
}
function toggleSidebar(){const s=document.getElementById('sidebar'),b=document.getElementById('backdrop');const o=!s.classList.contains('open');s.classList.toggle('open',o);b.classList.toggle('show',o);}
function closeSidebar(){document.getElementById('sidebar').classList.remove('open');document.getElementById('backdrop').classList.remove('show');}

/* ---------- nome squadra ---------- */
function renderTeamName(){
    document.getElementById('team-span').textContent = DB.teamName;
    document.getElementById('foot-team').textContent = DB.teamName==='TEAM'? 'La tua squadra' : DB.teamName;
}
function toggleTeamEdit(){
    const inp=document.getElementById('team-input');
    inp.style.display='block'; inp.value=DB.teamName; inp.focus();
    inp.onblur=saveTeam; inp.onkeydown=e=>{if(e.key==='Enter')saveTeam();};
}
function saveTeam(){
    const inp=document.getElementById('team-input');
    const v=inp.value.trim().toUpperCase();
    if(v){DB.teamName=v;save();renderTeamName();toast('Nome squadra aggiornato');}
    inp.style.display='none';
}

/* =========================================================
   DASHBOARD
   ========================================================= */
function courtSVG(sport){
    if(sport==='pallavolo'){
        return `<svg class="court" viewBox="0 0 400 200" preserveAspectRatio="none">
        <rect x="6" y="6" width="388" height="188" fill="none" stroke="#22C55E" stroke-width="2"/>
        <line x1="200" y1="6" x2="200" y2="194" stroke="#22C55E" stroke-width="2.5"/>
        <line x1="135" y1="6" x2="135" y2="194" stroke="#22C55E" stroke-width="1" stroke-dasharray="5 5"/>
        <line x1="265" y1="6" x2="265" y2="194" stroke="#22C55E" stroke-width="1" stroke-dasharray="5 5"/></svg>`;
    }
    const c='rgba(255,255,255,.85)';
    if(sport==='calcio'){
        return `<svg class="court" viewBox="0 0 400 200" preserveAspectRatio="none">
        <rect x="6" y="6" width="388" height="188" fill="none" stroke="${c}" stroke-width="2"/>
        <line x1="200" y1="6" x2="200" y2="194" stroke="${c}" stroke-width="2"/>
        <circle cx="200" cy="100" r="34" fill="none" stroke="${c}" stroke-width="2"/>
        <rect x="6" y="55" width="58" height="90" fill="none" stroke="${c}" stroke-width="2"/>
        <rect x="336" y="55" width="58" height="90" fill="none" stroke="${c}" stroke-width="2"/></svg>`;
    }
    return `<svg class="court" viewBox="0 0 400 200" preserveAspectRatio="none">
        <rect x="6" y="6" width="388" height="188" fill="none" stroke="${c}" stroke-width="2"/>
        <line x1="200" y1="6" x2="200" y2="194" stroke="${c}" stroke-width="2"/>
        <circle cx="200" cy="100" r="26" fill="none" stroke="${c}" stroke-width="2"/>
        <rect x="6" y="64" width="74" height="72" fill="none" stroke="${c}" stroke-width="2"/>
        <rect x="320" y="64" width="74" height="72" fill="none" stroke="${c}" stroke-width="2"/>
        <path d="M80 64 A36 36 0 0 1 80 136" fill="none" stroke="${c}" stroke-width="2"/>
        <path d="M320 64 A36 36 0 0 0 320 136" fill="none" stroke="${c}" stroke-width="2"/></svg>`;
}
function renderDashboard(){
    const ne=nextEvent(), rec=teamRecord(), avg=teamAvgVoto(), att=teamAttendancePct();
    const t=today();
    let cd='';
    if(ne){
        const days=Math.round((new Date(ne.date+'T00:00:00')-t)/86400000);
        const isMatch=ne.type==='Partita';
        cd=`<div>
            <div class="hero-label">${isMatch?'Prossima partita':'Prossimo allenamento'}</div>
            <h2>${ne.notes}</h2>
            <div class="meta">${fmtDateLong(ne.date)} · <span class="pill ${isMatch?'match':'train'}">${ne.type}</span></div>
            <div class="countdown"><div class="cd-box"><b class="num">${days}</b><span>${days===1?'giorno':'giorni'}</span></div>
            ${isMatch?`<button class="btn btn-accent" style="align-self:center;margin-left:6px" onclick="go('scout')"><i class="fa-solid fa-clipboard-list"></i> Prepara scout</button>`:''}</div>
        </div>`;
    } else {
        cd=`<div><div class="hero-label">Agenda libera</div><h2>Nessun impegno in programma</h2>
            <div class="meta">Aggiungi una partita o un allenamento dal calendario.</div>
            <div class="countdown"><button class="btn btn-accent" onclick="go('calendario')"><i class="fa-solid fa-calendar-plus"></i> Vai al calendario</button></div></div>`;
    }
    const court=courtSVG(curSport());

    const kpis=`<div class="kpi-grid">
        <div class="kpi"><i class="fa-solid fa-trophy ic"></i><div class="lbl">Bilancio</div>
            <div class="val num">${rec.w}<small>V</small> · ${rec.l}<small>P</small></div>
            <div class="delta ${rec.w>=rec.l?'up':'down'}">${rec.w+rec.l? Math.round(rec.w/(rec.w+rec.l)*100):0}% vittorie</div></div>
        <div class="kpi"><i class="fa-solid fa-star ic"></i><div class="lbl">Media voti squadra</div>
            <div class="val num">${avg?avg.toFixed(2):'—'}</div>
            <div class="delta ${avg>=6?'up':'down'}">${avg?(avg>=6?'sopra la sufficienza':'sotto la sufficienza'):'nessuna gara'}</div></div>
        <div class="kpi"><i class="fa-solid fa-users ic"></i><div class="lbl">Atleti in rosa</div>
            <div class="val num">${DB.players.length}<small>atleti</small></div>
            <div class="delta flat">${DB.players.filter(p=>p.status==='injured').length} infortunati</div></div>
        <div class="kpi"><i class="fa-solid fa-user-check ic"></i><div class="lbl">Presenza media</div>
            <div class="val num">${att!==null?att:'—'}<small>%</small></div>
            <div class="delta ${att>=75?'up':(att!==null?'down':'flat')}">${att!==null?(att>=75?'gruppo costante':'da monitorare'):'nessun dato'}</div></div>
    </div>`;

    // top 3 per media voto (min 1 gara)
    const ranked=DB.players.map(p=>({p,s:getSeasonStats(p.id)})).filter(x=>x.s.avgVoto!==null)
        .sort((a,b)=>b.s.avgVoto-a.s.avgVoto).slice(0,3);
    let top=ranked.length? ranked.map((x,i)=>{
        const f=playerForm(x.p.id);
        return `<div class="leader-row"><div class="leader-rank r${i+1}">${i+1}</div>
            <div class="leader-info"><b>${x.p.name}</b><span>${x.p.role} · #${x.p.number}</span></div>
            <div style="text-align:right"><div class="voto num" style="color:var(--brand);font-size:1.15rem">${x.s.avgVoto.toFixed(1)}</div>
            <span class="delta ${f.dir}" style="font-size:.72rem">${f.txt}</span></div></div>`;
    }).join('') : `<div class="empty-state"><i class="fa-solid fa-chart-line"></i><b>Ancora nessuna statistica</b>Registra uno scout gara per vedere la classifica.</div>`;

    // prossimi 3 eventi
    const up=DB.events.filter(e=>new Date(e.date)>=t).sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(0,4);
    let upcoming=up.length? `<ul class="mini-list">`+up.map(e=>`<li><span><span class="status-dot" style="background:${e.type==='Partita'?'var(--brand)':'var(--muted)'}"></span>${e.notes}</span><span style="color:var(--muted);font-size:.82rem">${fmtDate(e.date)}</span></li>`).join('')+`</ul>`
        : `<div class="empty-state" style="padding:1.5rem"><i class="fa-solid fa-calendar"></i>Nessun evento futuro</div>`;

    document.getElementById('dash-content').innerHTML=`
        <div class="page-head"><div><div class="eyebrow">Bentornato, mister</div><h2>Centro di controllo</h2></div></div>
        <div class="hero">${court}<div class="hero-inner">${cd}</div></div>
        ${kpis}
        <div class="dash-cols">
            <div class="card"><h3><i class="fa-solid fa-ranking-star"></i> Migliori per rendimento</h3>${top}</div>
            <div class="card"><h3><i class="fa-solid fa-calendar-week"></i> Prossimi impegni</h3>${upcoming}</div>
        </div>`;
}

/* =========================================================
   ROSTER
   ========================================================= */
const STATUS_META={active:{c:'var(--ok)',t:'Disponibile'},injured:{c:'var(--bad)',t:'Infortunato'},suspended:{c:'var(--warn)',t:'Squalificato'}};
function renderRoster(){
    const body=document.getElementById('roster-body');
    document.getElementById('roster-count').textContent=`(${DB.players.length} in rosa)`;
    if(!DB.players.length){body.innerHTML=`<tr class="empty-row"><td colspan="8">Nessun atleta. Aggiungi il primo giocatore qui sopra.</td></tr>`;return;}
    body.innerHTML='';
    DB.players.forEach(p=>{
        const s=getSeasonStats(p.id), f=playerForm(p.id), att=playerAttendance(p.id);
        let lead='', jcls='';
        if(p.isCaptain){lead='<span class="lead-tag c">👑 C</span>';jcls='captain';}
        else if(p.isViceCaptain){lead='<span class="lead-tag v">🥈 VC</span>';jcls='vice';}
        const st=STATUS_META[p.status]||STATUS_META.active;
        const tr=document.createElement('tr');
        tr.className='clickable';
        tr.onclick=(ev)=>{ if(ev.target.closest('.no-open'))return; openPlayer(p.id); };
        tr.innerHTML=`
            <td><div class="jersey ${jcls} no-open" onclick="event.stopPropagation();cycleLeadership(${p.id})">${p.number}</div></td>
            <td style="text-align:left;font-weight:700">${p.name}${lead}<div style="font-size:.74rem;color:var(--muted-2);font-weight:500">${p.hand||'Dx'} · ${p.height?p.height+' cm':'—'}</div></td>
            <td><span class="pill role">${p.role}</span></td>
            <td><span class="status-dot" style="background:${st.c}"></span><span style="font-size:.82rem">${st.t}</span></td>
            <td class="voto num" style="color:var(--brand)">${s.avgVoto?s.avgVoto.toFixed(1):'—'}</td>
            <td><span class="delta ${f.dir}" style="font-size:.78rem;font-weight:700">${f.txt}</span></td>
            <td class="num">${att!==null?att+'%':'—'}</td>
            <td><div class="row-actions no-open"><button class="btn btn-ghost btn-icon" onclick="event.stopPropagation();openPlayer(${p.id})" title="Scheda"><i class="fa-solid fa-eye"></i></button>
                <button class="btn btn-accent btn-icon" onclick="event.stopPropagation();sharePlayer(${p.id})" title="Condividi codice col giocatore"><i class="fa-solid fa-share-nodes"></i></button>
                <button class="btn btn-danger btn-icon" onclick="event.stopPropagation();removePlayer(${p.id})" title="Rimuovi"><i class="fa-solid fa-trash-can"></i></button></div></td>`;
        body.appendChild(tr);
    });
}
function addPlayer(e){
    e.preventDefault();
    // nessun limite di rosa: calcio/basket possono avere 20+ atleti
    const number=parseInt(document.getElementById('p-number').value);
    if(DB.players.some(p=>p.number===number)) return toast(`La maglia ${number} è già assegnata`,'warning');
    DB.players.push({id:uid(),name:document.getElementById('p-name').value.trim(),number,
        role:document.getElementById('p-role').value,hand:document.getElementById('p-hand').value,
        height:parseInt(document.getElementById('p-height').value)||0,status:'active',isCaptain:false,isViceCaptain:false});
    save();e.target.reset();renderRoster();toast('Atleta inserito');
}
function removePlayer(id){
    const p=playerById(id);
    confirmAction(`Rimuovere ${p.name} dalla rosa? Lo storico statistiche resterà nei tabellini.`,()=>{
        DB.players=DB.players.filter(x=>x.id!==id);save();renderRoster();toast('Atleta rimosso','info');
    });
}
function cycleLeadership(id){
    const p=playerById(id);if(!p)return;
    const cap=DB.players.find(x=>x.isCaptain), vice=DB.players.find(x=>x.isViceCaptain);
    if(!p.isCaptain&&!p.isViceCaptain){
        if(!cap){p.isCaptain=true;toast(`${p.name} è il Capitano 👑`);}
        else if(!vice){p.isViceCaptain=true;toast(`${p.name} è il Vice Capitano 🥈`);}
        else toast('Ruoli di leadership già assegnati','warning');
    } else if(p.isCaptain){
        p.isCaptain=false;
        if(!vice){p.isViceCaptain=true;toast(`${p.name} ora è Vice 🥈`);}
        else toast(`${p.name} senza gradi`,'info');
    } else { p.isViceCaptain=false;toast(`${p.name} senza gradi`,'info'); }
    save();renderRoster();
}
function setStatus(id,st){ const p=playerById(id);p.status=st;save();renderRoster();openPlayer(id);toast('Stato aggiornato'); }

function openPlayer(id){
    const p=playerById(id), s=getSeasonStats(id), voti=getPlayerVoti(id), f=playerForm(id), att=playerAttendance(id);
    const chart=svgLine(voti.map(v=>v.voto));
    const statCell=(lbl,v,suf='')=>`<div class="stat-cell"><div class="lbl">${lbl}</div><div class="v num">${v}${suf?`<small>${suf}</small>`:''}</div></div>`;
    const stStatus=p.status||'active';
    const ts=playerTrainingStats(id);
    const catBars=Object.keys(ts.byCat).length? `<h3 style="font-size:.95rem;margin:1.2rem 0 .6rem"><i class="fa-solid fa-dumbbell"></i> Rendimento allenamenti per fondamentale</h3>`+
        Object.keys(ts.byCat).sort((a,b)=>ts.byCat[b]-ts.byCat[a]).map(cat=>{
            const v=ts.byCat[cat], pct=Math.round(v/10*100), col=v>=6?'linear-gradient(90deg,var(--brand-deep),var(--brand))':'var(--flame)';
            return `<div style="display:flex;align-items:center;gap:12px;padding:6px 0"><div style="width:110px;font-size:.82rem;font-weight:600">${cat}</div>
                <div style="flex:1"><div class="bar-track" style="height:8px"><div class="bar-fill" style="width:${pct}%;background:${col}"></div></div></div>
                <div class="num" style="font-weight:800;font-family:'Outfit';width:34px;text-align:right;color:${v>=6?'var(--brand)':'var(--flame)'}">${v.toFixed(1)}</div></div>`;
        }).join('') : '';
    coachMediaCSS();
    openModal(`
      <div class="modal-head"><h3><i class="fa-solid fa-id-card" style="color:var(--brand)"></i> Scheda atleta</h3>
        <button class="modal-close" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
      <div class="modal-body">
        <div class="player-head">
            <div class="player-avatar" id="cph-av" onclick="pickPhotoCoach(${id})"><div class="cph-im" id="cph-im-${id}">${COACH_PHOTOS[id]?`<img src="${COACH_PHOTOS[id]}">`:p.number}</div><div class="cph-cam"><i class="fa-solid fa-camera"></i></div></div>
            <div class="meta"><h4>${p.name} ${p.isCaptain?'👑':p.isViceCaptain?'🥈':''}</h4>
                <p>${p.role} · ${p.hand||'Dx'} · ${p.height?p.height+' cm':'altezza n.d.'} · <span class="delta ${f.dir}" style="font-weight:700">${f.txt}</span></p></div>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:1rem;flex-wrap:wrap">
            <button class="btn btn-accent btn-sm" onclick="sharePlayer(${id})"><i class="fa-solid fa-share-nodes"></i> Condividi</button>
            <button class="btn btn-ghost btn-sm" onclick="openPlayerCard(${id})"><i class="fa-solid fa-id-badge"></i> Card giocatore</button>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:1.2rem;flex-wrap:wrap">
            <button class="btn btn-sm ${stStatus==='active'?'btn-accent':'btn-ghost'}" onclick="setStatus(${id},'active')">Disponibile</button>
            <button class="btn btn-sm ${stStatus==='injured'?'btn-danger':'btn-ghost'}" onclick="setStatus(${id},'injured')">Infortunato</button>
            <button class="btn btn-sm ${stStatus==='suspended'?'btn-accent':'btn-ghost'}" style="${stStatus==='suspended'?'background:var(--warn);color:#1a1300':''}" onclick="setStatus(${id},'suspended')">Squalificato</button>
        </div>
        <h3 style="font-size:.95rem;margin-bottom:.6rem"><i class="fa-solid fa-chart-line"></i> Andamento voti (${voti.length} gare)</h3>
        ${chart}
        <h3 style="font-size:.95rem;margin:1.2rem 0 .6rem"><i class="fa-solid fa-table-cells"></i> Statistiche stagione</h3>
        <div class="stat-grid">
            ${statCell('Media voto', s.avgVoto?s.avgVoto.toFixed(1):'—')}
            ${(s.cells||[]).map(c=>statCell(c[0],c[1],c[2])).join('')}
            ${statCell('Presenza all.', att!==null?att:'—', att!==null?'%':'')}
            ${statCell('Media allenamenti', ts.avg!=null?ts.avg.toFixed(1):'—')}
        </div>
        ${catBars}
      </div>`, true);
    loadCoachPhoto(id);
}

/* =========================================================
   CALENDARIO
   ========================================================= */
function renderCalendar(){
    const body=document.getElementById('cal-body');
    if(!DB.events.length){body.innerHTML=`<tr class="empty-row"><td colspan="5">Agenda vuota. Aggiungi un evento.</td></tr>`;return;}
    body.innerHTML='';
    const t=today();
    DB.events.slice().sort((a,b)=>new Date(a.date)-new Date(b.date)).forEach(ev=>{
        const isMatch=ev.type==='Partita', past=new Date(ev.date)<t;
        let res='—';
        if(isMatch){
            if(ev.result){const win=ev.result.w>ev.result.l;res=`<span class="pill ${win?'win':'loss'}">${ev.result.w}-${ev.result.l}</span>`;}
            else res=`<button class="btn btn-ghost btn-sm" onclick="editResult(${ev.id})">Aggiungi</button>`;
        }
        const tr=document.createElement('tr');
        tr.innerHTML=`
            <td><span class="pill ${isMatch?'match':'train'}">${ev.type}</span></td>
            <td class="num"${past?' style="color:var(--muted-2)"':''}>${fmtDate(ev.date)}</td>
            <td style="text-align:left;font-weight:600">${ev.notes}</td>
            <td>${res}</td>
            <td><div class="row-actions">
                ${isMatch?`<button class="btn btn-ghost btn-icon" onclick="editResult(${ev.id})" title="Risultato"><i class="fa-solid fa-pen"></i></button>`:''}
                <button class="btn btn-danger btn-icon" onclick="removeEvent(${ev.id})"><i class="fa-solid fa-trash-can"></i></button></div></td>`;
        body.appendChild(tr);
    });
}
function addEvent(e){
    e.preventDefault();
    DB.events.push({id:uid(),type:document.getElementById('e-type').value,date:document.getElementById('e-date').value,
        notes:document.getElementById('e-notes').value.trim(),result:null});
    save();e.target.reset();renderCalendar();toast('Evento aggiunto');
}
function removeEvent(id){
    confirmAction('Eliminare questo evento dal calendario?',()=>{DB.events=DB.events.filter(e=>e.id!==id);save();renderCalendar();toast('Evento rimosso','info');});
}
function editResult(id){
    const ev=DB.events.find(e=>e.id===id);const r=ev.result||{w:0,l:0};
    openModal(`<div class="modal-head"><h3><i class="fa-solid fa-flag-checkered" style="color:var(--brand)"></i> Risultato</h3>
        <button class="modal-close" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
        <div class="modal-body"><p style="color:var(--muted);margin-bottom:1rem">${ev.notes} · ${fmtDateLong(ev.date)}</p>
        <div class="result-box"><div class="set-score">
            <div style="text-align:center"><label style="font-size:.7rem;color:var(--muted);text-transform:uppercase">Noi</label><br><input id="r-w" type="number" min="0" max="3" value="${r.w}"></div>
            <span style="font-size:1.4rem;color:var(--muted)">–</span>
            <div style="text-align:center"><label style="font-size:.7rem;color:var(--muted);text-transform:uppercase">Loro</label><br><input id="r-l" type="number" min="0" max="3" value="${r.l}"></div>
        </div></div>
        <div class="modal-buttons"><button class="btn btn-ghost" onclick="closeModal()">Annulla</button>
        <button class="btn btn-accent" onclick="saveResult(${id})">Salva risultato</button></div></div>`);
}
function saveResult(id){
    const ev=DB.events.find(e=>e.id===id);
    ev.result={w:parseInt(document.getElementById('r-w').value)||0,l:parseInt(document.getElementById('r-l').value)||0};
    save();closeModal();renderCalendar();toast('Risultato salvato');
}

/* =========================================================
   SCOUT GARA
   ========================================================= */
function matchOptions(selId){
    const sel=document.getElementById(selId);
    const cur=sel.value;
    sel.innerHTML='<option value="">Scegli una partita…</option>';
    DB.events.filter(e=>e.type==='Partita').sort((a,b)=>new Date(b.date)-new Date(a.date)).forEach(m=>{
        const o=document.createElement('option');o.value=m.id;o.textContent=`${fmtDate(m.date)} · ${m.notes}`;sel.appendChild(o);
    });
    sel.value=cur;
}
function populateScout(){ matchOptions('scout-select'); }
function buildScoutHead(sport){
    const gs=SCOUT[sport].groups, head=document.getElementById('scout-head');
    let r1='<tr><th rowspan="2" style="text-align:left">Giocatore</th>';
    let r2='<tr>';
    gs.forEach(g=>{
        if(g.label){ r1+=`<th colspan="${g.fields.length}">${g.label}</th>`; g.fields.forEach(f=>r2+=`<th>${f[1]}</th>`); }
        else { g.fields.forEach(f=>{ r1+=`<th rowspan="2">${f[1]}</th>`; }); }
    });
    r1+='<th rowspan="2">Voto</th></tr>'; r2+='</tr>';
    head.innerHTML=r1+r2;
}
function renderScoutLegend(sport){
    const el=document.getElementById('scout-legend'); if(!el) return;
    el.innerHTML=`<div class="legend-item" style="grid-column:1/-1"><strong>NOTA</strong>${SCOUT[sport].note||''}</div>`;
}
function setupScout(){
    const id=parseInt(document.getElementById('scout-select').value);
    const panel=document.getElementById('scout-panel'), body=document.getElementById('scout-body');
    if(!id){panel.style.display='none';return;}
    const sport=curSport();
    const match=DB.events.find(e=>e.id===id);
    const existing=DB.scoutHistory.find(s=>s.matchId===id);
    document.getElementById('scout-title').innerHTML=`<i class="fa-solid fa-clipboard-list"></i> ${match.notes} · ${fmtDate(match.date)}${existing?' <span class="pill" style="margin-left:8px">già registrato — modifica</span>':''}`;
    panel.style.display='block';
    buildScoutHead(sport);
    const fields=scoutFields(sport), colspan=fields.length+2;
    body.innerHTML='';
    const roster=activePlayers();
    if(!roster.length){body.innerHTML=`<tr class="empty-row"><td colspan="${colspan}">Nessun atleta disponibile in rosa.</td></tr>`;return;}
    roster.forEach(p=>{
        const ex=existing? existing.rows.find(r=>r.pId===p.id):null;
        const g=ex||blankStat(sport);
        const pre=p.isCaptain?'👑 ':p.isViceCaptain?'🥈 ':'';
        const cells=fields.map(k=>`<td><input data-k="${k}" type="number" min="0" value="${g[k]||0}" oninput="calcRow(${p.id})"></td>`).join('');
        const tr=document.createElement('tr');tr.dataset.pid=p.id;
        tr.innerHTML=`<td style="text-align:left;font-weight:600">#${p.number} ${pre}${p.name}</td>${cells}<td class="voto num" id="voto-${p.id}" style="color:var(--brand)">${ex?ex.voto.toFixed(1):'6.0'}</td>`;
        body.appendChild(tr);
    });
    renderScoutLegend(sport);
}
function readRow(id){
    const r=document.querySelector(`tr[data-pid="${id}"]`);
    const o={}; r.querySelectorAll('input[data-k]').forEach(inp=>o[inp.dataset.k]=parseInt(inp.value)||0);
    return o;
}
function calcRow(id){ document.getElementById('voto-'+id).textContent=computeVoto(readRow(id)).toFixed(1); }
function saveScout(){
    const id=parseInt(document.getElementById('scout-select').value);
    const match=DB.events.find(e=>e.id===id);
    const rows=[];
    document.querySelectorAll('#scout-body tr[data-pid]').forEach(tr=>{
        const pId=parseInt(tr.dataset.pid);const s=readRow(pId);
        rows.push({pId,...s,voto:+computeVoto(s).toFixed(1)});
    });
    DB.scoutHistory=DB.scoutHistory.filter(s=>s.matchId!==id);
    DB.scoutHistory.push({matchId:id,date:match.date,opponent:match.notes,sport:curSport(),rows});
    save();toast('Statistiche registrate nelle schede atleti');
    go('roster');
}

/* =========================================================
   ROTAZIONI
   ========================================================= */
function populateRot(){ matchOptions('rot-select'); renderRotation(); }
function renderRotation(){
    const id=parseInt(document.getElementById('rot-select').value);
    const panel=document.getElementById('rot-panel');
    if(!id){panel.style.display='none';return;}
    panel.style.display='block';
    if(!DB.rotationStats[id]) DB.rotationStats[id]={P1:{f:0,s:0},P2:{f:0,s:0},P3:{f:0,s:0},P4:{f:0,s:0},P5:{f:0,s:0},P6:{f:0,s:0}};
    const data=DB.rotationStats[id];
    const grid=document.getElementById('rot-grid');grid.innerHTML='';
    const POS={P1:'Zona 1 · battuta',P2:'Zona 2',P3:'Zona 3 · centro',P4:'Zona 4',P5:'Zona 5',P6:'Zona 6'};
    Object.keys(data).forEach(k=>{
        const d=data[k], diff=d.f-d.s;
        const cell=document.createElement('div');cell.className='rot-cell';
        cell.innerHTML=`<h4>${k}</h4><div class="pos">${POS[k]}</div>
            <div class="rot-counters">
                <div class="rot-c"><div class="n fatti num">${d.f}</div><div class="k">Fatti</div>
                    <div class="stepper"><button onclick="rotStep(${id},'${k}','f',-1)">−</button><button onclick="rotStep(${id},'${k}','f',1)">+</button></div></div>
                <div class="rot-c"><div class="n subiti num">${d.s}</div><div class="k">Subiti</div>
                    <div class="stepper"><button onclick="rotStep(${id},'${k}','s',-1)">−</button><button onclick="rotStep(${id},'${k}','s',1)">+</button></div></div>
            </div>
            <div class="rot-diff" style="color:${diff>0?'var(--ok)':diff<0?'var(--bad)':'var(--muted)'}">${diff>0?'+':''}${diff}</div>`;
        grid.appendChild(cell);
    });
    const items=Object.keys(data).map(k=>{const diff=data[k].f-data[k].s;return{label:k,value:diff,display:(diff>0?'+':'')+diff,color:diff>=0?'var(--brand)':'var(--flame)'};});
    document.getElementById('rot-chart').innerHTML=svgBars(items);
    const worst=Object.keys(data).reduce((w,k)=>(data[k].f-data[k].s)<(data[w].f-data[w].s)?k:w,'P1');
    const best=Object.keys(data).reduce((b,k)=>(data[k].f-data[k].s)>(data[b].f-data[b].s)?k:b,'P1');
    const totF=Object.values(data).reduce((a,d)=>a+d.f,0), totS=Object.values(data).reduce((a,d)=>a+d.s,0);
    document.getElementById('rot-insight').innerHTML= totF+totS===0 ? 'Tocca i pulsanti + e − per registrare punti fatti e subiti in ogni rotazione durante la gara.'
        : `Rotazione più forte: <b style="color:var(--ok)">${best}</b> · rotazione critica: <b style="color:var(--flame)">${worst}</b>. Lavora sul cambio-palla in ${worst}.`;
}
function rotStep(id,k,key,delta){
    const d=DB.rotationStats[id][k];d[key]=Math.max(0,d[key]+delta);save();renderRotation();
}

/* =========================================================
   PRESENZE
   ========================================================= */
function populateAtt(){
    const sel=document.getElementById('att-select');const cur=sel.value;
    sel.innerHTML='<option value="">Scegli una seduta…</option>';
    DB.events.filter(e=>e.type==='Allenamento').sort((a,b)=>new Date(b.date)-new Date(a.date)).forEach(e=>{
        const o=document.createElement('option');o.value=e.id;o.textContent=`${fmtDate(e.date)} · ${e.notes}`;sel.appendChild(o);
    });
    sel.value=cur;
    renderAttendance(); renderAttSeason();
}
const ATT_STATES=['present','absent','excused'];
const ATT_LABEL={present:'Presente',absent:'Assente',excused:'Giust.'};
function renderAttendance(){
    const id=parseInt(document.getElementById('att-select').value);
    const panel=document.getElementById('att-panel'), list=document.getElementById('att-list');
    if(!id){panel.style.display='none';return;}
    panel.style.display='block';
    if(!DB.attendance[id]) DB.attendance[id]={};
    const map=DB.attendance[id];
    list.innerHTML='';
    DB.players.forEach(p=>{
        const cur=map[p.id]||'';
        const row=document.createElement('div');row.className='att-row';
        row.innerHTML=`<div class="jersey" style="width:32px;height:32px;font-size:.85rem;cursor:default">${p.number}</div>
            <div class="att-name">${p.name}<div style="font-size:.74rem;color:var(--muted-2);font-weight:500">${p.role}</div></div>
            <div class="att-toggle">${ATT_STATES.map(st=>`<button class="${st} ${cur===st?'on':''}" onclick="setAtt(${id},${p.id},'${st}')">${ATT_LABEL[st]}</button>`).join('')}</div>`;
        list.appendChild(row);
    });
    updateAttBar(id);
}
function setAtt(eventId,pId,st){
    const map=DB.attendance[eventId];
    map[pId]=map[pId]===st? '' : st;
    if(!map[pId]) delete map[pId];
    save();renderAttendance();renderAttSeason();
}
function updateAttBar(id){
    const map=DB.attendance[id];let pres=0,tot=0;
    DB.players.forEach(p=>{const v=map[p.id];if(v&&v!=='excused'){tot++;if(v==='present')pres++;}});
    const pct=tot?Math.round(pres/tot*100):0;
    document.getElementById('att-bar').style.width=pct+'%';
    document.getElementById('att-pct').textContent=tot?`${pct}% (${pres}/${tot})`:'Nessun appello registrato';
}
function renderAttSeason(){
    const box=document.getElementById('att-season');
    const rows=DB.players.map(p=>({p,pct:playerAttendance(p.id)})).filter(x=>x.pct!==null).sort((a,b)=>b.pct-a.pct);
    if(!rows.length){box.innerHTML=`<div class="empty-state"><i class="fa-solid fa-user-clock"></i>Nessuna presenza registrata ancora.</div>`;return;}
    box.innerHTML=rows.map(x=>`<div style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid var(--line-soft)">
        <div style="width:130px;font-weight:600;font-size:.9rem">${x.p.name}</div>
        <div style="flex:1"><div class="bar-track"><div class="bar-fill" style="width:${x.pct}%;background:${x.pct>=75?'linear-gradient(90deg,var(--brand-deep),var(--brand))':x.pct>=50?'var(--warn)':'var(--flame)'}"></div></div></div>
        <div class="num" style="font-weight:800;font-family:'Outfit';width:42px;text-align:right">${x.pct}%</div></div>`).join('');
}

/* =========================================================
   LAVAGNETTA TATTICA
   ========================================================= */
let canvas,ctx,drawing=false,penColor='#22C55E',tokensInit=false;
function initBoard(){
    canvas=document.getElementById('courtCanvas');
    const area=document.getElementById('court-area');
    const dpr=window.devicePixelRatio||1;
    const r=area.getBoundingClientRect();
    canvas.width=r.width*dpr;canvas.height=r.height*dpr;
    ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
    drawCourt(r.width,r.height);
    if(!tokensInit){placeTokens();tokensInit=true;}
    bindDraw(r.width,r.height);
}
function courtRect(w,h,sport){
    // rapporto d'aspetto reale (verticale = altezza/larghezza): calcio 105x68, basket 28x15
    const ratio = sport==='pallavolo' ? 2 : sport==='basket' ? 28/15 : 105/68;
    const pad=12, aw=w-pad*2, ah=h-pad*2;
    let pw,ph;
    if(aw*ratio<=ah){ pw=aw; ph=aw*ratio; } else { ph=ah; pw=ah/ratio; }
    return { x:(w-pw)/2, y:(h-ph)/2, w:pw, h:ph };
}
function drawCourt(w,h){
    ctx.clearRect(0,0,w,h);
    const sp=(typeof DB!=='undefined'&&DB&&DB.sport)||'pallavolo';
    const R=courtRect(w,h,sp), rx=R.x, ry=R.y, rw=R.w, rh=R.h, cx=rx+rw/2, cy=ry+rh/2;
    if(sp==='pallavolo'){
        ctx.strokeStyle='rgba(34,197,94,.55)';ctx.lineWidth=2;
        ctx.strokeRect(rx,ry,rw,rh);
        ctx.beginPath();ctx.moveTo(rx,cy);ctx.lineTo(rx+rw,cy);ctx.stroke(); // rete
        ctx.setLineDash([6,6]);ctx.lineWidth=1;ctx.strokeStyle='rgba(34,197,94,.3)';
        ctx.beginPath();ctx.moveTo(rx,ry+rh*0.333);ctx.lineTo(rx+rw,ry+rh*0.333);ctx.stroke();
        ctx.beginPath();ctx.moveTo(rx,ry+rh*0.667);ctx.lineTo(rx+rw,ry+rh*0.667);ctx.stroke();
        ctx.setLineDash([]);
        return;
    }
    // calcio / basket — campo a proporzioni fisse (non si deforma)
    ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=2;
    ctx.strokeRect(rx,ry,rw,rh);
    ctx.beginPath();ctx.moveTo(rx,cy);ctx.lineTo(rx+rw,cy);ctx.stroke();            // mezzo campo
    ctx.beginPath();ctx.arc(cx,cy,rw*0.13,0,Math.PI*2);ctx.stroke();               // cerchio centrale
    if(sp==='calcio'){
        const bw=rw*0.5,bx=cx-bw/2,bh=rh*0.16;                                     // aree di rigore
        ctx.strokeRect(bx,ry,bw,bh);
        ctx.strokeRect(bx,ry+rh-bh,bw,bh);
        const gw=rw*0.24,gx=cx-gw/2,gh=rh*0.06;                                    // aree di porta
        ctx.strokeRect(gx,ry,gw,gh);
        ctx.strokeRect(gx,ry+rh-gh,gw,gh);
    }else{ // basket
        const kw=rw*0.36,kx=cx-kw/2,kh=rh*0.19;                                    // aree (pitturato)
        ctx.strokeRect(kx,ry,kw,kh);
        ctx.strokeRect(kx,ry+rh-kh,kw,kh);
        ctx.beginPath();ctx.arc(cx,ry+kh,kw*0.5,0,Math.PI);ctx.stroke();           // arco tiri liberi
        ctx.beginPath();ctx.arc(cx,ry+rh-kh,kw*0.5,Math.PI,Math.PI*2);ctx.stroke();
    }
}
function placeTokens(){
    const area=document.getElementById('court-area');
    area.querySelectorAll('.token').forEach(t=>t.remove());
    const r=area.getBoundingClientRect();
    const sp=(typeof DB!=='undefined'&&DB&&DB.sport)||'pallavolo';
    const FORM={
        pallavolo:[[0.75,0.8],[0.75,0.55],[0.5,0.3],[0.25,0.3],[0.25,0.55],[0.5,0.8]],
        calcio:[[0.5,0.9],[0.2,0.75],[0.4,0.78],[0.6,0.78],[0.8,0.75],[0.3,0.55],[0.5,0.55],[0.7,0.55],[0.25,0.32],[0.5,0.28],[0.75,0.32]],
        basket:[[0.5,0.75],[0.22,0.62],[0.78,0.62],[0.32,0.4],[0.6,0.38]]
    };
    const spots=FORM[sp]||FORM.pallavolo;
    const base=courtRect(r.width,r.height,sp);
    const roster=activePlayers().slice(0,spots.length);
    roster.forEach((p,i)=>{
        const t=document.createElement('div');
        t.className='token'+(p.isCaptain?' captain':p.isViceCaptain?' vice':'');
        t.textContent=p.number;t.title=p.name;
        const pos=spots[i]||[0.5,0.5];
        t.style.left=(base.x+pos[0]*base.w-23)+'px';t.style.top=(base.y+pos[1]*base.h-23)+'px';
        makeDraggable(t);area.appendChild(t);
    });
}
function makeDraggable(token){
    token.addEventListener('pointerdown',e=>{
        e.stopPropagation();token.setPointerCapture(e.pointerId);token.style.cursor='grabbing';
        let sx=e.clientX,sy=e.clientY;
        const move=ev=>{
            const dx=ev.clientX-sx,dy=ev.clientY-sy;sx=ev.clientX;sy=ev.clientY;
            const par=token.parentElement.getBoundingClientRect();
            let nx=Math.max(0,Math.min(par.width-token.offsetWidth,token.offsetLeft+dx));
            let ny=Math.max(0,Math.min(par.height-token.offsetHeight,token.offsetTop+dy));
            token.style.left=nx+'px';token.style.top=ny+'px';
        };
        const up=()=>{token.onpointermove=null;token.onpointerup=null;token.style.cursor='grab';try{token.releasePointerCapture(e.pointerId);}catch(_){}}; 
        token.onpointermove=move;token.onpointerup=up;token.onpointercancel=up;
    });
}
function bindDraw(w,h){
    const pos=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left),y:(e.clientY-r.top)};};
    canvas.onpointerdown=e=>{drawing=true;const p=pos(e);ctx.beginPath();ctx.moveTo(p.x,p.y);};
    canvas.onpointermove=e=>{if(!drawing)return;const p=pos(e);ctx.strokeStyle=penColor;ctx.lineWidth=+document.getElementById('brush').value;ctx.lineCap='round';ctx.lineTo(p.x,p.y);ctx.stroke();};
    canvas.onpointerup=()=>drawing=false;canvas.onpointerleave=()=>drawing=false;
    canvas._w=w;canvas._h=h;
}
function setPen(c,el){penColor=c;document.querySelectorAll('.color-btn').forEach(b=>b.classList.remove('active'));el.classList.add('active');}
function clearDraw(){const r=document.getElementById('court-area').getBoundingClientRect();drawCourt(r.width,r.height);}
function resetTokens(){tokensInit=false;placeTokens();tokensInit=true;toast('Posizioni ripristinate','info');}

/* =========================================================
   BACKUP
   ========================================================= */
function exportData(){
    const blob=new Blob([JSON.stringify(DB,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');
    const d=new Date().toISOString().slice(0,10);
    a.href=url;a.download=`volleyteam-backup-${d}.json`;a.click();URL.revokeObjectURL(url);
    toast('Backup scaricato');
}
function importData(e){
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{
        try{
            const data=JSON.parse(reader.result);
            if(!data.players||!data.events) throw new Error('formato');
            confirmAction('Importare questo backup? I dati attuali verranno sovrascritti.',()=>{
                DB=data;if(!DB.nextId)DB.nextId=Date.now();save();renderTeamName();go('dashboard');toast('Backup importato con successo');
            });
        }catch(err){toast('File non valido o danneggiato','danger');}
        e.target.value='';
    };
    reader.readAsText(file);
}
function resetAll(){
    confirmAction('Cancellare TUTTI i dati e ripartire da zero? Non si può annullare.',()=>{
        localStorage.removeItem(LS_KEY);DB=seedDB();save();renderTeamName();go('dashboard');toast('App azzerata','info');
    });
}

/* =========================================================
   INIT
   ========================================================= */
document.getElementById('confirm-yes').addEventListener('click',()=>{
    if(_confirmCb)_confirmCb();document.getElementById('confirm-overlay').classList.remove('show');_confirmCb=null;
});
document.getElementById('confirm-no').addEventListener('click',()=>{document.getElementById('confirm-overlay').classList.remove('show');_confirmCb=null;});
document.getElementById('modal-overlay').addEventListener('click',e=>{if(e.target.id==='modal-overlay')closeModal();});
window.addEventListener('resize',()=>{if(document.getElementById('tattica').classList.contains('active')){const a=document.getElementById('court-area').getBoundingClientRect();initBoard();}});

buildLayout();
renderTeamName();
renderDashboard();

if('serviceWorker' in navigator){
    window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(err=>console.warn('SW non registrato',err)));
}

/* =========================================================
   CONDIVISIONE COL GIOCATORE (pacchetto offline)
   ========================================================= */
function buildPlayerPackage(id, photo){
    const sport=curSport();
    const p=playerById(id), s=getSeasonStats(id), voti=getPlayerVoti(id);
    const matches=DB.scoutHistory.slice().sort((a,b)=>new Date(a.date)-new Date(b.date)).map(m=>{
        const r=m.rows.find(x=>x.pId===id); if(!r) return null;
        const ev=DB.events.find(e=>e.id===m.matchId);
        return {d:m.date,o:m.opponent,res:(ev&&ev.result)||null,voto:+(+r.voto).toFixed(1),cells:SCOUT[sport].season(r).slice(0,3)};
    }).filter(Boolean);
    const att=DB.events.filter(e=>e.type==='Allenamento').sort((a,b)=>new Date(a.date)-new Date(b.date)).map(e=>{
        const a=DB.attendance[e.id]; const st=a&&a[id]?a[id]:null; if(!st) return null;
        return {d:e.date,n:e.notes,s:st};
    }).filter(Boolean);
    const cal=DB.events.slice().sort((a,b)=>new Date(a.date)-new Date(b.date)).map(e=>({t:e.type,d:e.date,n:e.notes,res:e.result||null}));
    const ex=DB.events.filter(e=>e.type==='Allenamento').sort((a,b)=>new Date(a.date)-new Date(b.date)).map(ev=>{
        const tr=DB.trainings[ev.id]; if(!tr) return null;
        const g=tr.grades[id]||{};
        const items=(tr.exercises||[]).map(x=>(g[x.id]!=null?{name:x.name,cat:x.cat,grade:g[x.id]}:null)).filter(Boolean);
        const note=(tr.notes&&tr.notes[id])||'';
        if(!items.length && !note) return null;
        return {d:ev.date,n:ev.notes,note,items};
    }).filter(Boolean);
    const tstat=playerTrainingStats(id);
    return {v:2,k:'vtm-player',photo:photo||null,sport,team:DB.teamName,gen:new Date().toISOString(),
        p:{name:p.name,number:p.number,role:p.role,hand:p.hand||'Dx',height:p.height||0,cap:!!p.isCaptain,vice:!!p.isViceCaptain,status:p.status||'active',goal:p.goal||''},
        voti:voti.map(v=>({d:v.date,v:v.voto,o:v.opp})),
        season:{matches:s.matches,avgVoto:s.avgVoto,cells:s.cells},
        training:{avg:tstat.avg,count:tstat.count,byCat:tstat.byCat},
        matches, cal, att, attPct:playerAttendance(id), ex};
}
function encodePkg(o){ return btoa(unescape(encodeURIComponent(JSON.stringify(o)))); }
function slug(s){ return s.toLowerCase().normalize('NFD').replace(/[^\w]+/g,'-').replace(/^-|-$/g,''); }
async function sharePlayer(id){
    const photo=await cIdbGet('p'+id); const p=playerById(id); const pkg=buildPlayerPackage(id,photo); const code=encodePkg(pkg);
    openModal(`
      <div class="modal-head"><h3><i class="fa-solid fa-share-nodes" style="color:var(--brand)"></i> Condividi · ${p.name}</h3>
        <button class="modal-close" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
      <div class="modal-body">
        <p style="color:var(--muted);margin-bottom:1rem;font-size:.9rem">Manda al giocatore <b>il file</b> (consigliato, via WhatsApp/email) oppure <b>il codice</b> da incollare nella sua app. Aggiorna e riinvia dopo ogni partita o allenamento.</p>
        <button class="btn btn-accent" style="width:100%;margin-bottom:14px" onclick="downloadPlayerPkg(${id})"><i class="fa-solid fa-download"></i> Scarica file profilo</button>
        <label style="font-size:.72rem;text-transform:uppercase;letter-spacing:.6px;color:var(--muted);font-weight:600">Oppure codice da copiare</label>
        <textarea id="share-code" readonly style="width:100%;height:90px;margin-top:6px;background:var(--surface-2);border:1px solid var(--line);color:var(--muted);border-radius:10px;padding:10px;font-size:.72rem;resize:none;font-family:monospace">${code}</textarea>
        <button class="btn btn-ghost" style="width:100%;margin-top:8px" onclick="copyShare()"><i class="fa-solid fa-copy"></i> Copia codice</button>
      </div>`);
}
function copyShare(){
    const ta=document.getElementById('share-code'); ta.select();
    navigator.clipboard?.writeText(ta.value).then(()=>toast('Codice copiato')).catch(()=>{document.execCommand('copy');toast('Codice copiato');});
}
async function downloadPlayerPkg(id){
    const photo=await cIdbGet('p'+id); const p=playerById(id); const pkg=buildPlayerPackage(id,photo);
    const blob=new Blob([JSON.stringify(pkg)],{type:'application/json'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a');
    a.href=url; a.download=`profilo-${slug(p.name)}.vtm.json`; a.click(); URL.revokeObjectURL(url);
    toast('File profilo scaricato');
}

/* =========================================================
   ALLENAMENTI & VOTI
   ========================================================= */
const CAT_COLOR={Riscaldamento:'#8395B4',Battuta:'#F0463C',Ricezione:'#22C55E',Palleggio:'#5b9dff',Attacco:'#F5B301',Muro:'#a78bfa',Difesa:'#2dd4bf',Fisico:'#fb923c',Tattica:'#e879f9'};
function currentTraining(){
    const eid=parseInt(document.getElementById('tr-select').value);
    if(!eid) return null;
    if(!DB.trainings[eid]) DB.trainings[eid]={exercises:[],grades:{},notes:{}};
    return {eid,tr:DB.trainings[eid],ev:DB.events.find(e=>e.id===eid)};
}
function populateTraining(){
    const sel=document.getElementById('tr-select'); const cur=sel.value;
    sel.innerHTML='<option value="">Scegli una seduta…</option>';
    DB.events.filter(e=>e.type==='Allenamento').sort((a,b)=>new Date(b.date)-new Date(a.date)).forEach(e=>{
        const o=document.createElement('option');o.value=e.id;o.textContent=`${fmtDate(e.date)} · ${e.notes}`;sel.appendChild(o);
    });
    sel.value=cur; renderTraining();
}
function renderTraining(){
    const c=currentTraining(); const panel=document.getElementById('tr-panel');
    if(!c){panel.style.display='none';return;}
    panel.style.display='block';
    // chips esercizi
    const chips=document.getElementById('ex-chips');
    if(!c.tr.exercises.length){chips.innerHTML='<p style="color:var(--muted-2);font-style:italic;font-size:.88rem">Nessun esercizio ancora. Aggiungine uno qui sopra.</p>';}
    else chips.innerHTML=c.tr.exercises.map(x=>`<span class="pill" style="background:${CAT_COLOR[x.cat]||'var(--surface-3)'}22;color:${CAT_COLOR[x.cat]||'var(--silver)'};border:1px solid ${CAT_COLOR[x.cat]||'var(--line)'}55;margin:0 6px 6px 0;padding:6px 10px;font-size:.8rem">
        <b>${x.name}</b> · ${x.cat} <i class="fa-solid fa-xmark" style="margin-left:6px;cursor:pointer;opacity:.7" onclick="removeExercise(${x.id})"></i></span>`).join('');
    renderGradeTable(c);
}
function renderGradeTable(c){
    const tbl=document.getElementById('grade-table');
    if(!c.tr.exercises.length){tbl.innerHTML=`<tbody><tr><td style="padding:1.4rem;color:var(--muted-2);font-style:italic">Aggiungi almeno un esercizio per iniziare a votare.</td></tr></tbody>`;return;}
    const roster=activePlayers();
    if(!roster.length){tbl.innerHTML=`<tbody><tr><td style="padding:1.4rem;color:var(--muted-2)">Nessun atleta disponibile.</td></tr></tbody>`;return;}
    const head=`<thead><tr><th style="text-align:left">Giocatore</th>${c.tr.exercises.map(x=>`<th title="${x.cat}">${x.name.length>14?x.name.slice(0,13)+'…':x.name}</th>`).join('')}<th>Media</th><th>Nota</th></tr></thead>`;
    const body=roster.map(p=>{
        const g=c.tr.grades[p.id]||{};
        const cells=c.tr.exercises.map(x=>`<td><input class="grade-inp" data-p="${p.id}" data-x="${x.id}" type="number" min="1" max="10" step="0.5" inputmode="decimal" value="${g[x.id]!=null?g[x.id]:''}" oninput="setGrade(${p.id},${x.id},this)"></td>`).join('');
        const avg=sessionAvg(c.tr,p.id);
        const hasNote=!!(c.tr.notes[p.id]);
        const pre=p.isCaptain?'👑 ':p.isViceCaptain?'🥈 ':'';
        return `<tr data-row="${p.id}"><td style="text-align:left;font-weight:600">#${p.number} ${pre}${p.name}</td>${cells}
            <td class="voto num" id="tmedia-${p.id}" style="color:var(--brand)">${avg!=null?avg.toFixed(1):'—'}</td>
            <td><button class="btn ${hasNote?'btn-accent':'btn-ghost'} btn-icon" onclick="sessionNote(${p.id})" title="${hasNote?'Modifica nota':'Aggiungi nota'}"><i class="fa-solid fa-comment${hasNote?'':'-dots'}"></i></button></td></tr>`;
    }).join('');
    tbl.innerHTML=head+'<tbody>'+body+'</tbody>';
}
function addExercise(e){
    e.preventDefault(); const c=currentTraining(); if(!c)return;
    const name=document.getElementById('ex-name').value.trim(); if(!name)return;
    const id=(c.tr.exercises.reduce((m,x)=>Math.max(m,x.id),0)||0)+1;
    c.tr.exercises.push({id,name,cat:document.getElementById('ex-cat').value});
    save(); e.target.reset(); renderTraining(); toast('Esercizio aggiunto');
}
function removeExercise(exId){
    const c=currentTraining(); if(!c)return;
    confirmAction('Rimuovere questo esercizio e i relativi voti?',()=>{
        c.tr.exercises=c.tr.exercises.filter(x=>x.id!==exId);
        Object.keys(c.tr.grades).forEach(pid=>{ if(c.tr.grades[pid]) delete c.tr.grades[pid][exId]; });
        save(); renderTraining(); toast('Esercizio rimosso','info');
    });
}
function setGrade(pId,exId,el){
    const c=currentTraining(); if(!c)return;
    let v=parseFloat(el.value);
    if(!c.tr.grades[pId]) c.tr.grades[pId]={};
    if(isNaN(v)||el.value===''){ delete c.tr.grades[pId][exId]; }
    else { v=Math.max(1,Math.min(10,v)); c.tr.grades[pId][exId]=v; }
    const avg=sessionAvg(c.tr,pId);
    const cell=document.getElementById('tmedia-'+pId); if(cell) cell.textContent=avg!=null?avg.toFixed(1):'—';
    save();
}
function sessionNote(pId){
    const c=currentTraining(); if(!c)return; const p=playerById(pId);
    openModal(`<div class="modal-head"><h3><i class="fa-solid fa-comment" style="color:var(--brand)"></i> Nota · ${p.name}</h3>
        <button class="modal-close" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
        <div class="modal-body"><p style="color:var(--muted);font-size:.85rem;margin-bottom:.8rem">Commento sulla seduta "${c.ev.notes}". Lo vedrà il giocatore nella sua app.</p>
        <textarea id="snote" style="width:100%;height:100px;background:var(--surface-2);border:1px solid var(--line);color:var(--text);border-radius:10px;padding:10px;font-size:.9rem">${c.tr.notes[pId]||''}</textarea>
        <div class="modal-buttons"><button class="btn btn-ghost" onclick="closeModal()">Annulla</button>
        <button class="btn btn-accent" onclick="saveSessionNote(${pId})"><i class="fa-solid fa-check"></i> Salva nota</button></div></div>`);
}
function saveSessionNote(pId){
    const c=currentTraining(); if(!c)return;
    const v=document.getElementById('snote').value.trim();
    if(v) c.tr.notes[pId]=v; else delete c.tr.notes[pId];
    save(); closeModal(); renderTraining(); toast('Nota salvata');
}
/* ---- statistiche allenamento per giocatore ---- */
function sessionAvg(tr,pId){
    const g=tr.grades[pId]; if(!g) return null;
    const vals=Object.values(g).filter(v=>typeof v==='number');
    return vals.length? vals.reduce((a,b)=>a+b,0)/vals.length : null;
}
function playerTrainingStats(pId){
    const sessions=[]; const catSum={}, catCnt={}; let all=[];
    Object.keys(DB.trainings).forEach(eid=>{
        const tr=DB.trainings[eid]; const ev=DB.events.find(e=>e.id==eid); if(!ev) return;
        const g=tr.grades[pId]; if(!g) return;
        const vals=[];
        (tr.exercises||[]).forEach(x=>{ const v=g[x.id]; if(typeof v==='number'){vals.push(v);all.push(v);
            catSum[x.cat]=(catSum[x.cat]||0)+v; catCnt[x.cat]=(catCnt[x.cat]||0)+1; }});
        if(vals.length) sessions.push({d:ev.date,n:ev.notes,avg:vals.reduce((a,b)=>a+b,0)/vals.length});
    });
    sessions.sort((a,b)=>new Date(a.d)-new Date(b.d));
    const byCat={}; Object.keys(catSum).forEach(c=>byCat[c]=catSum[c]/catCnt[c]);
    return {avg: all.length? all.reduce((a,b)=>a+b,0)/all.length : null, count:sessions.length, sessions, byCat};
}

/* =========================================================
   FOTO GIOCATORE (IndexedDB) + CARD stile FC  (lato coach)
   ========================================================= */
var COACH_PHOTOS={};
function cIdb(){ return new Promise((res,rej)=>{const r=indexedDB.open('pm-media',1);
  r.onupgradeneeded=()=>{ if(!r.result.objectStoreNames.contains('img')) r.result.createObjectStore('img'); };
  r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error);}); }
async function cIdbGet(k){ try{const db=await cIdb(); return await new Promise(res=>{const t=db.transaction('img').objectStore('img').get(k); t.onsuccess=()=>res(t.result||null); t.onerror=()=>res(null);});}catch(e){return null;} }
async function cIdbSet(k,v){ try{const db=await cIdb(); return await new Promise(res=>{const t=db.transaction('img','readwrite').objectStore('img').put(v,k); t.onsuccess=()=>res(true); t.onerror=()=>res(false);});}catch(e){return false;} }
async function cIdbDel(k){ try{const db=await cIdb(); db.transaction('img','readwrite').objectStore('img').delete(k);}catch(e){} }
function cphAbbr(r){ return (r||'').replace(/[^A-Za-zÀ-ÿ]/g,'').slice(0,3).toUpperCase()||'—'; }
function cphInitials(n){ return (n||'?').trim().split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase()||'?'; }
function cphOverall(a){ return a? Math.max(40,Math.min(99,Math.round((a-2)/8*59+40))):null; }
function coachMediaCSS(){
  if(document.getElementById('coach-media-css'))return;
  const st=document.createElement('style'); st.id='coach-media-css';
  st.textContent=`
  #cph-av{overflow:visible!important;position:relative;cursor:pointer;}
  #cph-av .cph-im{width:100%;height:100%;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;}
  #cph-av .cph-im img{width:100%;height:100%;object-fit:cover;}
  #cph-av .cph-cam{position:absolute;bottom:-3px;right:-3px;width:24px;height:24px;border-radius:50%;background:var(--brand);color:#04140A;display:flex;align-items:center;justify-content:center;border:2px solid var(--surface);font-size:.62rem;}
  .fc-wrap{display:flex;flex-direction:column;align-items:center;}
  .fc{position:relative;width:300px;max-width:100%;border-radius:24px;overflow:hidden;background:linear-gradient(160deg,var(--fc-a),var(--fc-b));padding:18px 18px 20px;color:#0b1220;box-shadow:0 30px 70px -24px rgba(0,0,0,.75);}
  .fc::before{content:"";position:absolute;inset:0;background:linear-gradient(125deg,rgba(255,255,255,.4),transparent 38%,transparent 60%,rgba(255,255,255,.22));mix-blend-mode:overlay;pointer-events:none;}
  .fc .top{display:flex;justify-content:space-between;align-items:flex-start;position:relative;}
  .fc .ovr{text-align:center;line-height:.95;} .fc .ovr b{font-family:'Outfit',sans-serif;font-size:2.5rem;font-weight:900;display:block;}
  .fc .ovr span{font-size:.72rem;font-weight:800;letter-spacing:1px;}
  .fc .sporticon{font-size:1.7rem;}
  .fc .photo{width:176px;height:234px;margin:4px auto 8px;border-radius:16px;overflow:hidden;background:rgba(255,255,255,.28);display:flex;align-items:center;justify-content:center;}
  .fc .photo img{width:100%;height:100%;object-fit:cover;} .fc .photo .ini{font-family:'Outfit';font-weight:900;font-size:3rem;color:rgba(0,0,0,.32);}
  .fc .nm{text-align:center;font-family:'Outfit',sans-serif;font-weight:900;font-size:1.35rem;text-transform:uppercase;letter-spacing:.4px;line-height:1;}
  .fc .tm{text-align:center;font-weight:700;font-size:.82rem;opacity:.82;margin-top:3px;}
  .fc .stats{display:grid;grid-template-columns:1fr 1fr;gap:7px 16px;margin-top:14px;padding-top:12px;border-top:1px solid rgba(0,0,0,.2);position:relative;}
  .fc .st{display:flex;justify-content:space-between;font-weight:800;font-size:.85rem;} .fc .st span{opacity:.68;font-weight:700;}
  `;
  document.head.appendChild(st);
}
function loadCoachPhoto(id){
  if(COACH_PHOTOS[id]!==undefined) return;
  cIdbGet('p'+id).then(d=>{ COACH_PHOTOS[id]=d||null; const el=document.getElementById('cph-im-'+id); if(el&&d) el.innerHTML=`<img src="${d}">`; });
}
function pickPhotoCoach(id){
  const inp=document.createElement('input'); inp.type='file'; inp.accept='image/*';
  inp.onchange=()=>{ const f=inp.files&&inp.files[0]; if(!f)return;
    const rd=new FileReader(); rd.onload=()=>{ const im=new Image(); im.onload=()=>{
      const MAX=1000, r=Math.min(MAX/im.width,MAX/im.height,1), w=Math.round(im.width*r), h=Math.round(im.height*r);
      const cv=document.createElement('canvas'); cv.width=w; cv.height=h; cv.getContext('2d').drawImage(im,0,0,w,h);
      repositionCoach(cv.toDataURL('image/jpeg',0.85), async data=>{ await cIdbSet('p'+id,data); COACH_PHOTOS[id]=data; closeModal(); openPlayerCard(id); toast('Foto aggiornata'); });
    }; im.src=rd.result; };
    rd.readAsDataURL(f);
  };
  inp.click();
}
async function removePhotoCoach(id){ await cIdbDel('p'+id); COACH_PHOTOS[id]=null; closeModal(); openPlayerCard(id); toast('Foto rimossa'); }
function repositionCoach(srcDataURL, onConfirm){
  coachMediaCSS(); const Fw=246, Fh=328;
  openModal(`<div class="modal-head"><h3><i class="fa-solid fa-crop-simple" style="color:var(--brand)"></i> Posiziona la foto</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-body" style="text-align:center">
      <div id="rp-frame" style="width:${Fw}px;height:${Fh}px;margin:0 auto;border-radius:16px;overflow:hidden;position:relative;background:#000;touch-action:none;border:2px solid var(--brand)">
        <img id="rp-img" src="${srcDataURL}" style="position:absolute;left:0;top:0;transform-origin:0 0;user-select:none;pointer-events:none;max-width:none"></div>
      <div style="display:flex;align-items:center;gap:10px;margin-top:14px"><i class="fa-solid fa-magnifying-glass-minus" style="color:var(--muted)"></i>
        <input id="rp-zoom" type="range" min="100" max="300" value="100" style="flex:1"><i class="fa-solid fa-magnifying-glass-plus" style="color:var(--muted)"></i></div>
      <p style="color:var(--muted);font-size:.78rem;margin-top:6px">Trascina per spostare, usa lo slider per lo zoom.</p>
      <button class="btn btn-accent" style="width:100%;margin-top:12px" onclick="confirmCoachPhoto()"><i class="fa-solid fa-check"></i> Conferma</button>
    </div>`, true);
  const frame=document.getElementById('rp-frame'), img=document.getElementById('rp-img');
  const st={imgW:0,imgH:0,cover:1,zoom:1,tx:0,ty:0};
  const dW=()=>st.imgW*st.cover*st.zoom, dH=()=>st.imgH*st.cover*st.zoom;
  const clamp=()=>{ st.tx=Math.min(0,Math.max(Fw-dW(),st.tx)); st.ty=Math.min(0,Math.max(Fh-dH(),st.ty)); };
  const apply=()=>{ img.style.transform=`translate(${st.tx}px,${st.ty}px) scale(${st.cover*st.zoom})`; };
  const init=()=>{ st.imgW=img.naturalWidth; st.imgH=img.naturalHeight; st.cover=Math.max(Fw/st.imgW,Fh/st.imgH); st.zoom=1; st.tx=(Fw-dW())/2; st.ty=(Fh-dH())/2; clamp(); apply(); };
  img.onload=init; if(img.complete && img.naturalWidth) init();
  document.getElementById('rp-zoom').oninput=e=>{ const z=e.target.value/100, cx=Fw/2-st.tx, cy=Fh/2-st.ty, ratio=z/st.zoom; st.zoom=z; st.tx=Fw/2-cx*ratio; st.ty=Fh/2-cy*ratio; clamp(); apply(); };
  let px,py,drag=false;
  frame.addEventListener('pointerdown',e=>{drag=true;px=e.clientX;py=e.clientY;try{frame.setPointerCapture(e.pointerId);}catch(_){}});
  frame.addEventListener('pointermove',e=>{ if(!drag)return; st.tx+=e.clientX-px; st.ty+=e.clientY-py; px=e.clientX; py=e.clientY; clamp(); apply(); });
  frame.addEventListener('pointerup',()=>drag=false); frame.addEventListener('pointercancel',()=>drag=false);
  window.__rpc={st,Fw,Fh,img,onConfirm};
}
function confirmCoachPhoto(){
  const R=window.__rpc; if(!R){closeModal();return;}
  const {st,Fw,Fh,img,onConfirm}=R, Tw=480,Th=640, s=st.cover*st.zoom;
  const c=document.createElement('canvas'); c.width=Tw; c.height=Th;
  c.getContext('2d').drawImage(img,(-st.tx)/s,(-st.ty)/s,Fw/s,Fh/s,0,0,Tw,Th);
  onConfirm(c.toDataURL('image/jpeg',0.78));
}
function openPlayerCard(id){
  coachMediaCSS();
  const p=playerById(id), s=getSeasonStats(id), sport=curSport();
  const ovr=cphOverall(s.avgVoto);
  const pal={pallavolo:['#F6D365','#E2A13C'],calcio:['#7BE0A3','#34A853'],basket:['#FDBA74','#F97316']}[sport]||['#F6D365','#E2A13C'];
  const ic={pallavolo:'🏐',calcio:'⚽',basket:'🏀'}[sport]||'🏅';
  const cells=(s.cells||[]).slice(0,4);
  const photo=COACH_PHOTOS[id]?`<img src="${COACH_PHOTOS[id]}">`:`<div class="ini">${cphInitials(p.name)}</div>`;
  const stats=cells.length?cells.map(c=>`<div class="st"><span>${c[0]}</span> ${c[1]}${c[2]||''}</div>`).join(''):`<div class="st"><span>Media voto</span> ${s.avgVoto?s.avgVoto.toFixed(1):'—'}</div>`;
  openModal(`<div class="modal-head"><h3><i class="fa-solid fa-id-badge" style="color:var(--brand)"></i> Card · ${p.name}</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-body fc-wrap">
      <div class="fc" style="--fc-a:${pal[0]};--fc-b:${pal[1]}">
        <div class="top"><div class="ovr"><b>${ovr||'—'}</b><span>${cphAbbr(p.role)}</span></div><div class="sporticon">${ic}</div></div>
        <div class="photo">${photo}</div>
        <div class="nm">${p.name} <span style="opacity:.55">#${p.number||''}</span></div>
        <div class="tm">${DB.teamName||''}</div>
        <div class="stats">${stats}</div>
      </div>
      <button class="btn btn-accent" style="width:100%;margin-top:16px" onclick="pickPhotoCoach(${id})"><i class="fa-solid fa-camera"></i> ${COACH_PHOTOS[id]?'Cambia foto':'Aggiungi foto'}</button>
      ${COACH_PHOTOS[id]?`<button class="btn btn-ghost" style="width:100%;margin-top:8px" onclick="removePhotoCoach(${id})"><i class="fa-solid fa-trash"></i> Rimuovi foto</button>`:''}
    </div>`, true);
}

/* =========================================================
   FORMAZIONE CONSIGLIATA (meritocrazia) — tutti gli sport
   ========================================================= */
const FORMATION = {
  pallavolo: [['Palleggiatore',1],['Opposto',1],['Schiacciatore',2],['Centrale',2],['Libero',1]],
  calcio:    [['Portiere',1],['Difensore',4],['Centrocampista',3],['Attaccante',3]],
  basket:    [['Playmaker',1],['Guardia',1],['Ala piccola',1],['Ala grande',1],['Centro',1]]
};
function injectFmzCSS(){
  if(document.getElementById('fmz-css'))return;
  const st=document.createElement('style'); st.id='fmz-css';
  st.textContent=`
  .fmz-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;}
  .fmz-role{background:var(--surface-2);border:1px solid var(--line);border-radius:14px;padding:12px 14px;}
  .fmz-role-h{font-weight:800;font-family:'Outfit',sans-serif;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;}
  .fmz-n{color:var(--muted);font-size:.8rem;font-weight:600;}
  .fmz-slot{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--line);}
  .fmz-slot:last-child{border-bottom:0;}
  .fmz-slot.empty{color:var(--muted);font-style:italic;font-size:.85rem;justify-content:center;padding:10px 0;}
  .fmz-num{font-family:'Outfit',sans-serif;font-weight:800;color:var(--brand);min-width:36px;}
  .fmz-name{flex:1;font-weight:600;}
  .fmz-role-tag{color:var(--muted);font-size:.78rem;}
  .voto-badge{font-family:'Outfit',sans-serif;font-weight:800;border-radius:8px;padding:3px 9px;font-size:.85rem;}
  .voto-badge.hi{background:rgba(34,197,94,.18);color:#22C55E;} .voto-badge.md{background:rgba(245,179,1,.16);color:#f5b301;}
  .voto-badge.lo{background:rgba(240,70,60,.16);color:#F0463C;} .voto-badge.nd{background:var(--surface);color:var(--muted);}
  .fmz-bench .fmz-slot{border-bottom:1px solid var(--line);}
  `;
  document.head.appendChild(st);
}
function renderFormazione(){
  injectFmzCSS();
  const sport=curSport(), plan=FORMATION[sport]||FORMATION.pallavolo;
  const players=DB.players.map(p=>({p, v:getSeasonStats(p.id).avgVoto}));
  const byRole=r=>players.filter(x=>x.p.role===r).sort((a,b)=>((b.v??-1)-(a.v??-1)));
  const badge=v=> v==null?'<span class="voto-badge nd">—</span>':`<span class="voto-badge ${v>=7?'hi':v>=5.5?'md':'lo'}">${v.toFixed(1)}</span>`;
  const used=new Set(); const starters=[];
  plan.forEach(([role,n])=>{
    const pool=byRole(role).filter(x=>!used.has(x.p.id)); const slots=[];
    for(let i=0;i<n;i++){ const pick=pool[i]; if(pick){used.add(pick.p.id);slots.push(pick);} else slots.push(null); }
    starters.push({role,slots});
  });
  const startersHtml=starters.map(g=>`
    <div class="fmz-role"><div class="fmz-role-h">${g.role} <span class="fmz-n">×${g.slots.length}</span></div>
      ${g.slots.map(s=> s?`<div class="fmz-slot"><span class="fmz-num">#${s.p.number}</span><span class="fmz-name">${s.p.name}</span>${badge(s.v)}</div>`:`<div class="fmz-slot empty">nessun ${g.role.toLowerCase()} in rosa</div>`).join('')}
    </div>`).join('');
  const bench=players.filter(x=>!used.has(x.p.id)).sort((a,b)=>((b.v??-1)-(a.v??-1)));
  const benchHtml=bench.length? bench.map(x=>`<div class="fmz-slot"><span class="fmz-num">#${x.p.number}</span><span class="fmz-name">${x.p.name}</span><span class="fmz-role-tag">${x.p.role}</span>${badge(x.v)}</div>`).join('') : '<p class="hint">Nessuna riserva.</p>';
  document.getElementById('formazione-content').innerHTML=`
    <div class="card"><h3><i class="fa-solid fa-star" style="color:var(--brand)"></i> Titolari consigliati</h3>
      <div class="fmz-grid">${startersHtml}</div>
      <p class="hint" style="margin-top:1rem">Scelti per media voto. Più registri partite nello Scout, più la formazione diventa precisa.</p>
    </div>
    <div class="card"><h3><i class="fa-solid fa-users" style="color:var(--muted)"></i> Riserve (in ordine di rendimento)</h3>
      <div class="fmz-bench">${benchHtml}</div>
    </div>`;
}
