/* ==========================================================================
   ROMANTIC AUDIO ENGINE v2
   Procedural piano + warm reverb + ambient pad + SFX
   Zero external files. Pure Web Audio API.
   ========================================================================== */

class RomanticAudioEngine {
    constructor() {
        this.ctx         = null;
        this.masterGain  = null;
        this.reverbNode  = null;
        this.filterNode  = null;
        this.isPlaying   = false;
        this._scheduleId = null;

        // 12-TET frequency table (A4 = 440 Hz)
        this.freq = this._buildFreqTable();

        /*  Chord progression: C-maj9 → Am9 → F-maj7 → G-sus2
            Each array = one bar of 8 eigth-notes (arpeggio up/down) */
        this.progression = [
            // Cmaj9 – root position going up
            ['C4','E4','G4','B4','C5','B4','G4','E4'],
            // Am9
            ['A3','E4','A4','C5','E5','C5','A4','E4'],
            // Fmaj7
            ['F3','A3','C4','E4','A4','E4','C4','A3'],
            // Gsus2
            ['G3','D4','G4','A4','D5','A4','G4','D4'],
        ];

        this._bar  = 0;
        this._beat = 0;
        this._bpm  = 66;           // dreamy slow tempo
        this._beatMs = 60000 / (this._bpm * 2); // eighth-note duration
    }

    /* Build a simple frequency table for octaves 2–6 */
    _buildFreqTable() {
        const names  = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
        const table  = {};
        for (let oct = 2; oct <= 6; oct++) {
            names.forEach((n, i) => {
                // A4 = 440, midi note 69
                const semis = (oct + 1) * 12 + i;   // C0 = midi 12
                const midi  = semis;                  // relative index ok
                table[`${n}${oct}`] = 440 * Math.pow(2, (midi - 57 - 12) / 12);
            });
        }
        // Patch A4 precisely
        table['A4'] = 440;
        return table;
    }

    /* Lazy-init AudioContext */
    _init() {
        if (this.ctx) return;
        const Ctx       = window.AudioContext || window.webkitAudioContext;
        this.ctx        = new Ctx();

        // Master volume
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        // Warm low-pass filter
        this.filterNode = this.ctx.createBiquadFilter();
        this.filterNode.type      = 'lowpass';
        this.filterNode.frequency.value = 3200;
        this.filterNode.Q.value   = 0.7;
        this.filterNode.connect(this.masterGain);

        // Reverb (impulse response built synthetically)
        this.reverbNode = this._buildReverb(2.4);
        this.reverbNode.connect(this.masterGain);

        // Fade master in smoothly
        this.masterGain.gain.linearRampToValueAtTime(0.38, this.ctx.currentTime + 2.5);
    }

    /* Synthetic impulse-response reverb */
    _buildReverb(duration) {
        const sRate  = this.ctx.sampleRate;
        const length = sRate * duration;
        const ir     = this.ctx.createBuffer(2, length, sRate);

        for (let ch = 0; ch < 2; ch++) {
            const data = ir.getChannelData(ch);
            for (let i = 0; i < length; i++) {
                data[i] = (Math.random() * 2 - 1) *
                           Math.pow(1 - i / length, 2.2);
            }
        }

        const conv = this.ctx.createConvolver();
        conv.buffer = ir;

        // Reverb mix gain (wet signal)
        const wet = this.ctx.createGain();
        wet.gain.value = 0.22;
        conv.connect(wet);
        wet.connect(this.masterGain);

        return conv;   // return convolver so piano notes can pipe into it
    }

    /* Strike a single piano key (fundamental + 2nd harmonic + reverb send) */
    _strike(freq, when, vel = 0.16) {
        if (!this.ctx) return;
        const now = when;

        // --- Fundamental (sine) ---
        const osc1  = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type   = 'sine';
        osc1.frequency.value = freq;
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(vel, now + 0.012);
        gain1.gain.setTargetAtTime(vel * 0.3, now + 0.08, 0.25);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);
        osc1.connect(gain1);
        gain1.connect(this.filterNode);
        gain1.connect(this.reverbNode);

        // --- 2nd harmonic (triangle, -12 dB) ---
        const osc2  = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type   = 'triangle';
        osc2.frequency.value = freq * 2;
        gain2.gain.setValueAtTime(0, now);
        gain2.gain.linearRampToValueAtTime(vel * 0.28, now + 0.015);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
        osc2.connect(gain2);
        gain2.connect(this.filterNode);

        osc1.start(now);  osc1.stop(now + 2.9);
        osc2.start(now);  osc2.stop(now + 1.5);
    }

    /* Schedule the next bar using Web Audio clock (drift-free) */
    _schedule() {
        if (!this.isPlaying || !this.ctx) return;

        const beatSec  = (this._beatMs / 1000);
        const barNotes = this.progression[this._bar % this.progression.length];

        for (let i = 0; i < barNotes.length; i++) {
            const f = this.freq[barNotes[i]];
            if (f) {
                const t = this.ctx.currentTime + i * beatSec;
                // Root note slightly louder (gives it the "piano" feel)
                const vel = i === 0 ? 0.18 : 0.12;
                this._strike(f, t, vel);
            }
        }

        this._bar++;
        const barDuration = barNotes.length * this._beatMs;
        this._scheduleId  = setTimeout(() => this._schedule(), barDuration - 30);
    }

    /* Public API */
    startMusic() {
        this._init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        if (this.isPlaying) return;
        this.isPlaying = true;
        this._bar      = 0;
        this._schedule();
    }

    stopMusic() {
        this.isPlaying = false;
        clearTimeout(this._scheduleId);
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.6);
        }
    }

    toggleMusic() {
        if (this.isPlaying) { this.stopMusic(); return false; }
        else                { this.startMusic(); return true; }
    }

    /* ── SFX ── */

    /* Rising sparkle chime arpeggio */
    playSparkleSFX() {
        this._init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const freqs = [783.99, 987.77, 1174.66, 1396.91, 1567.98];
        freqs.forEach((f, i) => {
            const t   = this.ctx.currentTime + i * 0.085;
            const osc = this.ctx.createOscillator();
            const g   = this.ctx.createGain();
            osc.type  = 'sine';
            osc.frequency.value = f;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.1, t + 0.01);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
            osc.connect(g);
            g.connect(this.masterGain || this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.6);
        });
    }

    /* Organic "lub-dub" heartbeat sub pulse */
    playHeartbeatSFX() {
        this._init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const thud = (f0, delay) => {
            const t   = this.ctx.currentTime + delay / 1000;
            const osc = this.ctx.createOscillator();
            const g   = this.ctx.createGain();
            osc.type  = 'sine';
            osc.frequency.setValueAtTime(f0, t);
            osc.frequency.exponentialRampToValueAtTime(28, t + 0.18);
            g.gain.setValueAtTime(0.35, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
            osc.connect(g);
            g.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.25);
        };

        thud(68, 0);    // "Lub"
        thud(55, 150);  // "Dub"
    }

    /* Wax seal crack = upward sparkle gliss */
    playUnsealSFX() {
        this._init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        // Rising gliss
        const osc = this.ctx.createOscillator();
        const g   = this.ctx.createGain();
        const now = this.ctx.currentTime;
        osc.type  = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.4);
        g.gain.setValueAtTime(0.14, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.55);

        // Followed by chimes
        setTimeout(() => this.playSparkleSFX(), 280);
    }
}

window.romanticAudio = new RomanticAudioEngine();
