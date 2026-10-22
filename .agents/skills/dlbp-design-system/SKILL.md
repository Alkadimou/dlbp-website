---
name: dlbp-design-system
description: Regole grafiche del sito dlbp.art (identità "cromo nero, colore vivo"). Coprono colori del motto, caratteri, pannelli, bottoni, sfondo 3D con il DNA e cursore a croce. Da leggere prima di ogni modifica grafica al sito.
---

# Identità grafica di dlbp.art: "cromo nero, colore vivo"

In vigore dal 27/09/2026. Sostituisce il vecchio stile, che **non va più usato**: bolle viola animate, vetro sfocato, angoli arrotondati, bagliori.

I valori veri sono nel codice, che conta sempre più di questa guida:
- `css/identity.css`: colori, caratteri e forme. Si carica dopo `css/styles.css` e ne sovrascrive l'aspetto.
- `js/core/background.js`: palette (`MOODS`), le quattro luci (`ORDER`, `ORBIT`), colore del sito che segue la luce (`FOLLOW_HOLD`, `FOLLOW_FADE`), battito (`BPM`), sfondo 3D.

Chi cambia la palette la cambia in entrambi i file e avvisa il proprietario, che la tiene aggiornata anche nella sua guida grafica privata.

## Colori
- **Base nera:**
  - fondo del sito `#050508`;
  - pannelli `rgba(5, 5, 8, 0.8)`;
  - linee `rgba(236, 234, 244, 0.12)`;
  - testo `#eceaf4`.
- **I quattro colori del motto sono sempre tutti in scena**, come luci da club viste nel fumo. Dal 22/10/2026 sono quattro luci invisibili che girano attorno alla scena: si vedono solo i loro riflessi sul cromo, il fondo resta nero.

| Parola | Nome nel codice | Colore | Profondo | Testo sui bottoni |
|---|---|---|---|---|
| Drink | `brace` | `#ff4a1c` brace | `#3a0802` | scuro |
| Love | `magenta` | `#8a2c80` bordeaux violaceo | `#250a24` | chiaro |
| Breathe | `breathe` | `#1fa39a` petrolio | `#062f35` | scuro |
| Peace | `ghiaccio` | `#cfe6ff` ghiaccio | `#34506e` | scuro |

- **Colore del sito:** segue la luce che si riflette di più. Passa piano verso quella luce (dissolvenza di 0,8 s) e cambia solo se un'altra luce resta più forte per 2 secondi. Lo stesso colore va ai pioli del DNA, ai nuclei delle cellule e alla polvere. Non c'è più `?mood=` né un colore di partenza da scegliere.
- **Variabili CSS** (le imposta `background.js` su `<html>`):
  - `--mood`: il colore;
  - `--mood-deep`: la sua versione profonda;
  - `--on-mood`: il testo sopra il colore;
  - `--mood-text`: il testo colorato su fondo nero.
- **Mai:**
  - colori chiari e saturi "caramella" (menta, lilla, rosa, arancio acceso) né colori fuori dal motto;
  - punti luce o bagliori visibili sul fondo: il colore sta solo nei riflessi;
  - sfumature tra colori diversi sul fondo.

## Caratteri
- **League Gothic** (`--f-display`): titoli e nomi degli eventi. Sempre maiuscolo, interlinea stretta (0,95).
- **IBM Plex Sans** (`--f-body`): testi normali, pesi da 300 a 500.
- **Space Mono**: date, orari, etichette, bottoni, codici e la sequenza di DNA. Maiuscolo con spaziatura larga.
- Nessun altro carattere.

## Forme e componenti
- **Forme:**
  - angoli vivi ovunque (`border-radius: 0`);
  - pannelli scuri all'80% con un bordo sottile;
  - **nessuna sfocatura** sui pannelli. Dietro le finestre (`.modal`, `.custom-modal-overlay`) invece la sfocatura di 5 px resta: il proprietario l'ha vista con e senza il 29/09 e l'ha voluta tenere.
- **Bottone principale** (`.submit-btn`):
  - pieno nel colore del sito;
  - testo in `--on-mood`;
  - riflesso di cromo che passa ogni 4,5 secondi (`chromeGlint`).
- **Bottone di pericolo** (`.btn-danger`: ELIMINA, ESCI): vuoto, bordo rosso al 40%, testo rosso chiaro; passando sopra si riempie di rosso al 15%. Niente riflesso. Quando è disattivato è spento come gli altri (bordo al 5%, testo al 20%).
- **Bottone secondario** (`.btn-secondary`: FILTRI): vuoto, bordo al 24%, testo al 70%; passando sopra il fondo si accende al 6%. Niente riflesso.
- **Colori di stato:**
  - link e voci di menu attive in `--mood-text`;
  - etichette di stato (ISCRIZIONI APERTE, PROSSIMAMENTE, PROSSIMO EVENTO) in `--mood-text`, mai in verde;
  - riquadri di avviso (`.alert`): angoli vivi, titolo in Space Mono. Rosso (`.alert-danger`) solo per i "no" come GUESTLIST CLOSED; per gli avvisi normali `.alert-mood`, con bordo e titolo nel colore del sito;
  - messaggio di conferma sotto i moduli (`.form-message.success`): bordo in `--mood` e testo in `--mood-text`, mai verde;
  - campi in focus con il bordo in `--mood`.
- **Icone social del footer:** vengono da `assets/social-icons.svg` (Font Awesome Free 6.4.0) e si usano così:
  `<svg class="social-icon" viewBox="0 0 448 512" aria-hidden="true"><use href="assets/social-icons.svg#instagram"></use></svg>`.
  Il `viewBox` cambia per ogni icona ed è scritto nel file.
- **Tabelle:** nell'admin e nell'area PR stanno dentro `.table-responsive` e sui telefoni diventano schede. Ogni cella ha `data-label` con il nome della colonna.

## Sfondo e cursore
- **Sfondo:** ogni pagina ha `<div class="site-background">` con il filamento di DNA in cromo (modello di Troy, CC BY 4.0, `assets/dna.glb`) che gira piano su sé stesso (Three.js), su fondo nero, con le quattro luci del motto che girano. In home al centro c'è il cuore in cromo che batte (Mox3DModels, CC BY 4.0) con sette cellule lontane (Physio CG, CC BY 4.0). **Niente glitch** dal 21/10/2026; niente zoom né bagliore sul battito dal 22/10/2026.
- **Suono:** sulle pagine pubbliche il battito si sente (`js/core/heart-sound.js`); il bottone `.sound-toggle` (quadrato nero in basso a destra, icona nel colore del sito quando è acceso) lo spegne.
- **Crediti:** "DNA 3D: Troy · CC BY 4.0" nel footer di ogni pagina (`.credit-3d`), a destra su computer e sotto il copyright su telefono; in home, uno sotto l'altro, anche "Cellula 3D: Physio CG · CC BY 4.0" e "Cuore 3D: Mox3DModels · CC BY 4.0". Li chiedono le licenze, non vanno tolti.
- **Attributi dello sfondo:**
  - `data-dim="0.5"`: sfondo più scuro, per le pagine con molti contenuti;
  - `data-heart`: cuore e cellule lontane, solo in home;
  - `data-lite`: versione leggera, usata dallo scanner (senza cuore);
  - `data-tap`: pagine pubbliche. Il cursore è una croce su tutta la pagina tranne link, bottoni e campi, e un clic dove c'è la croce dà un battito forte.
- **Home:** `#dna-seq` è la sequenza di DNA che si decifra nella parola della luce che dà il colore al sito. Motto e sequenza hanno un'ombra nera forte a strati, perché stanno sopra il cuore.
- **"Riduci movimento" attivo:** la scena resta su un fotogramma fermo e spariscono la croce e il riflesso dei bottoni.

## Logo
- Sempre a tinta unita: bianco sul nero.
- Mai colorato, deformato, con ombre o bagliori.

## Regole pratiche per chi modifica
- **Stili nuovi:** usare i token di `identity.css` (`--mood`, `--panel`, `--panel-line`, `--ink`, `--f-display`, `--f-body`), non colori scritti a mano.
- **Mostrare e nascondere:** con la classe `.hidden`.
- **Versioni:** dopo una modifica a CSS o JS, aumentare il numero `?v=` nelle pagine. `styles.css`, `identity.css` e `background.js` usano lo stesso numero ovunque (vedi `CLAUDE.md`).
- **Prove:** prima di pubblicare, provare le 6 pagine su computer e su telefono, senza errori in console.
- **Proposte:** i cambiamenti visibili si propongono al proprietario prima di applicarli.
