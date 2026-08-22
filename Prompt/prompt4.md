MODULO H

Contesto: nell'app coach esistono 3 punti dove viene disegnato un campo da basket: (1) la Lavagnetta Tattica (sezione Spogliatoio) - questo e' CORRETTO, proporzioni giuste; (2) la sezione Esercizi/allenamenti; (3) la Formazione Consigliata - questi due sono STORPIATI (proporzioni/viewBox sbagliati, il campo appare schiacciato o allungato in modo scorretto).

Voglio che (2) e (3) usino lo STESSO identico disegno/componente del campo da basket gia' usato in (1), invece di avere una loro versione diversa.

Regole: NON ridisegnare il campo da zero. Trova la funzione/componente che disegna il campo da basket nella Lavagnetta Tattica (quello corretto) e RIUSALO (stessa funzione, stesso viewBox/proporzioni, stesso path SVG) anche nella sezione Esercizi e nella Formazione Consigliata, invece della versione attualmente storpiata presente li'. Se il campo calcio e pallavolo condividono gia' un pattern simile (componente riusato in piu' punti), segui lo stesso pattern per il basket.

NON toccare il campo calcio ne' quello pallavolo, che sono corretti. `node --check` alla fine. Bumpa APP_VERSION e sw.js CACHE_VERSION alla versione successiva.

Alla fine dimmi quale funzione/componente hai riusato e da dove l'hai preso.

MODULO I

Contesto: nella sezione creazione esercizi (lavagnetta), la barra comandi e' stata spostata lateralmente ma la freccetta per cambiare lato (destra/sinistra) resta ancorata in alto, creando una "barra unica" che parte dall'alto dello schermo. Voglio che l'intera colonna comandi (freccetta inclusa) sia invece centrata verticalmente nello schermo, non ancorata in alto.

Regole: sposta SOLO la posizione verticale della colonna (e della freccetta di switch lato), non la logica dei bottoni ne' la loro disposizione interna. `node --check` alla fine. Bumpa APP_VERSION e sw.js CACHE_VERSION alla versione successiva.

1) La colonna comandi (con la freccetta di switch inclusa in cima o dove si trova ora) deve essere centrata verticalmente nell'area di disegno, con margini simmetrici sopra e sotto, non ancorata al bordo superiore dello schermo.
2) Verifica che resti ben visibile e raggiungibile sia su tablet che schermi piu' piccoli.

Alla fine conferma i bump di versione.

MODULO L

Contesto: nella lavagnetta esercizi, gli elementi disegnabili (giocatori, avversari, birilli, palla, frecce/linee, riquadri/zone) hanno colori fissi. Voglio dare all'allenatore la possibilita' di scegliere il colore di ciascun elemento quando lo piazza o lo disegna, cosi' puo' usare colori diversi per comunicare significati diversi (es. una linea rossa per un movimento, una verde per un altro; un riquadro giallo per un'area, uno rosso per un'altra).

Regole: NON cambiare la logica di piazzamento/disegno, solo aggiungi la scelta del colore. Retrocompatibile: gli esercizi/elementi gia' salvati senza colore esplicito devono continuare a mostrare il colore di default attuale, senza errori. `node --check` alla fine. Bumpa APP_VERSION e sw.js CACHE_VERSION alla versione successiva.

1) Aggiungi un selettore colore (palette di colori predefiniti, es. rosso/verde/giallo/blu/bianco/nero, non serve un color-picker libero) che appare quando si seleziona lo strumento giocatore/avversario/birillo/palla/freccia/riquadro, prima di piazzarlo o mentre lo si disegna.
2) Salva il colore scelto dentro il dato dell'elemento stesso (es. il campo 'c' gia' usato per le zone, o un campo analogo per gli altri tipi), cosi' viene renderizzato con quel colore ogni volta che l'esercizio si riapre.
3) Se un elemento non ha colore specificato (esercizi vecchi), usa il colore di default attuale per quel tipo di elemento.
4) Se un elemento e' gia' selezionato/piazzato, permetti di cambiargli colore anche dopo (non solo alla creazione).

Alla fine dimmi come hai gestito la retrocompatibilita' e conferma i bump di versione.
