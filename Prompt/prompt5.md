MODULO M

Contesto: alla creazione di una nuova squadra/profilo, l'app inserisce automaticamente dei giocatori di ESEMPIO precompilati (con voti, partite, allenamenti finti) sempre nel modello PALLAVOLO, indipendentemente dallo sport scelto. Questo causa dati sbagliati/incoerenti se lo sport scelto è calcio o basket (ruoli, campi e struttura voti non corrispondono).

Voglio RIMUOVERE questo seed di dati di esempio. Una squadra nuova deve partire COMPLETAMENTE VUOTA (nessun giocatore, nessuna partita, nessun allenamento precompilato), qualunque sia lo sport scelto.

Regole: NON toccare il tutorial iniziale ne' il flusso di creazione squadra/sport, solo il contenuto con cui viene inizializzata una squadra nuova. Modifiche chirurgiche. `node --check` alla fine. Bumpa APP_VERSION e sw.js CACHE_VERSION alla versione successiva.

1) Trova dove viene generato/inserito il set di giocatori/dati di esempio alla creazione di una nuova squadra o profilo, e rimuovilo: la squadra nuova deve inizializzarsi con liste vuote (giocatori, partite, allenamenti, voti).
2) Verifica che questo valga per TUTTI e 3 gli sport (pallavolo, calcio, basket) e per qualunque punto dell'app crei una nuova squadra (creazione iniziale, "Le mie squadre" -> Nuova squadra, ecc.).
3) Assicurati che nessuna altra parte dell'app (dashboard, statistiche, formazione consigliata) generi errori quando la squadra e' vuota - deve mostrare stati vuoti puliti ("Nessun giocatore ancora", "Aggiungi la tua rosa"), non crash ne' NaN/null a schermo.

Alla fine dimmi dove si trovava il seed e conferma i bump di versione.


FIX MODULO M

Contesto: alla creazione di una nuova squadra/profilo, l'app inserisce automaticamente dei giocatori di ESEMPIO precompilati (con voti, partite, allenamenti finti) sempre nel modello PALLAVOLO, indipendentemente dallo sport scelto. Questo causa dati sbagliati/incoerenti se lo sport scelto è calcio o basket (ruoli, campi e struttura voti non corrispondono).

Voglio RIMUOVERE questo seed di dati di esempio. Una squadra nuova deve partire COMPLETAMENTE VUOTA (nessun giocatore, nessuna partita, nessun allenamento precompilato), qualunque sia lo sport scelto.

Regole: NON toccare il tutorial iniziale ne' il flusso di creazione squadra/sport, solo il contenuto con cui viene inizializzata una squadra nuova. Modifiche chirurgiche. `node --check` alla fine. Bumpa APP_VERSION e sw.js CACHE_VERSION alla versione successiva.

1) Trova dove viene generato/inserito il set di giocatori/dati di esempio alla creazione di una nuova squadra o profilo, e rimuovilo: la squadra nuova deve inizializzarsi con liste vuote (giocatori, partite, allenamenti, voti).
2) Verifica che questo valga per TUTTI e 3 gli sport (pallavolo, calcio, basket) e per qualunque punto dell'app crei una nuova squadra (creazione iniziale, "Le mie squadre" -> Nuova squadra, ecc.).
3) Assicurati che nessuna altra parte dell'app (dashboard, statistiche, formazione consigliata) generi errori quando la squadra e' vuota - deve mostrare stati vuoti puliti ("Nessun giocatore ancora", "Aggiungi la tua rosa"), non crash ne' NaN/null a schermo.

Alla fine dimmi dove si trovava il seed e conferma i bump di versione.

