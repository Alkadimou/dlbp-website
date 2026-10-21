// Suono del battito dello sfondo ("cuore sordo"): due colpi bassi, morbidi e ovattati, tum-tum, creati con Web Audio (nessun file),
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

    // Timbro del colpo: tre prove da ascoltare con ?suono=A|B|C nell'indirizzo (B di partenza).
    // tone: il tono basso che scende (Hz); harm: quanto si sente l'ottava sopra (aiuta gli altoparlanti piccoli);
    // body: il "tonfo" di rumore filtrato, come il sangue che spinge (tenuto morbido: entra più piano del tono, così non suona come un battito di mani); lp: il passa-basso finale che rende tutto sordo.
    const VOICES = {
        A: { tone: [58, 36], harm: 0, attack: 0.02, decay: 0.2, body: { type: 'lowpass', f: 65, q: 0.5, amp: 0.25, decay: 0.14 }, lp: 140, gain: 1.5 },
        B: { tone: [72, 44], harm: 0.18, attack: 0.014, decay: 0.16, body: { type: 'lowpass', f: 70, q: 0.5, amp: 0.35, decay: 0.13 }, lp: 200, gain: 1.1 },
        C: { tone: [50, 40], harm: 0, attack: 0.025, decay: 0.12, body: { type: 'bandpass', f: 55, q: 1.4, amp: 1.1, decay: 0.16 }, lp: 150, gain: 1.3 }
    };
    const voice = VOICES[(new URLSearchParams(location.search).get('suono') || '').toUpperCase()] || VOICES.B;

    function setup() {
        if (ctx) return;
        ctx = new AC();
        // suono sordo: tutto passa da un passa-basso, poi un compressore leggero perché i colpi non saturino
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = voice.lp; lp.Q.value = 0.5;
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -18; comp.ratio.value = 3;
        out = ctx.createGain();
        out.gain.value = VOLUME * voice.gain;
        out.connect(lp).connect(comp).connect(ctx.destination);
        noise = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.4), ctx.sampleRate);
        const d = noise.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }

    // inviluppo morbido: sale senza scatti (niente "clic") e si spegne piano
    function envelope(g, at, peak, attack, decay) {
        g.gain.setValueAtTime(0, at);
        g.gain.linearRampToValueAtTime(peak, at + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
    }

    // un colpo; second: il secondo "tum", un po' più alto e più corto, come nel cuore vero
    function thump(at, amp, second = false) {
        const v = voice, up = second ? 1.15 : 1, short = second ? 0.8 : 1;
        const end = at + Math.max(v.attack + v.decay, v.attack * 2.5 + v.body.decay) * short + 0.05;
        [[1, 1], [2, v.harm]].forEach(([mul, a]) => {
            if (!a) return;
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(v.tone[0] * up * mul, at);
            o.frequency.exponentialRampToValueAtTime(v.tone[1] * up * mul, at + v.attack + v.decay * 0.6);
            envelope(g, at, amp * a, v.attack, v.decay * short);
            o.connect(g).connect(out);
            o.start(at); o.stop(end);
        });
        const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        n.buffer = noise;
        f.type = v.body.type; f.frequency.value = v.body.f * up; f.Q.value = v.body.q;
        envelope(g, at, amp * v.body.amp, v.attack * 2.5, v.body.decay * short);
        n.connect(f).connect(g).connect(out);
        n.start(at, Math.random() * 0.15); n.stop(end);
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
                thump(Math.max(ctx.currentTime, toAudio(at + gap * 1000)), 0.6, true);
                next++;
            }
        },
        // il clic sullo sfondo: un colpo forte in più
        kick() {
            if (on && running()) thump(ctx.currentTime + 0.005, 1.2);
        }
    };
}
