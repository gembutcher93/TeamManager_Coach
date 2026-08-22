Contesto: PWA coach (pallavolo/calcio/basket, vanilla JS; dati in localStorage via dbKey()/loadDB()/save(); foto e loghi in IndexedDB 'pm-media'; esistono gia' multi-squadra/PIN, card a tier, officina card, scout, calendario, formazioni). Ora il codice parte in modalita' demo perche' e' stata salvata la versione demo: riporta la build principale a "completa" mettendo tutta la logica demo dietro un interruttore, e aggiungi tutorial + attivazione prova + schermata di scadenza con backup e acquisto.

Regole:
- NON rompere le funzioni esistenti. Modifiche chirurgiche.
- Per l'estetica usa le skill: ui-ux-pro-max, frontend-design, mobile-principles/mobile-design. Applica il polish SOLO alle schermate NUOVE (tutorial, scadenza, Impostazioni) + una passata di coerenza su spaziature e target touch (si usa su iPad a bordo campo). NON ridisegnare ne' ristrutturare cio' che gia' funziona. NIENTE Three.js/3D, niente Figma.
- Alla fine `node --check` sui JS modificati. Bumpa APP_VERSION in app.js e CACHE_VERSION in sw.js a volleyteam-v26.

1) INTERRUTTORE + CONFIG. In cima ad app.js, blocco visibile:
   const DEMO_BUILD = false;                 // false = completa; true sul deploy demo
   const DEMO_DAYS = 20;
   const DEMO_HARD_DEADLINE = '2026-12-31';  // oltre questa data la demo e' morta per tutti, comunque
   const CARD_STUDIO_ENABLED = false;        // officina card nascosta (si riattiva con true)
   const CONTACT_INFO = '[tuo contatto qui]';// mostrato nella schermata di scadenza
   const STRIPE_MONTHLY_URL = '';            // lasciare vuoto per ora (nessun bottone); si incolla dopo
   const STRIPE_ANNUAL_URL  = '';            // idem
   Tutta la logica demo si attiva SOLO se DEMO_BUILD===true.

2) STATO PROVA (solo DEMO_BUILD). localStorage globale vt_demo_start (ISO). demoDaysLeft() = DEMO_DAYS meno i giorni interi trascorsi. demoExpired() = daysLeft<=0 OPPURE oggi > DEMO_HARD_DEADLINE (il hard deadline vince sempre e non dipende dallo storage). activateDemo(): salva vt_demo_start se assente.

3) TUTORIAL (ENTRAMBE le build). Al primo avvio (nessun dato squadra e flag vt_tutorial_done assente): schermate con Avanti/Salta, linguaggio da allenatore — crea/nomina squadra + sport -> aggiungi giocatori -> pianifica allenamenti (anche ricorrenti) -> in partita usa lo scout per i voti -> guarda le card. Riapribile da Impostazioni ("Rivedi tutorial"). Setta vt_tutorial_done alla fine.
   SOLO DEMO_BUILD, ultime schermate: (a) "20 giorni per provarla con la tua squadra vera. Alla scadenza scarichi un backup dei DATI; le foto restano sul telefono e le ricarichi nella versione completa." (b) "L'app dei giocatori (statistiche in tempo reale, card personali) e' inclusa solo con l'acquisto: in prova usi solo la parte coach." (c) bottone "Attiva versione di prova" -> activateDemo().

4) COUNTDOWN (solo DEMO_BUILD). Etichetta discreta sempre visibile: "Prova - N giorni rimasti".

5) SCADENZA (solo DEMO_BUILD). Se demoExpired(): schermata bloccante non chiudibile, presentata come "Impostazioni" (titolo Impostazioni, non solo "scaduto"), che:
   - disabilita tutti gli inserimenti/modifiche;
   - mostra bene "Scarica backup dati" (funziona anche da scaduta);
   - mostra SEMPRE un blocco "Per acquistare la versione completa contatta: " + CONTACT_INFO;
   - mostra i bottoni "Abbonamento mensile" / "Abbonamento annuale - risparmi" SOLO se le rispettive STRIPE_*_URL non sono vuote (aprono l'URL); se vuote, non mostrare i bottoni;
   - testo: "Prova terminata. Scarica i tuoi dati; ti invieremo la versione completa dove importare il backup."

6) BACKUP (ENTRAMBE, dentro la sezione "Impostazioni"). ESPORTA: intero DB della squadra attiva (dbKey()/loadDB()) -> JSON scaricabile (backup-<squadra>-<data>.json), SENZA foto/loghi IndexedDB; nota UI "salva i dati, non le foto". RIPRISTINA (nella build completa): legge il JSON, scrive in localStorage sotto dbKey(), ricarica. Export e import DEVONO usare lo stesso schema. Riusa un eventuale export gia' esistente invece di duplicarlo.

7) CARD LAYOUT UFFICIALI. Nella repo c'e' un file JSON chiamato impostazioni card.json con i layout card esportati dall'officina. Carica il suo contenuto in const DEPLOY_CARD_LAYOUTS (il blocco vuoto in cima alla sezione card) cosi' tutti vedono le card come impostate da Gem. Cerca il .json dei layout nella cartella; se non lo trovi, segnalalo.

8) OFFICINA CARD OFF. Con CARD_STUDIO_ENABLED===false nascondi l'ingresso all'officina (bottone/voce) MA lascia il codice intatto. Si riattiva mettendo true.

9) RENAME APP -> "AIRIM". Cambia il nome visibile dove serve: title in index.html, name/short_name in manifest.json, eventuali stringhe del vecchio nome "Coaching Manager" nell'UI, label APP_VERSION. Il logo in icons/ e' gia' quello giusto, non toccarlo.

Alla fine dimmi: cosa hai toccato, se hai trovato il JSON dei layout, e conferma i bump di versione.