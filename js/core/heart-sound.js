// Suono del battito dello sfondo ("cuore sordo"): due colpi bassi e morbidi, tum-tum, creati con Web Audio (nessun file),
// a tempo con la pulsazione di background.js. Solo sulle pagine pubbliche (sfondo con data-tap), mai con "riduci movimento".
// È acceso di partenza, ma i browser fanno partire l'audio solo dopo un gesto della persona: se all'apertura è bloccato,
// parte al primo tocco, clic o tasto in qualsiasi punto della pagina.
// Il bottone con l'altoparlante (in basso a destra) lo spegne e lo riaccende; la scelta resta anche cambiando pagina.

const STORE = 'dlbp-audio';
const VOLUME = 0.55;
const LOOKAHEAD = 0.2; // secondi di battiti programmati in anticipo

function readOn() {
    try { return localStorage.getItem(STORE) !== 'off'; } catch (e) { return true; }
}
function saveOn(on) {
    try { localStorage.setItem(STORE, on ? 'on' : 'off'); } catch (e) { /* localStorage non disponibile */ }
}

const ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square">' +
    '<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" stroke="none"/>' +
    '<path class="sound-on" d="M16 9.5a3.5 3.5 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10"/>' +
    '<path class="sound-off" d="M16.5 9.5l5 5M21.5 9.5l-5 5"/></svg>';

// bpm, gap (secondi fra i due colpi) e t0 (performance.now() del primo battito) sono quelli della pulsazione dello sfondo
export function startHeartSound({ bpm, gap, t0 }) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const period = 60 / bpm;
    let on = readOn();
    let ctx = null, out = null, noise = null, next = 0;

    function setup() {
        if (ctx) return;
        ctx = new AC();
        // suono sordo: tutto passa da un passa-basso, poi un compressore leggero perché i colpi non saturino
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 650; lp.Q.value = 0.4;
        const comp = ctx.createDynamicsCompressor();
        out = ctx.createGain();
        out.gain.value = VOLUME;
        out.connect(lp).connect(comp).connect(ctx.destination);
        // rumore per il "tonfo" del colpo
        noise = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.2), ctx.sampleRate);
        const d = noise.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }

    // un colpo: un tono basso che scende (con un'armonica, così si sente anche dagli altoparlanti dei telefoni) e un tonfo
    function thump(at, amp) {
        [[1, 1, 'sine'], [2, 0.35, 'triangle']].forEach(([mul, a, type]) => {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = type;
            o.frequency.setValueAtTime(92 * mul, at);
            o.frequency.exponentialRampToValueAtTime(46 * mul, at + 0.13);
            g.gain.setValueAtTime(0.0001, at);
            g.gain.exponentialRampToValueAtTime(amp * a, at + 0.008);
            g.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
            o.connect(g).connect(out);
            o.start(at); o.stop(at + 0.32);
        });
        const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        n.buffer = noise;
        f.type = 'lowpass'; f.frequency.value = 220;
        g.gain.setValueAtTime(amp * 0.6, at);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 0.09);
        n.connect(f).connect(g).connect(out);
        n.start(at); n.stop(at + 0.1);
    }

    // da un istante di performance.now() al tempo dell'audio (con il ritardo dell'uscita, così si sente a tempo con l'immagine)
    const toAudio = (perf) => ctx.currentTime + (perf - performance.now()) / 1000 - (ctx.outputLatency || ctx.baseLatency || 0);
    const running = () => ctx && ctx.state === 'running';

    function play() {
        setup();
        if (ctx.state !== 'running') ctx.resume().catch(() => { /* bloccato finché la persona non tocca la pagina */ });
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sound-toggle';
    btn.innerHTML = ICON;
    function show() {
        btn.setAttribute('aria-pressed', String(on));
        btn.setAttribute('aria-label', on ? 'Battito: audio acceso. Tocca per spegnere' : 'Battito: audio spento. Tocca per accendere');
        btn.title = on ? 'Spegni il battito' : 'Accendi il battito';
    }
    show();
    document.body.appendChild(btn);
    btn.addEventListener('click', () => {
        // acceso ma ancora bloccato dal browser: il tocco sul bottone lo fa partire, non lo spegne
        if (on && !running()) { play(); return; }
        on = !on;
        saveOn(on);
        show();
        if (on) play(); else if (ctx) ctx.suspend();
    });

    // primo gesto in qualsiasi punto della pagina: se l'audio è acceso e bloccato, parte
    const unlock = () => {
        if (on && !running()) play();
        if (running()) ['pointerdown', 'keydown', 'touchend'].forEach((ev) => document.removeEventListener(ev, unlock, true));
    };
    ['pointerdown', 'keydown', 'touchend'].forEach((ev) => document.addEventListener(ev, unlock, true));
    document.addEventListener('visibilitychange', () => {
        if (!ctx) return;
        if (document.hidden) ctx.suspend(); else if (on) ctx.resume().catch(() => {});
    });
    // prova subito: alcuni browser lo permettono (per esempio a chi è già stato sul sito)
    if (on) play();

    return {
        // da chiamare a ogni fotogramma: programma i colpi dei prossimi LOOKAHEAD secondi
        tick(now) {
            if (!on || !running()) return;
            const bsec = (now - t0) / 1000;
            next = Math.max(next, Math.ceil(bsec / period));
            while (next * period < bsec + LOOKAHEAD) {
                const at = t0 + next * period * 1000;
                thump(Math.max(ctx.currentTime, toAudio(at)), 1);
                thump(Math.max(ctx.currentTime, toAudio(at + gap * 1000)), 0.6);
                next++;
            }
        },
        // il clic sullo sfondo: un colpo forte in più
        kick() {
            if (on && running()) thump(ctx.currentTime + 0.005, 1.2);
        }
    };
}
