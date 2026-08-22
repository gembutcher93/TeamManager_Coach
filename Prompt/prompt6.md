MODULO N

Contesto: app coach, su tablet/iPad. Voglio aggiungere un bottone hamburger (tre lineette) che apre un MENU LATERALE (drawer), mantenendo ALLO STESSO TEMPO la navbar in basso già esistente — non sostituirla, coesistono entrambi.

Regole: NON toccare la logica di navigazione esistente (le voci/sezioni restano le stesse), solo aggiungi un modo alternativo di navigare via drawer laterale. Usa le skill mobile-principles/mobile-design. `node --check` alla fine. Bumpa APP_VERSION e sw.js CACHE_VERSION alla versione successiva.

1) Aggiungi un bottone hamburger visibile (in alto, header) che apre un pannello laterale scorrevole (da sinistra o destra, a scelta) con le stesse voci di navigazione già presenti nella navbar in basso.
2) Il drawer si chiude toccando fuori da esso o un tasto X.
3) La navbar in basso resta invariata e funzionante come oggi, in parallelo al drawer.
4) Il drawer deve avere target di tocco comodi (min ~48px) e transizione morbida.

Alla fine dimmi dove hai agganciato il drawer e conferma i bump di versione.
