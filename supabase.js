/* =========================================================
   AiRIM TeamManager — SUPABASE (Coach)
   Layer separato, stesso principio di aggancio di polisport.js:
   si carica DOPO app.js e si limita al trasporto dati verso Supabase
   (client init, letture/scritture pacchetti, PIN, licenza). Nessuna
   logica di calcolo/business qui dentro: quella resta in app.js, che
   chiama le funzioni esposte da window.AiRIMSync.
      <script src="app.js"></script>
      <script src="supabase.js"></script>
   ========================================================= */
(function () {
  'use strict';

  const SUPABASE_URL = 'https://dvyrfoaeqtcdvgxnkswu.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_tghtDcorJoNBRd95gOkqYQ_R6pbASbm';

  let _clientPromise = null;
  /* Client caricato on-demand via CDN (stesso pattern di loadJsPDF in app.js):
     nessun peso extra finché nessuna funzione di sync viene davvero usata. */
  function getClient() {
    if (_clientPromise) return _clientPromise;
    _clientPromise = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')
      .then(m => m.createClient(SUPABASE_URL, SUPABASE_ANON_KEY));
    return _clientPromise;
  }

  /* ---- teams: crea/aggiorna la squadra per il suo team_code ---- */
  async function upsertTeam(teamCode, teamName, sport) {
    const sb = await getClient();
    const { data, error } = await sb.rpc('upsert_team', {
      p_team_code: teamCode, p_team_name: teamName || null, p_sport: sport || null
    });
    if (error) throw error;
    return (data && data[0]) || null; // {id, team_code}
  }

  /* ---- Task 4: login coach (Supabase Auth) — una squadra sola per account,
     niente piu' righe orfane duplicate da reinstall/backup scollegati ---- */
  async function signUp(email, password) {
    const sb = await getClient();
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) throw error;
    // Se "Confirm email" e' attivo sul progetto Supabase, qui data.session e'
    // null finche' l'utente non conferma via link mail: il chiamante deve
    // saperlo per NON proseguire come se fosse gia' loggato (vedi Task 3/4:
    // altrimenti si ricade silenziosamente sul flusso anonimo pre-auth).
    return { user: data && data.user, session: data && data.session };
  }
  async function signIn(email, password) {
    const sb = await getClient();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data && data.user;
  }
  async function signOut() {
    const sb = await getClient();
    const { error } = await sb.auth.signOut();
    if (error) throw error;
  }
  async function getSession() {
    const sb = await getClient();
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;
    return (data && data.session) || null;
  }

  /* ---- teams: squadra dell'utente autenticato (crea/reclama/aggiorna) ---- */
  async function upsertMyTeam(teamName, sport, claimTeamCode) {
    const sb = await getClient();
    const { data, error } = await sb.rpc('upsert_my_team', {
      p_team_name: teamName || null, p_sport: sport || null, p_claim_team_code: claimTeamCode || null
    });
    if (error) throw error;
    return (data && data[0]) || null; // {id, team_code}
  }

  /* ---- player_packages: scrittura (coach) ---- */
  async function upsertPlayerPackage(teamId, playerId, playerName, pin, pkg) {
    const sb = await getClient();
    const { error } = await sb.rpc('upsert_player_package', {
      p_team_id: teamId, p_player_id: String(playerId), p_player_name: playerName || null,
      p_pin: String(pin), p_package: pkg
    });
    if (error) throw error;
    return true;
  }

  /* ---- player_packages: lettura (player, via team_code+pin) ---- */
  async function getPlayerPackage(teamCode, pin) {
    const sb = await getClient();
    const { data, error } = await sb.rpc('get_player_package', { p_team_code: teamCode, p_pin: String(pin) });
    if (error) throw error;
    return (data && data[0]) || null; // {team_id, player_id, player_name, package, updated_at}
  }

  /* ---- vista "PIN squadra" per il coach ---- */
  async function listTeamPins(teamId) {
    const sb = await getClient();
    const { data, error } = await sb.rpc('list_team_pins', { p_team_id: teamId });
    if (error) throw error;
    return data || [];
  }

  /* ---- referti inviati dal player (letti dal coach) ---- */
  async function listPlayerReports(teamId) {
    const sb = await getClient();
    const { data, error } = await sb.rpc('list_player_reports', { p_team_id: teamId });
    if (error) throw error;
    return data || [];
  }

  /* ---- licenza: sola lettura, nessuna scrittura da client ---- */
  async function getLicenseStatus(teamId, clubId) {
    const sb = await getClient();
    const { data, error } = await sb.rpc('get_license_status', { p_team_id: teamId || null, p_club_id: clubId || null });
    if (error) throw error;
    return (data && data[0]) || null; // {status, expires_at, activated_at}
  }

  /* ---- Task 2/3 (Prompt17): log clickwrap privacy policy — solo per utenti
     autenticati, una riga per ogni accettazione (mai sovrascritta) ---- */
  async function recordPolicyAcceptance(policyVersion, policyHash) {
    const sb = await getClient();
    const { error } = await sb.rpc('record_policy_acceptance', { p_policy_version: policyVersion, p_policy_hash: policyHash });
    if (error) throw error;
  }
  async function getMyPolicyAcceptance() {
    const sb = await getClient();
    const { data, error } = await sb.rpc('get_my_policy_acceptance');
    if (error) throw error;
    return (data && data[0]) || null; // {policy_version, policy_hash, accepted_at}
  }

  window.AiRIMSync = { getClient, upsertTeam, upsertPlayerPackage, getPlayerPackage, listTeamPins, listPlayerReports, getLicenseStatus,
    signUp, signIn, signOut, getSession, upsertMyTeam, recordPolicyAcceptance, getMyPolicyAcceptance };
})();
