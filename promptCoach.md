Contesto generale: app Coach. Lavora sulle 3 parti seguenti IN ORDINE, all'interno di questa stessa sessione (non trattarle come consegne separate).

===== PARTE 1 — Animazione apertura anche sul Coach =====
L'animazione di apertura completa (linee campo sport-aware che si tracciano, fallback rettangolo+linea centrale se sport non determinato, zoom verso il centro, pulsazione, esplosione, logo, audio sintetizzato via Web Audio API) è già implementata e funzionante sull'app Player. Sul Coach è rimasta una versione minima (solo logo che appare).
Applica ESATTAMENTE la stessa sequenza già scritta per il Player anche sul Coach: stessa logica, stesse regole (non bloccante, saltabile con un tap, una volta per sessione, solo SVG/Canvas leggero, audio come bonus mai requisito). Riusa il codice del Player come riferimento diretto, non reinventarlo.

===== PARTE 2 — Scout Basket: fix punti + interfaccia a tocco =====
Nello Scout Gara Basket, il campo "PT" (punti totali) è oggi inserito manualmente e SCOLLEGATO dai canestri segnati, causando disallineamenti reali (es. un giocatore con PT=20 mentre i canestri fatti sommano a 13).

1) Rimuovi PT come input manuale. Calcolalo automaticamente = (2 punti fatti × 2) + (3 punti fatti × 3) + (liberi fatti × 1). Mostralo come valore calcolato, non modificabile.
2) Sostituisci l'interfaccia a tabella con stepper con lo stesso pattern a tocco già usato nello Scout Pallavolo (selezione giocatore, poi categoria azione, poi tocco su bottoni di esito), con questa tassonomia:
   - "Tiro da 2", "Tiro da 3", "Tiro libero": due bottoni "Fatto"/"Sbagliato" (aggiorna automaticamente fatti E tentati).
   - "Rimbalzo": due bottoni "Offensivo"/"Difensivo".
   - "Assist", "Palla rubata", "Palla persa", "Stoppata", "Fallo": un tocco singolo che incrementa il contatore.
   - Mantieni "Annulla ultimo" come nel pallavolo.
3) Il minutaggio (MIN) resta un campo separato semplice.
4) Aggiorna la formula voto se necessario per coerenza col PT auto-calcolato.
Non toccare lo Scout Pallavolo (è il riferimento, resta invariato).

===== PARTE 3 — Scout Calcio: azioni equilibrate per ruolo + interfaccia a tocco (in un solo passaggio) =====
Lo Scout Calcio oggi registra quasi solo eventi legati al gol (Gol, Assist, Tiri, Parate per il portiere) e per gli altri ruoli SOLO eventi negativi (Falli, Ammonizioni, Espulsioni). Questo penalizza sistematicamente difensori e portieri: non hanno modo di ottenere un contributo POSITIVO al voto anche giocando una partita perfetta.

Costruisci l'interfaccia a tocco (stesso pattern del pallavolo: selezione giocatore, poi categoria azione, poi tocco su bottoni di esito, con "Annulla ultimo") usando GIA' da subito questa tassonomia completa ed equilibrata (non fare prima l'interfaccia e poi aggiungere azioni: usa direttamente questa lista):

Per tutti i giocatori di movimento:
- Positive: "Gol", "Assist", "Tiro in porta" (ci prova, anche senza segnare), "Dribbling riuscito", "Contrasto vinto" (recupero in un duello), "Intercetto" (anticipo/lettura difensiva), "Chiusura efficace" (diagonale/copertura che sventa un pericolo).
- Negative: "Fallo", "Ammonizione", "Espulsione", "Palla persa".

Per il portiere, in aggiunta:
- Positive: "Parata", "Uscita vinta" (bassa o alta), "Respinta" (blocca un tiro insidioso).
- Negative: "Gol subito", "Fallo", "Ammonizione", "Espulsione".

Aggiorna la formula del voto/overall per dare un peso positivo equilibrato a tutte queste azioni (un difensore/portiere con una buona partita fatta di sole azioni difensive deve poter raggiungere un voto pari o superiore a un giocatore mediocre senza contributi né positivi né negativi - non sbilanciare tutto su gol/assist).

Il minutaggio (MIN) resta campo separato semplice. Non toccare Scout Pallavolo né le modifiche fatte al Basket nella Parte 2.

===== FINE =====
Per ciascuna parte: `node --check` e bump di APP_VERSION/CACHE_VERSION (un bump unico alla fine di tutte e 3 le parti, non tre bump separati). Alla fine dimmi, per ciascuna parte: cosa hai fatto, come hai calibrato il peso delle nuove azioni calcio nel voto, e conferma il bump di versione.




========== MODULO Q — Backup reminder giornaliero (Coach + Player) ==========
Contesto: entrambe le app sono offline-first, i dati vivono solo sul dispositivo. Serve un promemoria periodico che ricordi di fare il backup, sul modello di un pattern già usato in un'altra mia app (InkConsent): un modale non invasivo che appare una volta al giorno.

1) All'apertura dell'app (dopo il caricamento normale, non durante l'animazione di intro), controlla se è già passato un giorno dall'ultima volta che questo promemoria è stato mostrato (localStorage, es. lastBackupReminder).
2) Se sì, mostra un modale leggero (non bloccante, chiudibile): "Ricordati di fare il backup — se cancelli i dati del telefono o disinstalli l'app, perderai tutto ciò che non hai salvato." Due bottoni: "Fai backup ora" (porta direttamente alla funzione di esporta/backup già esistente) e "Non oggi" (chiude e aggiorna il timestamp, non ricompare fino al giorno dopo).
3) Applica su ENTRAMBE le app (Coach: backup dati squadra; Player: backup profilo/mental gym/check-in se esiste già un export, altrimenti verifica cosa esporta oggi il player e usa quello).

`node --check`, bump versione su entrambe le app.

========== MODULO R — Aggiornare i tutorial esistenti (Coach) ==========
Contesto: il tutorial iniziale del Coach (creazione squadra/sport, giocatori, allenamenti, scout, card) non menziona: l'invio dati al Player (formazione/statistiche), e non enfatizza abbastanza la natura offline dell'app.

Aggiungi 1-2 schermate al tutorial esistente (stesso stile/flusso, non ricrearlo):
1) Una schermata che spiega come condividere i dati con l'app Player (dove si trova la funzione, cosa riceve il giocatore: card, formazione, possibilità di rimandare le sue statistiche mentali).
2) Una schermata che spiega chiaramente: "L'app funziona offline, tutti i dati restano sul tuo dispositivo. Fai backup regolari da Impostazioni per non perdere nulla."

Non toccare le schermate già esistenti né la logica di completamento tutorial. `node --check`, bump versione.

========== MODULO S — Tooltip contestuali su 4 schermate chiave (Coach) ==========
Contesto: voglio un tutorial contestuale (tooltip/callout che indicano 2-3 elementi chiave di una schermata con breve spiegazione) SOLO su queste 4 schermate, non su tutta l'app: Scout Gara, Formazione consigliata, Calendario, Impostazioni/Backup.

1) Alla PRIMA visita di ciascuna di queste schermate (traccia con localStorage, es. tut_seen_scout, tut_seen_formazione, ecc.), mostra un breve overlay che evidenzia 2-3 elementi principali della schermata con un fumetto/tooltip esplicativo (es. su Scout Gara: "Seleziona il giocatore, poi l'azione, poi il tocco per registrare l'evento"), scorrimento tra i 2-3 punti con "Avanti"/"Salta".
2) Dopo la prima visita, non deve ripresentarsi automaticamente. Aggiungi pero' un piccolo bottone "?" (icona aiuto) in ciascuna delle 4 schermate che permette di rivedere il tooltip manualmente in qualsiasi momento.
3) Stile coerente con l'estetica esistente dell'app, leggero (no librerie pesanti).

Applica SOLO a queste 4 schermate in questo giro. Non toccare altre sezioni dell'app. `node --check`, bump versione.

Alla fine di ogni modulo dimmi cosa hai implementato e conferma i bump di versione.