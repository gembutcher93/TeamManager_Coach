BLOCCO A — campi ricchi esercizio

Contesto: PWA coach, app.js. Gli esercizi (sia la libreria window.EX_SCHEMES in schemes.js, sia quelli creati dall'utente) sono oggetti con {name, desc, E:[...], A:[...]}. Voglio arricchire la scheda esercizio con piu' campi, senza toccare il disegno.

Regole: NON rompere le funzioni esistenti. Modifiche chirurgiche. `node --check` alla fine. Bumpa APP_VERSION in app.js e CACHE_VERSION in sw.js alla versione successiva (se l'ultima e' v26/v27, sali di uno).

1) Estendi l'oggetto esercizio con nuovi campi opzionali: dur (numero, minuti), focus (testo breve: obiettivo/tema dell'esercizio), intensity (uno tra 'bassa'|'media'|'alta'). Il campo desc (descrizione lunga) esiste gia' sulla libreria: assicurati che sia modificabile e mostrato anche per gli esercizi creati dall'utente.

2) FORM crea/modifica esercizio: aggiungi gli input per dur, focus, intensity (intensity come select o segmented control bassa/media/alta) e una textarea per desc. Layout pulito e ordinato, coerente con lo stile attuale.

3) VISTA DETTAGLIO esercizio: mostra durata, obiettivo, intensita' (usa un badge/colore per l'intensita': verde bassa, giallo media, rosso alta) e la descrizione. Per i 60 esercizi della libreria la desc c'e' gia': mostrala.

4) Retrocompatibilita': gli esercizi esistenti senza i nuovi campi non devono dare errori (campi vuoti/nascosti). Quando un esercizio della libreria viene aggiunto/copiato in una sessione, i campi lo seguono.

Alla fine dimmi cosa hai toccato e conferma i bump di versione.

BLOCCO B — fasi (storyboard) + zone sul campo (dopo aver testato A)

Contesto: PWA coach, app.js. Gli esercizi sono disegni VETTORIALI su campo di riferimento 400x600: E = array di elementi {t:'player'|'opp'|'cone'|'ball', x, y, n}; A = array di frecce {f:[x,y], p:[x,y], d:0|1}. Voglio due aggiunte alla lavagnetta.

Regole: NON rompere il rendering degli esercizi esistenti, inclusi i 60 della libreria window.EX_SCHEMES. Modifiche chirurgiche. `node --check` alla fine. Bumpa APP_VERSION e sw.js CACHE_VERSION alla versione successiva.

1) FASI (storyboard, alternativa vettoriale all'animazione).
   - Estendi l'esercizio con un campo opzionale frames = [ {E:[...], A:[...], cap:"didascalia"} , ... ].
   - RETROCOMPATIBILITA' OBBLIGATORIA: se un esercizio NON ha frames, il renderer deve trattare l'{E,A} di primo livello come UNA fase implicita. I 60 della libreria e tutti gli esercizi esistenti devono continuare a disegnarsi identici, senza modifiche ai loro dati.
   - Editor lavagnetta: bottone "Aggiungi fase" (nuova fase = copia della fase corrente, cosi' l'allenatore parte dalla posa precedente e la modifica), un campo testo per la didascalia di ogni fase, possibilita' di riordinare ed eliminare le fasi. Massimo ~6 fasi.
   - Vista esercizio: uno stepper "Fase 1 / N" con frecce ‹ › (o puntini) per scorrere le fasi; sotto il campo mostra la didascalia della fase corrente. Riusa il renderer esistente per disegnare la fase selezionata.

2) ZONE colorate sul campo.
   - Nuovo tipo di elemento dentro l'array E: {t:'zone', x, y, w, h, c} con coordinate/dimensioni nel riferimento 400x600 e c = colore ('red' | 'yellow' | 'green').
   - Renderer: disegna un rettangolo semitrasparente riempito, SOTTO giocatori, coni e frecce (livello di sfondo).
   - Editor: uno strumento "Zona" per creare un rettangolo, ridimensionarlo/spostarlo, scegliere il colore ed eliminarlo. Le zone si salvano dentro l'esercizio (e nella fase, se ci sono le fasi).

Nota: fasi, zone e campi sono tutti dati semplici -> si salvano in localStorage con l'esercizio ed entrano automaticamente nel backup JSON (niente immagini, niente IndexedDB). NON implementare animazioni vere ne' upload di foto.

Alla fine dimmi cosa hai toccato, conferma che i 60 esercizi libreria si disegnano ancora correttamente, e i bump di versione.


BLOCCO C Fix lavagnetta esercizzi e implemento sync formazione

Contesto: PWA coach. Esiste gia' un pacchetto/export che l'app Player importa via decode() (base64 -> JSON) o file, con dati di squadra/statistiche/voti. Voglio aggiungere al pacchetto la FORMAZIONE CONSIGLIATA (con posizionamento su campo per TUTTI e tre gli sport) e uno switch di privacy, piu' un avviso nella schermata di condivisione della demo.

Regole: NON rompere l'export/import esistente ne' il formato attuale del pacchetto (retrocompatibile: i campi nuovi sono aggiunte, non sostituzioni). Modifiche chirurgiche. `node --check` alla fine. Bumpa APP_VERSION e sw.js CACHE_VERSION alla versione successiva.

1) CALCOLO LINEUP CONSIGLIATA, con posizione su campo per ogni sport (riusa i motori campo SVG gia' presenti in app.js/coach, calcio+pallavolo, aggiungine uno analogo per basket se non esiste):
   - Calcio: modulo/ruoli esistenti -> lista {ruolo, x, y, playerName, number, overall, tier}.
   - Pallavolo: 6 zone di rotazione P1-P6 (P4-P3-P2 avanti, P5-P6-P1 dietro) -> lista {zona:'P1'..'P6', x, y, playerName, number, overall, tier}, assegnando il giocatore piu' quotato per ruolo (palleggiatore, opposto, centrali, schiacciatori, libero) alla zona coerente.
   - Basket: 5 posizioni base (Playmaker/PG, Guardia/SG, Ala piccola/SF, Ala grande/PF, Centro/C) posizionate su un campo semplificato (PG a centrocampo/regia, SG e SF sul perimetro ai lati, PF vicino area lato debole, C sotto canestro) -> lista {ruolo, x, y, playerName, number, overall, tier}.

2) SWITCH PRIVACY. Aggiungi in Impostazioni un toggle "Mostra overall dei compagni nella formazione consigliata" (default ON, modificabile dal coach). Salvalo con le altre impostazioni squadra.

3) INCLUDI NEL PACCHETTO DI SYNC/EXPORT (quello che genera il codice/file per il Player) un nuovo campo opzionale:
   lineup: { sport: 'calcio'|'pallavolo'|'basket', showOverall: true/false (dal punto 2), slots: [ {ruolo_o_zona, playerName, number, overall, tier, x, y} ] }
   x,y sempre presenti per tutti e tre gli sport (coordinate sul campo di riferimento del rispettivo sport). Se showOverall e' false, includi comunque nome/numero/ruolo ma NON l'overall.
   Se non ci sono abbastanza dati/giocatori per calcolare la lineup, ometti il campo (non generare errori).

4) SCHERMATA CONDIVISIONE/EXPORT (quella con codice/QR per il Player), SOLO se DEMO_BUILD===true:
   - Genera anche un QR code del codice condivisione (oltre al testo copiabile gia' presente), usando una libreria leggera lato client.
   - Aggiungi una nota visibile: "La ricezione dei dati nell'app Player (statistiche, card, formazione consigliata) e' disponibile solo con la versione completa. In prova puoi generare il codice/QR di esempio, ma serve l'app Player per riceverlo."

Alla fine dimmi cosa hai toccato, se hai trovato il generatore export/import esistente, se esisteva gia' un motore campo per il basket o l'hai creato, e conferma i bump di versione.