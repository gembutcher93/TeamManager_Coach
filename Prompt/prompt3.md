MODULO D Lineup pallavolo/basket → campo, non riquadri

Contesto: nella sezione formazione consigliata, il CALCIO disegna correttamente il campo con i giocatori posizionati (x,y). PALLAVOLO e BASKET invece mostrano ancora dei riquadri testuali per ruolo (es. "Playmaker: Nome"), NON un campo disegnato. Voglio che pallavolo e basket usino lo stesso approccio a campo del calcio, non i riquadri.
Regole: NON toccare la sezione calcio, che funziona gia' bene: usala come riferimento/modello per come pallavolo e basket devono comportarsi. Modifiche chirurgiche solo alle funzioni di rendering lineup di pallavolo e basket. `node --check` alla fine. Bumpa APP_VERSION e sw.js CACHE_VERSION alla versione successiva.

1) PALLAVOLO: sostituisci i riquadri con un campo disegnato (riusa il motore campo pallavolo gia' presente nell'app, quello usato altrove per esercizi/scout) diviso in 6 zone di rotazione P1-P6 (P4-P3-P2 avanti, P5-P6-P1 dietro). Posiziona il giocatore assegnato a ogni zona con nome/numero (e overall se lo switch privacy e' ON) DENTRO il campo, non in un riquadro separato.
2) BASKET: stesso principio - disegna un campo da basket semplificato e posiziona i 5 ruoli (Playmaker/PG, Guardia/SG, Ala piccola/SF, Ala grande/PF, Centro/C) nelle rispettive zone del campo (PG a centrocampo/regia, SG e SF sul perimetro ai lati, PF vicino area lato debole, C sotto canestro).
3) Se non esiste ancora un motore campo basket nell'app, crealo seguendo lo stesso stile grafico (colori, linee) del campo calcio/pallavolo gia' presenti, cosi' resta coerente visivamente.

Alla fine dimmi cosa hai toccato e se hai dovuto creare da zero il campo basket o riusare qualcosa di esistente.

MODULO E Toolbar laterale — riprova, dicendogli chiaramente che è un cambiamento voluto

Contesto: nella lavagnetta esercizi, la barra comandi (gomma, sposta, giocatore, birillo, salva, elimina, aggiungi fase, ecc.) e' ancora orizzontale in alto. Nel giro precedente ti avevo chiesto di spostarla lateralmente ma non e' stata spostata: probabilmente hai interpretato "non rompere le funzioni esistenti" come "non toccare la posizione della toolbar". Chiarisco: la POSIZIONE della toolbar E' la modifica richiesta, non va lasciata dov'e'. "Non rompere le funzioni esistenti" significa che gomma/sposta/giocatore/birillo/salva/elimina/fasi devono continuare a funzionare esattamente come ora - solo SPOSTATI di posizione, non la loro logica.
Regole: Sposta la posizione della barra, NON la logica dei bottoni. Usa le skill mobile-principles/mobile-design. `node --check` alla fine. Bumpa APP_VERSION e sw.js CACHE_VERSION alla versione successiva.

1) Sposta la barra comandi da ORIZZONTALE-IN-ALTO a VERTICALE-LATERALE, colonna affiancata all'area di disegno (non in overlay sopra il campo).
2) Bottoni con area di tocco comoda (min ~48-56px), icona + etichetta breve.
3) Bottone per spostare la colonna da destra a sinistra e viceversa, salvato in localStorage.
4) L'area di disegno del campo deve adattarsi di conseguenza, senza finire sotto/dietro la colonna.

Prima di dirmi che hai finito, verifica visivamente (o descrivimi) che la barra sia effettivamente laterale e non piu' in alto. Alla fine conferma i bump di versione.

MODULO F QR

Contesto: il QR code nella schermata di condivisione non viene generato perche' il payload (pacchetto sync completo in base64) e' troppo lungo per un QR standard.

Rimuovi il tentativo di generare il QR per ora. Lascia SOLO il codice/testo copiabile che gia' funziona, con il bottone "Copia codice". Mantieni la nota "disponibile solo con l'app Player nella versione completa" gia' presente. Non introdurre compressione o librerie aggiuntive in questo giro.

`node --check` alla fine. Bumpa APP_VERSION e sw.js CACHE_VERSION alla versione successiva.

MODULO G Switch botton

Contesto: in Impostazioni c'e' un checkbox standard "Mostra overall dei compagni nella formazione consigliata" (e altri toggle simili se presenti). Voglio sostituire lo stile checkbox con un TOGGLE SWITCH in stile iOS/iPadOS.

Regole: cambia SOLO lo stile visivo del controllo, NON la logica (stesso valore salvato, stesso comportamento, stesso localStorage/impostazione). `node --check` alla fine. Bumpa APP_VERSION e sw.js CACHE_VERSION alla versione successiva.

1) Crea un componente toggle switch riutilizzabile in stile iOS: pillola orizzontale arrotondata, pallino bianco che scorre da sinistra a destra, sfondo grigio/spento quando OFF, sfondo verde quando ON (verde di sistema iOS #34C759 o simile). Transizione animata morbida (slide + cambio colore) al click/tap.
2) Sostituisci con questo componente il checkbox "Mostra overall dei compagni" in Impostazioni.
3) Se nell'app ci sono altri checkbox/toggle di impostazione simili (non le checkbox di selezione multipla tipo liste), sostituisci anche quelli con lo stesso componente per coerenza visiva - ma NON toccare i controlli di selezione/spunta usati per altri scopi (es. selezione multipla in liste).
4) Area di tocco comoda (min ~44px), leggibile sia su tablet che schermi piu' piccoli.

Alla fine dimmi quali toggle hai convertito e conferma i bump di versione.