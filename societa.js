/* =========================================================
   AiRIM Società — area amministrativa (presidente, dirigenti, allenatori)
   Pagina separata dal Coach: il boot di app.js (prova, licenza tecnica,
   localStorage volleyteam_db) qui non parte.
   - Client Supabase PROPRIO con storageKey 'airim-soc-auth': la sessione
     Società (anche anonima, per lo staff con codice + PIN) non sostituisce
     mai quella del coach, e viceversa.
   - Nessun dato amministrativo salvato sul dispositivo: tutto in memoria,
     ricaricato dal server a ogni apertura. Resta solo il token di sessione.
   - Letture dalle tabelle soc_* (filtrate dall'RLS per ruolo), scritture
     SOLO dalle funzioni soc_* (Prompt/soc_02_funzioni.sql).
   ========================================================= */
'use strict';

const SUPABASE_URL = 'https://dvyrfoaeqtcdvgxnkswu.supabase.co';            // stessi valori di supabase.js
const SUPABASE_ANON_KEY = 'sb_publishable_tghtDcorJoNBRd95gOkqYQ_R6pbASbm';
const CONTACT_WHATSAPP = '393498290606';
const CONTACT_INSTAGRAM_URL = 'https://www.instagram.com/othibyte/';

const S = { sb: null, user: null, socs: [], soc: null, view: 'home', params: {}, cache: {} };
const $ = (id) => document.getElementById(id);

/* ---------- utilità ---------- */
function esc(v) {
  return v == null ? '' : String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function euro(n) {
  const x = Number(n) || 0;
  return (x % 1 ? x.toFixed(2).replace('.', ',') : String(x)) + ' €';
}
function oggi() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function dataIt(d) { if (!d) return ''; const [y, m, g] = String(d).slice(0, 10).split('-'); return g + '/' + m + '/' + y; }
function quando(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
         d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}
function nomeCompleto(x) { return [x.nome, x.cognome].filter(Boolean).join(' '); }
function waLink(numero, testo) {
  return 'https://wa.me/' + String(numero || '').replace(/\D/g, '') + '?text=' + encodeURIComponent(testo || '').replace(/'/g, '%27');
}
function ruoloLabel(r) { return { presidente: 'Presidente', dirigente: 'Dirigente', allenatore: 'Allenatore' }[r] || r; }

function toast(msg, type) {
  const el = document.createElement('div');
  el.className = 'toast ' + (type || '');
  el.textContent = msg;
  $('toast-stack').appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

const ERRORI = {
  non_autenticato: 'Sessione scaduta: accedi di nuovo.',
  accesso_anonimo_non_consentito: 'Per questa operazione serve l\'accesso con email.',
  non_autorizzato: 'Non hai i permessi per questa operazione.',
  licenza_societa_non_attiva: 'La licenza AiRIM Società non è attiva.',
  hai_gia_una_societa: 'Con questo account hai già creato una società.',
  dati_non_validi: 'Controlla i dati inseriti.',
  telefono_non_valido: 'Numero di telefono non valido.',
  iban_non_valido: 'IBAN non valido.',
  squadra_non_trovata: 'Squadra non trovata: ricarica la pagina.',
  tesserato_non_trovato: 'Tesserato non trovato: ricarica la pagina.',
  voce_non_trovata: 'Voce non trovata: ricarica la pagina.',
  membro_non_trovato: 'Persona non trovata: ricarica la pagina.',
  voce_gia_pagata: 'Questa voce risulta già pagata.',
  importo_superiore_al_residuo: 'L\'importo supera quanto resta da pagare.',
  importo_inferiore_al_pagato: 'L\'importo non può essere minore di quanto già pagato.',
  nessun_importo_dovuto: 'Non risulta nulla di scaduto da pagare.',
  minorenne_solo_whatsapp: 'Per i minorenni l\'avviso va al genitore su WhatsApp.',
  squadra_non_collegata: 'La squadra non è ancora collegata ad AiRIM Coach.',
  rosa_non_disponibile: 'L\'allenatore non ha ancora sincronizzato la rosa: chiedigli di premere "Sincronizza" nel Coach.',
};
function errText(e) {
  const m = (e && e.message) || '';
  if (ERRORI[m]) return ERRORI[m];
  if (/fetch|network|Failed to|Load failed/i.test(m) || !navigator.onLine) return 'Connessione assente: riprova.';
  console.warn('[Società]', e);
  return 'Operazione non riuscita. Riprova.';
}

/* ---------- client e chiamate ---------- */
async function client() {
  if (S.sb) return S.sb;
  const m = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  S.sb = m.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { storageKey: 'airim-soc-auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return S.sb;
}
async function rpc(fn, args) {
  const sb = await client();
  const { data, error } = await sb.rpc(fn, args || {});
  if (error) {
    if (error.message === 'non_autenticato') setTimeout(() => esci(true), 0);
    throw error;
  }
  return data;
}
/* lettura di una tabella: q riceve il query builder e aggiunge filtri e ordinamento */
async function leggi(tabella, colonne, q) {
  const sb = await client();
  let b = sb.from(tabella).select(colonne);
  if (q) b = q(b);
  const { data, error } = await b;
  if (error) throw error;
  return data || [];
}
/* esegue un'azione dal bottone: disattiva il bottone, mostra l'errore in italiano */
async function azione(btn, fn) {
  if (btn) btn.disabled = true;
  try { return await fn(); }
  catch (e) { toast(errText(e), 'danger'); }
  finally { if (btn) btn.disabled = false; }
}

/* ---------- foglio (finestra dal basso) e conferma ---------- */
function apriFoglio(html) { $('sheet-box').innerHTML = html; $('sheet').classList.add('show'); }
function chiudiFoglio() { $('sheet').classList.remove('show'); $('sheet-box').innerHTML = ''; }
$('sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet') chiudiFoglio(); });
let _confermaCb = null;
function conferma(testo, cb, etichetta, pericolo) {
  _confermaCb = cb;
  apriFoglio(`<h3>${esc(testo)}</h3><div class="btns">
    <button class="btn btn-ghost" onclick="chiudiFoglio()">Annulla</button>
    <button class="btn ${pericolo ? 'btn-danger' : 'btn-accent'}" onclick="const f=_confermaCb;chiudiFoglio();f&&f()">${esc(etichetta || 'Conferma')}</button></div>`);
}

/* ---------- privacy della Società (versione separata da quella dei coach) ---------- */
const SOC_PRIVACY_VERSION = 'soc-v1.0 — 2026-10-21';
const SOC_PRIVACY_TEXT = `INFORMATIVA E ACCORDO PER IL TRATTAMENTO DEI DATI — AiRIM Società

Creando la società in AiRIM Società, il Presidente (o il legale rappresentante) dichiara di agire per conto della Società Sportiva / ASD e accetta quanto segue.

1. Ruoli
- Titolare del trattamento: la Società Sportiva, che decide quali dati inserire e per quali finalità (gestione dei tesserati, delle quote e dei solleciti di pagamento).
- Responsabile del trattamento (art. 28 GDPR): lo Sviluppatore di AiRIM (OthiByte), che fornisce il software e il database e tratta i dati solo per erogare il servizio, secondo le istruzioni della Società.

2. Dati trattati
- Staff: nome, cognome, telefono, ruolo; codice personale e PIN (il PIN è salvato solo in forma cifrata).
- Tesserati: nome, cognome, ruolo, numero di maglia, telefono; per i minorenni nome e telefono di un genitore o tutore.
- Quote: importi dovuti, scadenze, pagamenti ricevuti (data, importo, metodo), solleciti inviati.
- IBAN e intestatario del conto della Società.
AiRIM Società NON tratta dati sanitari, certificati medici, codici fiscali o documenti d'identità. Voti, statistiche e check-in dell'app Coach non sono visibili al Presidente né ai dirigenti.

3. Responsabilità della Società
La Società garantisce di avere una base giuridica per il trattamento (es. rapporto associativo) e di aver informato i tesserati e, per i minorenni, i genitori o tutori. I messaggi WhatsApp partono dal telefono di chi li invia: la Società è responsabile del loro contenuto e dei destinatari.

4. Sicurezza e conservazione
I dati sono conservati su infrastruttura Supabase (cloud) con accesso protetto e regole per ruolo: gli allenatori non vedono quote, pagamenti né telefoni. I pagamenti non si cancellano, si annullano, per tenere uno storico affidabile. I dati restano finché la Società usa il servizio; alla chiusura vengono cancellati su richiesta del Presidente.

5. Diritti
Gli interessati possono chiedere accesso, rettifica o cancellazione alla Società, che può inoltrare la richiesta allo Sviluppatore.

Contatti dello Sviluppatore: WhatsApp +39 349 829 0606 · Instagram @othibyte`;
async function sha256(t) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join('');
}

/* =========================================================
   AVVIO E ACCESSO
   ========================================================= */
async function avvio() {
  try {
    const sb = await client();
    const { data } = await sb.auth.getSession();
    S.user = data && data.session ? data.session.user : null;
  } catch (e) {
    $('app').innerHTML = `<div class="card"><h3><i class="fa-solid fa-wifi"></i> Connessione assente</h3>
      <p class="muted">AiRIM Società lavora solo online: i dati amministrativi non restano sul telefono.</p>
      <div class="btns" style="margin-top:1rem"><button class="btn btn-accent" onclick="location.reload()">Riprova</button></div></div>`;
    return;
  }
  if (!S.user) return schermataAccesso();
  await caricaSocieta();
}

async function caricaSocieta(idScelto) {
  let righe;
  try { righe = await rpc('soc_mie_societa'); }
  catch (e) { $('app').innerHTML = `<div class="card"><p>${esc(errText(e))}</p><div class="btns" style="margin-top:1rem"><button class="btn btn-accent" onclick="location.reload()">Riprova</button></div></div>`; return; }
  // una riga per ruolo: per ogni società vale la prima (presidente > dirigente > allenatore)
  const viste = new Set();
  S.socs = (righe || []).filter((r) => !viste.has(r.societa_id) && viste.add(r.societa_id));
  if (!S.socs.length) {
    if (S.user.is_anonymous) { await esci(true, 'Accesso scaduto o revocato: inserisci di nuovo codice e PIN.'); return; }
    return schermataCrea();
  }
  if (S.socs.length > 1 && !idScelto) return schermataScelta();
  S.soc = S.socs.find((r) => r.societa_id === idScelto) || S.socs[0];
  S.cache = {};
  if (!S.soc.attiva) return schermataLicenza();
  vai(S.soc.ruolo === 'allenatore' ? 'allenatore' : 'squadre');
}

function intestazione() {
  const chi = S.soc ? `${esc(S.soc.membro_nome)} · ${ruoloLabel(S.soc.ruolo)}` : (S.user && S.user.email ? esc(S.user.email) : '');
  return `<div class="top"><img src="icons/logo-badge.png" alt=""><div class="t"><b>${esc(S.soc ? S.soc.nome : 'AiRIM Società')}</b><span>${chi}</span></div>
    <button class="btn btn-ghost btn-sm" onclick="esci()"><i class="fa-solid fa-right-from-bracket"></i> Esci</button></div>`;
}

let _tabAccesso = 'staff', _registrati = false;
function schermataAccesso(msg) {
  $('nav').hidden = true;
  const pres = _tabAccesso === 'presidente';
  $('app').innerHTML = `
    <div class="top"><img src="icons/logo-badge.png" alt=""><div class="t"><b>AiRIM Società</b><span>Area amministrativa</span></div></div>
    ${msg ? `<div class="card" style="border-color:var(--warn)">${esc(msg)}</div>` : ''}
    <div class="tabs"><button class="${pres ? '' : 'on'}" onclick="_tabAccesso='staff';schermataAccesso()">Dirigente o allenatore</button>
      <button class="${pres ? 'on' : ''}" onclick="_tabAccesso='presidente';schermataAccesso()">Presidente</button></div>
    ${pres ? `
    <div class="card"><h3><i class="fa-solid fa-user-tie"></i> ${_registrati ? 'Crea il tuo account' : 'Accedi con la tua email'}</h3>
      <div class="fg"><label>Email</label><input id="a-email" type="email" autocomplete="email"></div>
      <div class="fg"><label>Password</label><input id="a-pass" type="password" autocomplete="${_registrati ? 'new-password' : 'current-password'}"></div>
      <button class="btn btn-accent btn-block" onclick="accediPresidente(this)">${_registrati ? 'Crea account' : 'Accedi'}</button>
      <p class="hint">Puoi usare lo stesso account di AiRIM Coach.
        <a href="#" onclick="_registrati=!_registrati;schermataAccesso();return false">${_registrati ? 'Hai già un account? Accedi' : 'Non hai un account? Crealo'}</a></p></div>` : `
    <div class="card"><h3><i class="fa-solid fa-key"></i> Codice personale e PIN</h3>
      <div class="fg"><label>Codice personale</label><input id="a-cod" placeholder="es. TULA-K7Q3" autocapitalize="characters" autocomplete="username"></div>
      <div class="fg"><label>PIN (6 cifre)</label><input id="a-pin" type="password" inputmode="numeric" maxlength="6" autocomplete="current-password"></div>
      <button class="btn btn-accent btn-block" onclick="accediStaff(this)">Accedi</button>
      <p class="hint">Codice e PIN te li manda il presidente della società. Dopo 5 tentativi sbagliati l'accesso si blocca per 15 minuti.</p></div>`}`;
}

async function accediPresidente(btn) {
  const email = $('a-email').value.trim(), password = $('a-pass').value;
  if (!email || !password) return toast('Inserisci email e password', 'danger');
  await azione(btn, async () => {
    const sb = await client();
    if (_registrati) {
      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) throw error;
      if (!data.session) { _registrati = false; return schermataAccesso('Ti abbiamo mandato una mail: conferma l\'indirizzo, poi accedi qui.'); }
      S.user = data.session.user;
    } else {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) { toast(/invalid/i.test(error.message) ? 'Email o password sbagliate' : errText(error), 'danger'); return; }
      S.user = data.user;
    }
    await caricaSocieta();
  });
}

async function accediStaff(btn) {
  const codice = $('a-cod').value.trim().toUpperCase(), pin = $('a-pin').value.trim();
  if (!codice || !/^\d{6}$/.test(pin)) return toast('Inserisci il codice e il PIN di 6 cifre', 'danger');
  await azione(btn, async () => {
    const sb = await client();
    // ogni dispositivo dello staff ha un proprio utente anonimo, legato al membro da soc_accedi
    let { data } = await sb.auth.getSession();
    if (!data.session || !data.session.user.is_anonymous) {
      if (data.session) await sb.auth.signOut();
      const r = await sb.auth.signInAnonymously();
      if (r.error) throw r.error;
      data = r.data;
    }
    const esito = ((await rpc('soc_accedi', { p_codice: codice, p_pin: pin })) || [])[0] || {};
    if (esito.esito === 'bloccato') return toast('Troppi tentativi sbagliati: riprova tra 15 minuti.', 'danger');
    if (esito.esito !== 'ok') return toast('Codice o PIN sbagliati.', 'danger');
    S.user = (await sb.auth.getSession()).data.session.user;
    await caricaSocieta(esito.societa_id);
  });
}

async function esci(silenzioso, msg) {
  try {
    const sb = await client();
    if (S.user && S.user.is_anonymous && !silenzioso) await sb.rpc('soc_esci');
    await sb.auth.signOut();
  } catch (e) { /* senza rete: la sessione locale si toglie comunque */ }
  S.user = null; S.soc = null; S.socs = []; S.cache = {};
  chiudiFoglio();
  schermataAccesso(msg);
}

function schermataScelta() {
  $('nav').hidden = true;
  $('app').innerHTML = intestazione() + `<h2>Scegli la società</h2><div class="list">${S.socs.map((s) => `
    <button class="item" onclick="caricaSocieta('${s.societa_id}')"><div class="b"><b>${esc(s.nome)}</b><small>${ruoloLabel(s.ruolo)}</small></div><i class="fa-solid fa-chevron-right muted"></i></button>`).join('')}</div>`;
}

function schermataCrea() {
  $('nav').hidden = true;
  $('app').innerHTML = intestazione() + `
    <div class="eyebrow">Primo accesso</div><h2>Crea la tua società</h2>
    <div class="card">
      <div class="fg"><label>Nome della società</label><input id="c-nome" placeholder="es. ASD Volley Tula" maxlength="80"></div>
      <div class="row"><div class="fg"><label>Il tuo nome</label><input id="c-pn" maxlength="60"></div>
        <div class="fg"><label>Cognome</label><input id="c-pc" maxlength="60"></div></div>
      <div class="fg"><label>Telefono (facoltativo)</label><input id="c-tel" type="tel" placeholder="+39 …"></div>
      <div class="policy">${esc(SOC_PRIVACY_TEXT)}</div>
      <label class="check"><input type="checkbox" id="c-ok"> Ho letto e accetto l'informativa per conto della società (versione ${esc(SOC_PRIVACY_VERSION)})</label>
      <button class="btn btn-accent btn-block" onclick="creaSocieta(this)">Crea la società</button>
      <p class="hint">Dopo la creazione la licenza AiRIM Società va attivata: ti diciamo noi come.</p></div>`;
}

async function creaSocieta(btn) {
  const nome = $('c-nome').value.trim(), pn = $('c-pn').value.trim();
  if (nome.length < 2 || !pn) return toast('Scrivi il nome della società e il tuo nome', 'danger');
  if (!$('c-ok').checked) return toast('Per continuare accetta l\'informativa', 'danger');
  await azione(btn, async () => {
    const id = await rpc('soc_crea_societa', {
      p_nome: nome, p_nome_presidente: pn, p_cognome_presidente: $('c-pc').value.trim(), p_telefono: $('c-tel').value.trim(),
      p_privacy_versione: SOC_PRIVACY_VERSION, p_privacy_hash: await sha256(SOC_PRIVACY_TEXT),
    });
    toast('Società creata');
    await caricaSocieta(id);
  });
}

function schermataLicenza() {
  $('nav').hidden = true;
  const msg = `Ciao! Vorrei attivare AiRIM Società per: ${S.soc.nome}`;
  const scaduta = S.soc.scade_il && new Date(S.soc.scade_il) < new Date();
  $('app').innerHTML = intestazione() + `
    <div class="eyebrow">Licenza</div><h2>${scaduta ? 'Licenza AiRIM Società scaduta' : 'Attiva AiRIM Società'}</h2>
    <div class="card"><p class="muted" style="margin-bottom:1rem">${S.soc.ruolo === 'presidente'
      ? 'La società è pronta. Per usare anagrafica, quote e solleciti scrivici: attiviamo la licenza e poi premi "Ricontrolla".'
      : 'La licenza della società non è attiva: chiedi al presidente di contattarci.'}</p>
      <div class="btns" style="flex-direction:column">
        <a class="btn btn-accent" href="${waLink(CONTACT_WHATSAPP, msg)}" target="_blank" rel="noopener">💬 Scrivici su WhatsApp</a>
        <a class="btn btn-ghost" href="${CONTACT_INSTAGRAM_URL}" target="_blank" rel="noopener">📩 Scrivici su Instagram</a>
        <button class="btn btn-ghost" onclick="azione(this,()=>caricaSocieta(S.soc.societa_id))"><i class="fa-solid fa-rotate"></i> Ricontrolla</button></div></div>`;
}

/* =========================================================
   NAVIGAZIONE (le schermate si registrano in VISTE)
   ========================================================= */
const VISTE = {};      // nome → { titolo, icona, ruoli (null = solo schermata interna), render }
function vai(nome, params) {
  S.view = nome; S.params = params || {};
  chiudiFoglio();
  const v = VISTE[nome];
  const tabs = Object.entries(VISTE).filter(([, x]) => x.icona && x.ruoli.includes(S.soc.ruolo));
  $('nav').hidden = tabs.length < 2;
  $('nav-in').innerHTML = tabs.map(([k, x]) => `<button class="${k === nome || k === v.tab ? 'on' : ''}" onclick="vai('${k}')"><i class="fa-solid ${x.icona}"></i>${x.titolo}</button>`).join('');
  $('app').innerHTML = intestazione() + '<div id="view"><div class="loading"><i class="fa-solid fa-spinner fa-spin"></i></div></div>';
  window.scrollTo(0, 0);
  Promise.resolve(v.render(S.params)).catch((e) => { const el = $('view'); if (el) el.innerHTML = `<div class="card">${esc(errText(e))}</div>`; });
}
function ricarica() { vai(S.view, S.params); }
function vista(html) { const el = $('view'); if (el) el.innerHTML = html; }

/* allenatore: in Fase A vede solo le sue squadre (la vista certificati arriva in Fase B) */
VISTE.allenatore = { titolo: 'Squadre', icona: 'fa-people-group', ruoli: ['allenatore'], async render() {
  const sq = await leggi('soc_squadre', 'id,nome,stagione,team_id', (b) => b.eq('societa_id', S.soc.societa_id).order('nome'));
  vista(`<div class="eyebrow">Allenatore</div><h2>Le tue squadre</h2>
    <div class="list">${sq.map((x) => `<div class="item"><div class="b"><b>${esc(x.nome)}</b><small>${esc(x.stagione)} · ${x.team_id ? 'collegata ad AiRIM Coach' : 'non ancora collegata ad AiRIM Coach'}</small></div></div>`).join('') || '<div class="empty">Nessuna squadra assegnata.</div>'}</div>
    <div class="card" style="margin-top:1rem"><h3><i class="fa-solid fa-link"></i> Collega AiRIM Coach</h3>
      <p class="muted">Se usi AiRIM Coach con la tua email, aprilo e vai in Impostazioni → Società → "Collega a una società" con questo stesso codice e PIN. Da quel momento la società può importare la rosa (solo nome, numero e ruolo).</p></div>`);
} };

/* =========================================================
   SQUADRE E TESSERATI
   ========================================================= */
function stagioneCorrente() {
  const d = new Date(), y = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;   // da luglio parte la stagione nuova
  return y + '/' + String((y + 1) % 100).padStart(2, '0');
}
async function squadre(forza) {
  if (!S.cache.squadre || forza) {
    S.cache.squadre = await leggi('soc_squadre', 'id,nome,stagione,team_id', (b) => b.eq('societa_id', S.soc.societa_id).order('nome'));
  }
  return S.cache.squadre;
}
/* semaforo di un tesserato dalle sue voci: rosso = qualcosa di scaduto, giallo = da pagare più avanti, verde = in regola */
function semaforo(voci) {
  const scaduto = voci.filter((v) => v.residuo > 0 && v.scadenza < oggi()).reduce((s, v) => s + Number(v.residuo), 0);
  const futuro = voci.filter((v) => v.residuo > 0 && v.scadenza >= oggi()).reduce((s, v) => s + Number(v.residuo), 0);
  return { scaduto, futuro, cls: scaduto > 0 ? 'bad' : futuro > 0 ? 'warn' : voci.length ? 'ok' : '' };
}
async function vociDi(idTesserati) {
  if (!idTesserati.length) return [];
  return leggi('soc_v_voci', 'id,tesserato_id,tipo,competenza,descrizione,importo,scadenza,esente,nota,modificata_a_mano,pagato,residuo,stato,parziale',
    (b) => b.in('tesserato_id', idTesserati).order('scadenza'));
}

VISTE.squadre = { titolo: 'Squadre', icona: 'fa-people-group', ruoli: ['presidente', 'dirigente'], async render() {
  const sq = await squadre(true);
  vista(`<div class="eyebrow">Anagrafica</div><h2>Squadre</h2>
    <div class="list">${sq.map((x) => `<button class="item" onclick="vai('squadra',{id:'${x.id}'})">
      <div class="b"><b>${esc(x.nome)}</b><small>${esc(x.stagione)}${x.team_id ? ' · <i class="fa-solid fa-link"></i> AiRIM Coach' : ''}</small></div><i class="fa-solid fa-chevron-right muted"></i></button>`).join('')
      || '<div class="empty">Nessuna squadra: crea la prima.</div>'}</div>
    <button class="btn btn-accent btn-block" style="margin-top:1rem" onclick="foglioSquadra()"><i class="fa-solid fa-plus"></i> Nuova squadra</button>`);
} };

function foglioSquadra(id) {
  const x = (S.cache.squadre || []).find((s) => s.id === id) || { nome: '', stagione: stagioneCorrente() };
  apriFoglio(`<h3>${id ? 'Modifica squadra' : 'Nuova squadra'}</h3>
    <div class="fg"><label>Nome</label><input id="q-nome" value="${esc(x.nome)}" maxlength="60" placeholder="es. Under 16 Femminile"></div>
    <div class="fg"><label>Stagione</label><input id="q-stag" value="${esc(x.stagione)}" placeholder="2026/27" maxlength="7"></div>
    <div class="btns"><button class="btn btn-ghost" onclick="chiudiFoglio()">Annulla</button>
      <button class="btn btn-accent" onclick="salvaSquadra(this,${id ? `'${id}'` : 'null'})">Salva</button></div>`);
}
async function salvaSquadra(btn, id) {
  const nome = $('q-nome').value.trim(), stagione = $('q-stag').value.trim();
  if (!nome || !/^\d{4}\/\d{2}$/.test(stagione)) return toast('Scrivi il nome e la stagione nel formato 2026/27', 'danger');
  await azione(btn, async () => {
    const nuovo = await rpc('soc_salva_squadra', { p_societa: S.soc.societa_id, p_id: id, p_nome: nome, p_stagione: stagione });
    toast('Squadra salvata');
    await squadre(true);
    vai('squadra', { id: nuovo });
  });
}

VISTE.squadra = { tab: 'squadre', ruoli: ['presidente', 'dirigente'], async render({ id }) {
  const sq = (await squadre(true)).find((x) => x.id === id);
  if (!sq) return vai('squadre');
  const tess = await leggi('soc_tesserati', 'id,nome,cognome,numero,ruolo,minorenne,attivo,player_id',
    (b) => b.eq('squadra_id', id).order('cognome').order('nome'));
  const voci = await vociDi(tess.map((t) => t.id));
  S.cache.tesserati = tess;
  const riga = (t) => {
    const s = semaforo(voci.filter((v) => v.tesserato_id === t.id));
    return `<button class="item" onclick="vai('tesserato',{id:'${t.id}'})"><span class="dot ${s.cls}"></span>
      <div class="b"><b>${esc(nomeCompleto(t))}${t.numero != null ? ` <span class="muted">#${t.numero}</span>` : ''}</b>
      <small>${esc(t.ruolo || '')}${t.minorenne ? ' · minorenne' : ''}${t.attivo ? '' : ' · non più in squadra'}</small></div>
      <div class="r">${s.scaduto > 0 ? `<span style="color:var(--bad)">${euro(s.scaduto)}</span>` : ''}</div></button>`;
  };
  const attivi = tess.filter((t) => t.attivo), usciti = tess.filter((t) => !t.attivo);
  vista(`<button class="back" onclick="vai('squadre')"><i class="fa-solid fa-chevron-left"></i> Squadre</button>
    <div class="eyebrow">${esc(sq.stagione)}</div><h2>${esc(sq.nome)} <button class="btn btn-ghost btn-sm" onclick="foglioSquadra('${sq.id}')"><i class="fa-solid fa-pen"></i></button></h2>
    <div id="sq-extra"></div>
    <div class="card"><h3><i class="fa-solid fa-users"></i> Tesserati (${attivi.length})</h3>
      <div class="list">${attivi.map(riga).join('') || '<div class="empty">Nessun tesserato.</div>'}</div>
      ${usciti.length ? `<p class="hint" style="margin:1rem 0 .5rem">Non più in squadra</p><div class="list">${usciti.map(riga).join('')}</div>` : ''}
      <button class="btn btn-accent btn-block" style="margin-top:1rem" onclick="foglioTesserato(null,'${sq.id}')"><i class="fa-solid fa-user-plus"></i> Nuovo tesserato</button>
      <p class="hint"><span class="dot bad" style="display:inline-block;width:9px;height:9px"></span> scaduto da pagare ·
        <span class="dot warn" style="display:inline-block;width:9px;height:9px"></span> da pagare più avanti ·
        <span class="dot ok" style="display:inline-block;width:9px;height:9px"></span> in regola</p></div>`);
  if (VISTE.squadra.extra) VISTE.squadra.extra(sq);
} };

function foglioTesserato(id, squadraId) {
  const t = (S.cache.tesserati || []).find((x) => x.id === id) || S.cache.tesserato && S.cache.tesserato.id === id && S.cache.tesserato
    || { squadra_id: squadraId, nome: '', cognome: '', ruolo: '', numero: null, telefono: '', minorenne: false, genitore_nome: '', genitore_telefono: '', dal: oggi(), attivo: true, note: '' };
  const sq = S.cache.squadre || [];
  apriFoglio(`<h3>${id ? 'Modifica tesserato' : 'Nuovo tesserato'}</h3>
    <div class="row"><div class="fg"><label>Nome</label><input id="t-nome" value="${esc(t.nome)}" maxlength="60"></div>
      <div class="fg"><label>Cognome</label><input id="t-cogn" value="${esc(t.cognome)}" maxlength="60"></div></div>
    <div class="row"><div class="fg"><label>Ruolo</label><input id="t-ruolo" value="${esc(t.ruolo)}" maxlength="40"></div>
      <div class="fg" style="max-width:110px"><label>Numero</label><input id="t-num" type="number" min="0" max="999" value="${t.numero == null ? '' : t.numero}"></div></div>
    <div class="fg"><label>Squadra</label><select id="t-sq">${sq.map((x) => `<option value="${x.id}" ${x.id === t.squadra_id ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}</select></div>
    <label class="check"><input type="checkbox" id="t-min" ${t.minorenne ? 'checked' : ''} onchange="$('t-gen').hidden=!this.checked"> Minorenne (i messaggi vanno al genitore)</label>
    <div id="t-gen" ${t.minorenne ? '' : 'hidden'}><div class="row"><div class="fg"><label>Nome del genitore</label><input id="t-gnome" value="${esc(t.genitore_nome)}" maxlength="60"></div>
      <div class="fg"><label>Telefono del genitore</label><input id="t-gtel" type="tel" value="${esc(t.genitore_telefono)}" placeholder="+39 …"></div></div></div>
    <div class="fg"><label>Telefono del tesserato</label><input id="t-tel" type="tel" value="${esc(t.telefono)}" placeholder="+39 …"></div>
    <div class="row"><div class="fg"><label>In squadra dal</label><input id="t-dal" type="date" value="${esc(t.dal || oggi())}"></div></div>
    <div class="fg"><label>Note</label><input id="t-note" value="${esc(t.note)}" maxlength="200"></div>
    ${id ? `<label class="check"><input type="checkbox" id="t-att" ${t.attivo ? '' : 'checked'}> Non è più in squadra (le mensilità future non pagate vengono tolte)</label>` : ''}
    <p class="hint" style="margin-bottom:.8rem">Nessun dato sanitario: niente certificati o note mediche.</p>
    <div class="btns"><button class="btn btn-ghost" onclick="chiudiFoglio()">Annulla</button>
      <button class="btn btn-accent" onclick="salvaTesserato(this,${id ? `'${id}'` : 'null'})">Salva</button></div>`);
}
async function salvaTesserato(btn, id) {
  const v = (k) => $(k).value.trim();
  const minorenne = $('t-min').checked;
  if (!v('t-nome')) return toast('Scrivi il nome', 'danger');
  if (minorenne && !v('t-gtel')) return toast('Per un minorenne serve il telefono del genitore', 'danger');
  const num = v('t-num');
  await azione(btn, async () => {
    const nuovo = await rpc('soc_salva_tesserato', {
      p_societa: S.soc.societa_id, p_id: id, p_squadra: $('t-sq').value, p_nome: v('t-nome'), p_cognome: v('t-cogn'),
      p_ruolo: v('t-ruolo'), p_numero: num === '' ? null : parseInt(num, 10), p_telefono: v('t-tel'),
      p_minorenne: minorenne, p_genitore_nome: minorenne ? v('t-gnome') : null, p_genitore_telefono: minorenne ? v('t-gtel') : null,
      p_dal: v('t-dal') || null, p_attivo: id ? !$('t-att').checked : true, p_note: v('t-note'),
    });
    toast('Tesserato salvato');
    vai('tesserato', { id: nuovo });
  });
}

VISTE.tesserato = { tab: 'squadre', ruoli: ['presidente', 'dirigente'], async render({ id }) {
  const t = (await leggi('soc_tesserati', 'id,squadra_id,nome,cognome,ruolo,numero,telefono,minorenne,genitore_nome,genitore_telefono,player_id,dal,attivo,note',
    (b) => b.eq('id', id)))[0];
  if (!t) return vai('squadre');
  S.cache.tesserato = t;
  const sq = (await squadre()).find((x) => x.id === t.squadra_id) || {};
  const contatto = t.minorenne ? `Genitore: ${esc(t.genitore_nome || '—')} · ${esc(t.genitore_telefono || '—')}` : esc(t.telefono || 'nessun telefono');
  vista(`<button class="back" onclick="vai('squadra',{id:'${t.squadra_id}'})"><i class="fa-solid fa-chevron-left"></i> ${esc(sq.nome || 'Squadra')}</button>
    <h2>${esc(nomeCompleto(t))}${t.numero != null ? ` <span class="muted">#${t.numero}</span>` : ''}</h2>
    <div class="card"><div class="row" style="align-items:center"><div style="flex:1">
      <div>${esc(t.ruolo || '')}${t.minorenne ? ' · <span class="badge warn">minorenne</span>' : ''}${t.attivo ? '' : ' · <span class="badge off">non più in squadra</span>'}${t.player_id ? ' · <span class="badge ok">AiRIM</span>' : ''}</div>
      <div class="muted" style="font-size:.88rem;margin-top:4px">${contatto}</div>
      ${t.note ? `<div class="muted" style="font-size:.85rem;margin-top:4px">${esc(t.note)}</div>` : ''}</div>
      <button class="btn btn-ghost btn-sm" onclick="foglioTesserato('${t.id}')"><i class="fa-solid fa-pen"></i> Modifica</button></div></div>
    <div id="t-extra"></div>`);
  if (VISTE.tesserato.extra) await VISTE.tesserato.extra(t);
} };

avvio();
