-- =========================================================
-- AiRIM TeamManager — schema Supabase (sync online Coach <-> Player)
-- Incolla TUTTO questo file nell'SQL Editor di Supabase (progetto
-- AiRIM_TeamManager) ed esegui una sola volta.
--
-- Sicurezza: RLS abilitata su tutte le tabelle, SENZA policy dirette
-- per il ruolo anon (quindi nessun SELECT/INSERT/UPDATE diretto sulle
-- tabelle e' possibile con la anon key). Ogni accesso passa da una
-- funzione RPC "security definer" qui sotto, che applica sempre un
-- filtro esplicito (team_code esatto, team_id+pin combinati, ecc.):
-- cosi' un lookup mirato e' possibile ma un listing completo no,
-- anche per chi usa direttamente la anon key fuori dall'app.
-- =========================================================

create extension if not exists pgcrypto;

-- ---------- tabelle ----------
create table if not exists clubs (
  id uuid primary key default gen_random_uuid(),
  club_name text,
  created_at timestamptz default now()
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references clubs(id),
  team_code text unique not null,
  team_name text,
  sport text,
  owner_user_id uuid references auth.users(id) unique, -- Task 4 (Prompt16): coach loggato = 1 squadra sua sempre riconosciuta
  created_at timestamptz default now()
);
-- migrazione soft per DB gia' esistenti (se la tabella era gia' stata creata senza la colonna):
alter table teams add column if not exists owner_user_id uuid references auth.users(id) unique;

create table if not exists player_packages (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) not null,
  player_id text not null,
  player_name text,
  pin text not null,
  package jsonb not null,
  updated_at timestamptz default now(),
  unique(team_id, player_id)
);

create table if not exists player_reports (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) not null,
  player_id text not null,
  report jsonb not null,
  created_at timestamptz default now()
);

create table if not exists licenses (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references clubs(id),
  team_id uuid references teams(id) unique,
  status text not null default 'active',
  expires_at timestamptz not null,
  last_check_at timestamptz default now(),
  activated_at timestamptz -- Task (Prompt18): valorizzato una sola volta, alla PRIMA volta che status diventa 'active' (trigger sotto), e mai piu' azzerato: distingue "mai stata attiva" (blocco totale) da "attiva in passato, ora scaduta" (sola lettura)
);
alter table licenses add column if not exists activated_at timestamptz;

-- Task (Prompt18): stampa activated_at automaticamente al primo status='active',
-- sia in insert che in update manuale da Table Editor — nessuna scrittura extra
-- richiesta a chi gestisce le licenze a mano.
create or replace function licenses_set_activated_at()
returns trigger
language plpgsql as $$
begin
  if new.status = 'active' and new.activated_at is null then
    new.activated_at := now();
  end if;
  return new;
end; $$;
drop trigger if exists trg_licenses_set_activated_at on licenses;
create trigger trg_licenses_set_activated_at
  before insert or update on licenses
  for each row execute function licenses_set_activated_at();

-- Task 2 (Prompt17): log di accettazione clickwrap della privacy policy. Una
-- riga per ogni accettazione (nuova riga ad ogni bump di policy_version, mai
-- update): policy_hash e' lo SHA-256 del testo ESATTO mostrato in quel momento,
-- cosi' resta verificabile quale versione e' stata davvero accettata anche se
-- il testo visualizzato oggi e' nel frattempo cambiato.
create table if not exists policy_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  policy_version text not null,
  policy_hash text not null,
  accepted_at timestamptz default now()
);

-- ---------- RLS: abilitata, nessuna policy diretta per anon ----------
alter table clubs enable row level security;
alter table teams enable row level security;
alter table player_packages enable row level security;
alter table player_reports enable row level security;
alter table licenses enable row level security;
alter table policy_acceptances enable row level security;

-- =========================================================
-- RPC — teams
-- =========================================================

-- Crea la squadra al primo sync (o aggiorna nome/sport se gia' esiste per quel
-- team_code). Nessun listing possibile: l'unico modo per "trovare" una riga e'
-- conoscerne gia' il team_code esatto generato lato coach.
create or replace function upsert_team(p_team_code text, p_team_name text, p_sport text)
returns table(id uuid, team_code text)
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select teams.id into v_id from teams where teams.team_code = p_team_code;
  if v_id is null then
    insert into teams(team_code, team_name, sport) values (p_team_code, p_team_name, p_sport)
      returning teams.id into v_id;
  else
    update teams set team_name = p_team_name, sport = p_sport where teams.id = v_id;
  end if;
  return query select v_id, p_team_code;
end; $$;
grant execute on function upsert_team(text, text, text) to anon, authenticated;

-- Task 4 (Prompt16): coach autenticato (email+password via Supabase Auth) -> UNA
-- squadra sola, sempre trovabile tramite owner_user_id (auth.uid()), invece che
-- tramite un team_code random che si perde a ogni reinstall/backup scollegato
-- (causa delle righe orfane duplicate del Task 3). Percorso:
--   1) esiste gia' una squadra con owner_user_id = auth.uid()? -> quella, sempre
--   2) altrimenti, se il device passa un team_code locale pre-esistente e libero
--      (creato prima del login, owner_user_id ancora null) -> lo reclama (claim)
--   3) altrimenti ne crea una nuova, gia' collegata all'utente
create or replace function upsert_my_team(p_team_name text, p_sport text, p_claim_team_code text default null)
returns table(id uuid, team_code text)
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_code text; v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select teams.id, teams.team_code into v_id, v_code from teams where teams.owner_user_id = v_uid;
  if v_id is not null then
    update teams set team_name = coalesce(p_team_name, team_name), sport = coalesce(p_sport, sport)
      where teams.id = v_id;
    return query select v_id, v_code;
  end if;

  if p_claim_team_code is not null then
    select teams.id, teams.team_code into v_id, v_code from teams
      where teams.team_code = p_claim_team_code and teams.owner_user_id is null;
    if v_id is not null then
      update teams set owner_user_id = v_uid, team_name = coalesce(p_team_name, team_name), sport = coalesce(p_sport, sport)
        where teams.id = v_id;
      return query select v_id, v_code;
    end if;
  end if;

  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    begin
      insert into teams(team_code, team_name, sport, owner_user_id) values (v_code, p_team_name, p_sport, v_uid)
        returning teams.id into v_id;
      exit;
    exception when unique_violation then
      -- team_code gia' in uso: rigenera e riprova
    end;
  end loop;
  return query select v_id, v_code;
end; $$;
grant execute on function upsert_my_team(text, text, text) to authenticated;

-- =========================================================
-- RPC — player_packages
-- =========================================================

-- Scrittura solo lato coach: serve il team_id (noto solo a chi gestisce la
-- squadra sul proprio dispositivo, mai esposto al giocatore).
create or replace function upsert_player_package(p_team_id uuid, p_player_id text, p_player_name text, p_pin text, p_package jsonb)
returns void
language sql security definer set search_path = public as $$
  insert into player_packages(team_id, player_id, player_name, pin, package, updated_at)
  values (p_team_id, p_player_id, p_player_name, p_pin, p_package, now())
  on conflict (team_id, player_id) do update set
    player_name = excluded.player_name,
    pin = excluded.pin,
    package = excluded.package,
    updated_at = now();
$$;
grant execute on function upsert_player_package(uuid, text, text, text, jsonb) to anon, authenticated;

-- Lettura filtrata su team_code + pin combinati (il giocatore non conosce mai
-- il team_id, solo il codice squadra che gli passa il coach + il proprio PIN).
create or replace function get_player_package(p_team_code text, p_pin text)
returns table(team_id uuid, player_id text, player_name text, package jsonb, updated_at timestamptz)
language sql security definer set search_path = public as $$
  select pp.team_id, pp.player_id, pp.player_name, pp.package, pp.updated_at
  from player_packages pp
  join teams t on t.id = pp.team_id
  where t.team_code = p_team_code and pp.pin = p_pin;
$$;
grant execute on function get_player_package(text, text) to anon;

-- Elenco PIN della squadra per il coach (vista "PIN squadra" in Impostazioni):
-- serve solo il team_id, mai un listing cross-squadra.
create or replace function list_team_pins(p_team_id uuid)
returns table(player_id text, player_name text, pin text, updated_at timestamptz)
language sql security definer set search_path = public as $$
  select player_id, player_name, pin, updated_at from player_packages
  where team_id = p_team_id order by player_name;
$$;
grant execute on function list_team_pins(uuid) to anon, authenticated;

-- =========================================================
-- RPC — player_reports
-- =========================================================

-- Scrittura dal player: filtrata su team_id+player_id, entrambi noti solo
-- perche' arrivati dentro il pacchetto ricevuto dal coach.
create or replace function submit_player_report(p_team_id uuid, p_player_id text, p_report jsonb)
returns void
language sql security definer set search_path = public as $$
  insert into player_reports(team_id, player_id, report) values (p_team_id, p_player_id, p_report);
$$;
grant execute on function submit_player_report(uuid, text, jsonb) to anon;

-- Lettura dal coach: tutti i referti della propria squadra (serve solo team_id).
create or replace function list_player_reports(p_team_id uuid)
returns table(id uuid, player_id text, report jsonb, created_at timestamptz)
language sql security definer set search_path = public as $$
  select id, player_id, report, created_at from player_reports
  where team_id = p_team_id order by created_at desc;
$$;
grant execute on function list_player_reports(uuid) to anon, authenticated;

-- =========================================================
-- RPC — licenses (sola lettura pubblica filtrata, nessuna scrittura da client)
-- =========================================================

-- team_id ha priorita' se valorizzato; altrimenti si guarda la licenza di club
-- (condivisa fra tutte le squadre della stessa societa').
create or replace function get_license_status(p_team_id uuid, p_club_id uuid)
returns table(status text, expires_at timestamptz, activated_at timestamptz)
language sql security definer set search_path = public as $$
  select status, expires_at, activated_at from licenses
  where (p_team_id is not null and team_id = p_team_id)
     or (p_club_id is not null and club_id = p_club_id)
  order by (team_id = p_team_id) desc
  limit 1;
$$;
grant execute on function get_license_status(uuid, uuid) to anon, authenticated;

-- =========================================================
-- RPC — policy_acceptances (Task 2/4, Prompt17)
-- Solo per utenti autenticati: la riga richiede sempre un user_id reale
-- (auth.uid()), niente clickwrap anonimo. Ogni riga e' una prova storica,
-- mai aggiornata: un nuovo accesso dopo un bump di policy_version inserisce
-- una nuova riga invece di sovrascrivere quella precedente.
-- =========================================================

create or replace function record_policy_acceptance(p_policy_version text, p_policy_hash text)
returns void
language sql security definer set search_path = public as $$
  insert into policy_acceptances(user_id, policy_version, policy_hash)
  values (auth.uid(), p_policy_version, p_policy_hash);
$$;
grant execute on function record_policy_acceptance(text, text) to authenticated;

-- Ultima accettazione dell'utente corrente (per il gate versione e per la
-- vista "Termini accettati" in Impostazioni, Task 3).
create or replace function get_my_policy_acceptance()
returns table(policy_version text, policy_hash text, accepted_at timestamptz)
language sql security definer set search_path = public as $$
  select policy_version, policy_hash, accepted_at from policy_acceptances
  where user_id = auth.uid() order by accepted_at desc limit 1;
$$;
grant execute on function get_my_policy_acceptance() to authenticated;

-- =========================================================
-- RPC — clubs (sola lettura pubblica filtrata per id noto)
-- =========================================================

create or replace function get_club(p_id uuid)
returns table(id uuid, club_name text)
language sql security definer set search_path = public as $$
  select id, club_name from clubs where id = p_id;
$$;
grant execute on function get_club(uuid) to anon;

-- =========================================================
-- Nota per l'aggiornamento manuale delle licenze (nessuna scrittura da client):
-- inserire/aggiornare le righe di `licenses` a mano dal Table Editor di Supabase
-- dopo un pagamento, es.:
--   insert into licenses(team_id, status, expires_at)
--   values ('<team-id>', 'active', now() + interval '1 year');
-- NB: da quando il team e' collegato a owner_user_id (Task 4), il team_id resta
-- stabile nel tempo per un dato coach loggato: non serve piu' ri-collegare la
-- licenza a un nuovo team_id dopo un reinstall/backup (era la causa del Task 2).
-- =========================================================

-- =========================================================
-- Setup richiesto una tantum su Authentication > Providers (dashboard Supabase):
-- abilitare "Email" e disattivare "Confirm email" (il coach deve poter usare
-- l'account da subito, senza dover cliccare un link di conferma via mail).
-- =========================================================

-- =========================================================
-- Task 2 (Prompt16) — pulizia righe `teams` duplicate create durante i test.
-- Il blocco riscontrato cancellando una riga a mano dal Table Editor e' un
-- vincolo di foreign key: player_packages.team_id, player_reports.team_id e
-- licenses.team_id puntano a teams(id) SENZA "on delete cascade" (di default
-- Postgres blocca il delete finche' esistono righe figlie collegate).
-- =========================================================

-- 1) Aggiunge on delete cascade alle 3 foreign key, cosi' d'ora in poi si puo'
--    cancellare una riga teams direttamente, senza dover ripulire prima le
--    tabelle figlie a mano. Sicuro da rilanciare piu' volte.
--    (i nomi sotto sono quelli generati di default da Postgres per una FK
--    dichiarata come "references teams(id)" senza CONSTRAINT esplicito; se il
--    tuo progetto li ha rinominati, aggiorna i nomi qui sotto di conseguenza)
alter table player_packages drop constraint if exists player_packages_team_id_fkey;
alter table player_packages add constraint player_packages_team_id_fkey
  foreign key (team_id) references teams(id) on delete cascade;

alter table player_reports drop constraint if exists player_reports_team_id_fkey;
alter table player_reports add constraint player_reports_team_id_fkey
  foreign key (team_id) references teams(id) on delete cascade;

alter table licenses drop constraint if exists licenses_team_id_fkey;
alter table licenses add constraint licenses_team_id_fkey
  foreign key (team_id) references teams(id) on delete cascade;

-- 2) Diagnostica: elenca ogni squadra con quante righe collegate ha, chi la
--    possiede (owner_user_id, null = mai reclamata da un login) e quando e'
--    stata creata — usalo per capire a occhio quali righe sono i tuoi test e
--    quale e' invece la squadra "vera" da tenere.
select t.id, t.team_code, t.team_name, t.owner_user_id, t.created_at,
       (select count(*) from player_packages pp where pp.team_id = t.id) as n_players,
       (select count(*) from player_reports pr where pr.team_id = t.id) as n_reports,
       exists(select 1 from licenses l where l.team_id = t.id) as has_license
from teams t
order by t.created_at desc;

-- 3) Cancellazione di una riga duplicata (dopo aver identificato con la query
--    sopra quale team_id NON tenere): grazie al cascade del punto 1 elimina in
--    automatico anche i suoi player_packages / player_reports / licenses.
--    Sostituisci l'uuid con quello della riga di test da buttare:
--   delete from teams where id = '<team-id-da-eliminare>';

-- 4) Se invece vuoi UNIFICARE due righe (tenere la "buona" ma portarle dentro
--    i dati/licenza che erano finiti sull'altra per errore) invece di
--    cancellare, sposta prima le righe figlie sul team_id da tenere e poi
--    cancella il duplicato ormai vuoto:
--   delete from player_packages where team_id = '<team-id-duplicato>' -- evita di violare unique(team_id,player_id)
--     and player_id in (select player_id from player_packages where team_id = '<team-id-da-tenere>');
--   update player_packages set team_id = '<team-id-da-tenere>' where team_id = '<team-id-duplicato>';
--   update player_reports set team_id = '<team-id-da-tenere>' where team_id = '<team-id-duplicato>';
--   update licenses set team_id = '<team-id-da-tenere>' where team_id = '<team-id-duplicato>'
--     and not exists (select 1 from licenses where team_id = '<team-id-da-tenere>');
--   delete from teams where id = '<team-id-duplicato>';
-- =========================================================
