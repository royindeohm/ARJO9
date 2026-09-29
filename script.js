/* ==========================================================================
   9-MONTH ANNIVERSARY — MAIN INTERACTIVE SCRIPT
   Modules:
   1. Canvas Engines (background particles + touch trails)
   2. Envelope Unsealing + Stage Transition
   3. Audio Widget Controls
   4. Live Counter Ticker
   5. Modal / Overlay System
   6. Chapter 1: 3D Flash Deck + Swipe Gestures
   7. Chapter 2: Heartbeat Hold Sensor
   8. Chapter 3: HTML5 Canvas Scratch Card
   9. Chapter 4: Star Constellation Connector
   10. Final Chapter: Fireworks Engine
   11. Personalisation + localStorage
   12. Global Toast Notification
   ========================================================================== */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

/* ══════════════════════════════════════════════════════════════════════════
   1. CANVAS ENGINES
══════════════════════════════════════════════════════════════════════════ */

const bgCanvas    = /** @type {HTMLCanvasElement} */ (document.getElementById('bg-canvas'));
const bgCtx       = bgCanvas.getContext('2d');
const touchCanvas = /** @type {HTMLCanvasElement} */ (document.getElementById('touch-canvas'));
const touchCtx    = touchCanvas.getContext('2d');

let W = 0, H = 0;

function resizeCanvases() {
    W = bgCanvas.width = touchCanvas.width = window.innerWidth;
    H = bgCanvas.height = touchCanvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvases);
resizeCanvases();

// ── Background floating hearts + bokeh ────────────────────
const PARTICLE_COUNT = Math.min(30, Math.floor(W / 13));
const bgParticles = [];

class BgParticle {
    constructor(yStart) {
        this.reset(yStart != null ? yStart : H + 30);
    }

    reset(startY) {
        this.x     = Math.random() * W;
        this.y     = startY;
        this.vy    = Math.random() * 0.9 + 0.5;
        this.vx    = 0;
        this.size  = Math.random() * 11 + 6;
        this.alpha = Math.random() * 0.45 + 0.15;
        this.type  = Math.random() > 0.45 ? 'heart' : 'circle';
        this.hue   = Math.random() > 0.55 ? '#ffb7c5' : (Math.random() > 0.5 ? '#f4d06f' : '#ff4080');
        this.angle = Math.random() * Math.PI * 2;
        this.spin  = (Math.random() - 0.5) * 0.025;
    }

    update() {
        this.y     -= this.vy;
        this.x     += Math.sin(this.y * 0.013) * 0.45;
        this.angle += this.spin;
        if (this.y < -30) this.reset(H + 30);
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle   = this.hue;

        if (this.type === 'heart') {
            const s = this.size * 0.4;
            ctx.beginPath();
            ctx.moveTo(0, s * 0.8);
            ctx.bezierCurveTo(0, 0, -s * 1.5, 0, -s * 1.5, s * 0.8);
            ctx.bezierCurveTo(-s * 1.5, s * 1.8,  0,  s * 2.5,  0,  s * 2.5);
            ctx.bezierCurveTo(0,  s * 2.5,  s * 1.5, s * 1.8, s * 1.5, s * 0.8);
            ctx.bezierCurveTo(s * 1.5, 0,  0, 0,  0,  s * 0.8);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, this.size * 0.18, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

for (let i = 0; i < PARTICLE_COUNT; i++) {
    bgParticles.push(new BgParticle(Math.random() * H));
}

// ── Touch trail particles ────────────────────────────────
const touchParticles = [];

function spawnTouch(x, y, count = 4) {
    for (let i = 0; i < count; i++) {
        touchParticles.push({
            x, y,
            vx:      (Math.random() - 0.5) * 5,
            vy:      (Math.random() - 0.5) * 5 - 1.5,
            r:       Math.random() * 8 + 3,
            alpha:   1,
            color:   Math.random() > 0.5 ? '#f4d06f' : '#ff4080',
        });
    }
}

// Listen for finger / mouse movement anywhere on screen
function onPointerMove(e) {
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    spawnTouch(x, y, 3);
}
window.addEventListener('mousemove', onPointerMove, { passive: true });
window.addEventListener('touchmove', onPointerMove, { passive: true });

// ── Main animation loop ─────────────────────────────────
function animate() {
    // Background hearts
    bgCtx.clearRect(0, 0, W, H);
    bgParticles.forEach(p => { p.update(); p.draw(bgCtx); });

    // Touch trail
    touchCtx.clearRect(0, 0, W, H);
    for (let i = touchParticles.length - 1; i >= 0; i--) {
        const p = touchParticles[i];
        p.x     += p.vx;
        p.y     += p.vy;
        p.alpha -= 0.025;
        p.r     *= 0.96;
        if (p.alpha <= 0) { touchParticles.splice(i, 1); continue; }
        touchCtx.save();
        touchCtx.globalAlpha = p.alpha;
        touchCtx.fillStyle   = p.color;
        touchCtx.beginPath();
        touchCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        touchCtx.fill();
        touchCtx.restore();
    }

    requestAnimationFrame(animate);
}
animate();


/* ══════════════════════════════════════════════════════════════════════════
   2. ENVELOPE UNSEALING + STAGE TRANSITION
══════════════════════════════════════════════════════════════════════════ */

const envelope      = document.getElementById('envelope');
const waxSeal       = document.getElementById('wax-seal');
const stageEnvelope = document.getElementById('stage-envelope');
const stageJourney  = document.getElementById('stage-journey');
const audioWidget   = document.getElementById('audio-widget');
const btnCustomizer = document.getElementById('btn-customizer');

let envelopeOpened = false;

waxSeal.addEventListener('click', openEnvelope);
waxSeal.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openEnvelope(); });

function openEnvelope() {
    if (envelopeOpened) return;
    envelopeOpened = true;

    // SFX
    window.romanticAudio.playUnsealSFX();

    // Start piano softly after 300ms (lets SFX breathe)
    setTimeout(() => {
        window.romanticAudio.startMusic();
        audioWidget.classList.remove('hidden');
        audioWidget.classList.add('playing');
    }, 300);

    // Open envelope flap + letter pop-up
    envelope.classList.add('open');

    // Show top-right customise button
    setTimeout(() => btnCustomizer.classList.remove('hidden'), 600);

    // Transition to stage 1
    setTimeout(() => {
        stageEnvelope.classList.add('hidden-stage');
        stageJourney.classList.remove('hidden-stage');
    }, 1500);
}


/* ══════════════════════════════════════════════════════════════════════════
   3. AUDIO WIDGET CONTROLS
══════════════════════════════════════════════════════════════════════════ */

const btnAudio   = document.getElementById('btn-audio');
const audioStatus = document.getElementById('audio-status');

btnAudio.addEventListener('click', () => {
    const isNowPlaying = window.romanticAudio.toggleMusic();
    audioWidget.classList.toggle('playing', isNowPlaying);
    audioStatus.textContent = isNowPlaying ? 'Playing softly…' : 'Paused';
});

audioWidget.addEventListener('click', (e) => {
    // Clicking anywhere on widget toggles music
    if (e.target !== btnAudio && !btnAudio.contains(e.target)) {
        btnAudio.click();
    }
});


/* ══════════════════════════════════════════════════════════════════════════
   4. LIVE COUNTER TICKER
══════════════════════════════════════════════════════════════════════════ */

// Anniversary start date: 270 days ago from today
const START_DATE = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 270);
    d.setHours(0, 0, 0, 0);
    return d;
})();

const cntD = document.getElementById('cnt-d');
const cntH = document.getElementById('cnt-h');
const cntM = document.getElementById('cnt-m');
const cntS = document.getElementById('cnt-s');

function updateCounter() {
    const diff = Date.now() - START_DATE.getTime();
    const totalSec = Math.floor(diff / 1000);

    const d = Math.floor(diff / 86400000);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor(diff / 60000);
    const s = totalSec;

    cntD.textContent = d.toLocaleString();
    cntH.textContent = h >= 1000 ? (h / 1000).toFixed(1) + 'K' : h.toLocaleString();
    cntM.textContent = m >= 1000 ? (m / 1000).toFixed(1) + 'K' : m.toLocaleString();
    cntS.textContent = s >= 1000000 ? (s / 1000000).toFixed(1) + 'M' : s >= 1000 ? (s / 1000).toFixed(1) + 'K' : s.toLocaleString();
}

updateCounter();
setInterval(updateCounter, 1000);


/* ══════════════════════════════════════════════════════════════════════════
   5. MODAL / OVERLAY SYSTEM
══════════════════════════════════════════════════════════════════════════ */

function openOverlay(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('hidden-modal');
    window.romanticAudio.playSparkleSFX();
}

function closeOverlay(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden-modal');
}

// Close buttons
document.querySelectorAll('.btn-close[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeOverlay(btn.dataset.close));
});

// Close on Escape key
window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.overlay:not(.hidden-modal)').forEach(ov => {
            ov.classList.add('hidden-modal');
        });
    }
});

// Chapter openers
document.getElementById('open-deck').addEventListener('click', () => openOverlay('overlay-deck'));
document.getElementById('open-heartbeat').addEventListener('click', () => openOverlay('overlay-heartbeat'));
document.getElementById('open-scratch').addEventListener('click', () => {
    openOverlay('overlay-scratch');
    initScratch();
});
document.getElementById('open-stars').addEventListener('click', () => {
    openOverlay('overlay-stars');
    initConstellationCanvas();
});
document.getElementById('open-letter').addEventListener('click', () => openOverlay('overlay-letter'));
btnCustomizer.addEventListener('click', () => openOverlay('overlay-customizer'));


/* ══════════════════════════════════════════════════════════════════════════
   6. CHAPTER 1 — 3D FLASH DECK
══════════════════════════════════════════════════════════════════════════ */

const fcards   = document.querySelectorAll('.fcard');
const deckPrev = document.getElementById('deck-prev');
const deckNext = document.getElementById('deck-next');
const deckPage = document.getElementById('deck-page');
let activeCard = 0;

function goToCard(idx) {
    fcards[activeCard].classList.remove('current');
    fcards[activeCard].querySelector('.fcard-inner').style.transform = '';
    fcards[activeCard].classList.remove('flipped');
    activeCard = (idx + fcards.length) % fcards.length;
    fcards[activeCard].classList.add('current');
    deckPage.textContent = `Card ${activeCard + 1} of ${fcards.length}`;
}

deckNext.addEventListener('click', () => { goToCard(activeCard + 1); window.romanticAudio.playSparkleSFX(); });
deckPrev.addEventListener('click', () => { goToCard(activeCard - 1); window.romanticAudio.playSparkleSFX(); });

// Flip on tap
fcards.forEach(card => {
    card.querySelector('.fcard-inner').addEventListener('click', () => {
        card.classList.toggle('flipped');
        window.romanticAudio.playSparkleSFX();
    });
});

// Swipe gesture
let swipeStartX = 0;
const deckStage = document.getElementById('deck-stage');

deckStage.addEventListener('touchstart', e => { swipeStartX = e.touches[0].clientX; }, { passive: true });
deckStage.addEventListener('touchend', e => {
    const dx = swipeStartX - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 45) {
        dx > 0 ? goToCard(activeCard + 1) : goToCard(activeCard - 1);
        window.romanticAudio.playSparkleSFX();
    }
});


/* ══════════════════════════════════════════════════════════════════════════
   7. CHAPTER 2 — HEARTBEAT HOLD SENSOR
══════════════════════════════════════════════════════════════════════════ */

const hbSensor  = document.getElementById('hb-sensor');
const hbFill    = document.getElementById('hb-fill');
const hbLabel   = document.getElementById('hb-label');
const hbSecret  = document.getElementById('hb-secret');
const progressBar = hbFill.closest('[role="progressbar"]');

const HB_DURATION   = 3000; // ms total hold needed
const HB_INTERVAL   = 100;  // ms per tick
let hbHolding       = false;
let hbProgress      = 0;
let hbProgressTimer = null;
let hbSoundTimer    = null;
let hbDone          = false;

function startHolding() {
    if (hbDone || hbHolding) return;
    hbHolding = true;
    hbSensor.classList.add('active');
    window.romanticAudio.playHeartbeatSFX();

    hbSoundTimer = setInterval(() => window.romanticAudio.playHeartbeatSFX(), 600);

    hbProgressTimer = setInterval(() => {
        hbProgress = Math.min(100, hbProgress + (HB_INTERVAL / HB_DURATION) * 100);
        hbFill.style.width = hbProgress + '%';
        progressBar.setAttribute('aria-valuenow', Math.round(hbProgress));
        hbLabel.textContent = `Syncing… ${Math.round(hbProgress)}%`;

        if (hbProgress >= 100) {
            stopHolding(true);
        }
    }, HB_INTERVAL);
}

function stopHolding(completed = false) {
    hbHolding = false;
    hbSensor.classList.remove('active');
    clearInterval(hbProgressTimer);
    clearInterval(hbSoundTimer);

    if (completed) {
        hbDone = true;
        hbLabel.textContent = '✨ Synced! Our Hearts Beat Together ✨';
        hbSecret.classList.remove('hidden-reveal');
        window.romanticAudio.playSparkleSFX();
        showToast('❤️ Heartbeat synced!');
    } else if (hbProgress < 100) {
        // Reset on release before done
        hbProgress = 0;
        hbFill.style.width = '0%';
        progressBar.setAttribute('aria-valuenow', 0);
        hbLabel.textContent = 'Hold for 3 seconds…';
    }
}

hbSensor.addEventListener('pointerdown', e => { e.preventDefault(); startHolding(); });
hbSensor.addEventListener('pointerup', () => stopHolding());
hbSensor.addEventListener('pointerleave', () => stopHolding());
hbSensor.addEventListener('pointercancel', () => stopHolding());


/* ══════════════════════════════════════════════════════════════════════════
   8. CHAPTER 3 — SCRATCH CARD
══════════════════════════════════════════════════════════════════════════ */

const scratchCanvas = /** @type {HTMLCanvasElement} */ (document.getElementById('scratch-canvas'));
const scratchCtx    = scratchCanvas.getContext('2d');
let isScratching    = false;
let scratchRevealed = false;

function initScratch() {
    const frame = scratchCanvas.closest('.scratch-frame');
    const W2 = frame.clientWidth  || 300;
    const H2 = frame.clientHeight || 260;

    scratchCanvas.width  = W2;
    scratchCanvas.height = H2;
    scratchCtx.globalCompositeOperation = 'source-over';

    // Gold shimmer base
    const grd = scratchCtx.createLinearGradient(0, 0, W2, H2);
    grd.addColorStop(0,   '#d4af37');
    grd.addColorStop(0.5, '#f0d060');
    grd.addColorStop(1,   '#c5921c');
    scratchCtx.fillStyle = grd;
    scratchCtx.fillRect(0, 0, W2, H2);

    // Glitter dots
    for (let i = 0; i < 400; i++) {
        scratchCtx.fillStyle = Math.random() > 0.5
            ? 'rgba(255,250,200,0.55)'
            : 'rgba(100,70,10,0.35)';
        scratchCtx.beginPath();
        scratchCtx.arc(Math.random() * W2, Math.random() * H2, Math.random() * 1.8, 0, Math.PI * 2);
        scratchCtx.fill();
    }

    // Label
    scratchCtx.font = `bold ${Math.floor(W2 * 0.055)}px 'Playfair Display', serif`;
    scratchCtx.fillStyle = 'rgba(40,20,0,0.6)';
    scratchCtx.textAlign = 'center';
    scratchCtx.fillText('✨  S c r a t c h  M e  ✨', W2 / 2, H2 / 2 + 6);
    scratchRevealed = false;
}

function doScratch(cx, cy) {
    if (!isScratching || scratchRevealed) return;
    scratchCtx.globalCompositeOperation = 'destination-out';
    scratchCtx.beginPath();
    scratchCtx.arc(cx, cy, 26, 0, Math.PI * 2);
    scratchCtx.fill();
    checkRevealThreshold();
}

function checkRevealThreshold() {
    if (scratchRevealed) return;
    const { data } = scratchCtx.getImageData(0, 0, scratchCanvas.width, scratchCanvas.height);
    let cleared = 0;
    const step = 16; // sample every 4 pixels
    const total = data.length / (4 * step);
    for (let i = 3; i < data.length; i += 4 * step) {
        if (data[i] < 10) cleared++;
    }
    if (cleared / total > 0.45) {
        scratchRevealed = true;
        scratchCtx.clearRect(0, 0, scratchCanvas.width, scratchCanvas.height);
        window.romanticAudio.playSparkleSFX();
        showToast('💛 Secret revealed!');
    }
}

function getCanvasPos(e) {
    const rect = scratchCanvas.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    const scaleX = scratchCanvas.width  / rect.width;
    const scaleY = scratchCanvas.height / rect.height;
    return {
        x: (src.clientX - rect.left) * scaleX,
        y: (src.clientY - rect.top)  * scaleY,
    };
}

scratchCanvas.addEventListener('mousedown',  e => { isScratching = true; doScratch(...Object.values(getCanvasPos(e))); });
scratchCanvas.addEventListener('mouseup',    () => isScratching = false);
scratchCanvas.addEventListener('mousemove',  e => { if (isScratching) { const p = getCanvasPos(e); doScratch(p.x, p.y); } });
scratchCanvas.addEventListener('touchstart', e => { e.preventDefault(); isScratching = true; const p = getCanvasPos(e); doScratch(p.x, p.y); }, { passive: false });
scratchCanvas.addEventListener('touchend',   () => isScratching = false);
scratchCanvas.addEventListener('touchmove',  e => { e.preventDefault(); const p = getCanvasPos(e); doScratch(p.x, p.y); }, { passive: false });

document.getElementById('btn-scratch-reset').addEventListener('click', initScratch);


/* ══════════════════════════════════════════════════════════════════════════
   9. CHAPTER 4 — STAR CONSTELLATION
══════════════════════════════════════════════════════════════════════════ */

const skyCanvas  = /** @type {HTMLCanvasElement} */ (document.getElementById('sky-canvas'));
const skyCtx     = skyCanvas.getContext('2d');
const starsReveal = document.getElementById('stars-reveal');
const starNodes   = document.querySelectorAll('.star-node');
let nextStarIdx   = 1;
const connectedStars = []; // { x, y } in canvas space

function initConstellationCanvas() {
    const stage = document.getElementById('sky-stage');
    skyCanvas.width  = stage.clientWidth;
    skyCanvas.height = stage.clientHeight;
    connectedStars.length = 0;
    nextStarIdx = 1;
    starsReveal.classList.add('hidden-reveal');
    starNodes.forEach(n => n.classList.remove('lit'));
}

function getStarCanvasPos(node) {
    const skyRect  = skyCanvas.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    return {
        x: nodeRect.left + nodeRect.width  / 2 - skyRect.left,
        y: nodeRect.top  + nodeRect.height / 2 - skyRect.top,
    };
}

function drawConstellationLines() {
    skyCtx.clearRect(0, 0, skyCanvas.width, skyCanvas.height);
    if (connectedStars.length < 2) return;

    skyCtx.save();
    skyCtx.strokeStyle    = '#f4d06f';
    skyCtx.lineWidth      = 2.5;
    skyCtx.shadowColor    = '#f4d06f';
    skyCtx.shadowBlur     = 12;
    skyCtx.lineCap        = 'round';
    skyCtx.lineJoin       = 'round';
    skyCtx.globalAlpha    = 0.85;
    skyCtx.beginPath();
    skyCtx.moveTo(connectedStars[0].x, connectedStars[0].y);
    for (let i = 1; i < connectedStars.length; i++) {
        skyCtx.lineTo(connectedStars[i].x, connectedStars[i].y);
    }
    skyCtx.stroke();
    skyCtx.restore();
}

starNodes.forEach(node => {
    const activate = () => {
        const n = parseInt(node.dataset.n, 10);
        if (n !== nextStarIdx) {
            showToast(`Tap star ${nextStarIdx} next!`);
            return;
        }

        node.classList.add('lit');
        window.romanticAudio.playSparkleSFX();
        spawnTouch(
            node.getBoundingClientRect().left + 22,
            node.getBoundingClientRect().top  + 22,
            8
        );

        const pos = getStarCanvasPos(node);
        connectedStars.push(pos);
        drawConstellationLines();

        nextStarIdx++;
        if (nextStarIdx > starNodes.length) {
            starsReveal.classList.remove('hidden-reveal');
            showToast('🌌 Constellation complete!');
            triggerFireworks(3000);
        }
    };

    node.addEventListener('click', activate);
    node.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') activate(); });
});


/* ══════════════════════════════════════════════════════════════════════════
   10. FIREWORKS ENGINE
══════════════════════════════════════════════════════════════════════════ */

const fwCanvas = /** @type {HTMLCanvasElement} */ (document.getElementById('fireworks-canvas'));
const fwCtx    = fwCanvas.getContext('2d');
const fireworks = [];
let fwTimer = null;

function resizeFW() {
    fwCanvas.width  = window.innerWidth;
    fwCanvas.height = window.innerHeight;
}
resizeFW();
window.addEventListener('resize', resizeFW);

class Spark {
    constructor(x, y, color) {
        const angle  = Math.random() * Math.PI * 2;
        const speed  = Math.random() * 5 + 2;
        this.x       = x;
        this.y       = y;
        this.vx      = Math.cos(angle) * speed;
        this.vy      = Math.sin(angle) * speed;
        this.alpha   = 1;
        this.color   = color;
        this.size    = Math.random() * 3.5 + 1.5;
        this.gravity = 0.08;
        this.trail   = [];
    }

    update() {
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 6) this.trail.shift();
        this.vy   += this.gravity;
        this.x    += this.vx;
        this.y    += this.vy;
        this.vx   *= 0.985;
        this.alpha -= 0.018;
    }

    draw(ctx) {
        ctx.save();
        // Trail
        if (this.trail.length > 1) {
            ctx.strokeStyle = this.color;
            ctx.lineWidth   = this.size * 0.5;
            ctx.globalAlpha = this.alpha * 0.3;
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            this.trail.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
        }
        // Head
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle   = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    isDead() { return this.alpha <= 0; }
}

function burst(x, y) {
    const colors = [
        '#ff4080', '#f4d06f', '#ffb7c5', '#fff',
        '#e63946', '#c0f0ff', '#ffe580', '#ff80b0',
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];
    for (let i = 0; i < 55; i++) {
        fireworks.push(new Spark(x, y, color));
    }
}

function animateFW() {
    if (!fwTimer) return;

    fwCtx.clearRect(0, 0, fwCanvas.width, fwCanvas.height);
    for (let i = fireworks.length - 1; i >= 0; i--) {
        fireworks[i].update();
        fireworks[i].draw(fwCtx);
        if (fireworks[i].isDead()) fireworks.splice(i, 1);
    }

    requestAnimationFrame(animateFW);
}

function triggerFireworks(durationMs = 5000) {
    if (fwTimer) clearInterval(fwTimer);

    const launchInterval = setInterval(() => {
        const x = Math.random() * fwCanvas.width  * 0.8 + fwCanvas.width  * 0.1;
        const y = Math.random() * fwCanvas.height * 0.6;
        burst(x, y);
    }, 250);

    fwTimer = launchInterval;
    animateFW();

    setTimeout(() => {
        clearInterval(launchInterval);
        fwTimer = null;
    }, durationMs);

    window.romanticAudio.playSparkleSFX();
}

document.getElementById('btn-fireworks').addEventListener('click', () => {
    triggerFireworks(6000);
    showToast('🎆 Happy 9 Months! 🎆');
});


/* ══════════════════════════════════════════════════════════════════════════
   11. PERSONALISATION + localStorage
══════════════════════════════════════════════════════════════════════════ */

const inpPartner = /** @type {HTMLInputElement} */ (document.getElementById('inp-partner'));
const inpAuthor  = /** @type {HTMLInputElement} */ (document.getElementById('inp-author'));
const btnSave    = document.getElementById('btn-save-custom');

function applyNames(partner, author) {
    document.querySelectorAll('.partner-name').forEach(el => {
        el.textContent = partner || 'My Love';
    });
    const signEl = document.getElementById('sign-name-display');
    if (signEl) signEl.textContent = author || 'Your Loving Partner';
}

// Load from storage on boot
const savedPartner = localStorage.getItem('anniv_partner') || '';
const savedAuthor  = localStorage.getItem('anniv_author')  || '';
if (savedPartner) { inpPartner.value = savedPartner; }
if (savedAuthor)  { inpAuthor.value  = savedAuthor; }
applyNames(savedPartner || 'My Love', savedAuthor || 'Your Loving Partner');

btnSave.addEventListener('click', () => {
    const partner = inpPartner.value.trim();
    const author  = inpAuthor.value.trim();
    localStorage.setItem('anniv_partner', partner);
    localStorage.setItem('anniv_author',  author);
    applyNames(partner || 'My Love', author || 'Your Loving Partner');
    closeOverlay('overlay-customizer');
    window.romanticAudio.playSparkleSFX();
    showToast('✨ Card personalised!');
});


/* ══════════════════════════════════════════════════════════════════════════
   12. TOAST NOTIFICATION
══════════════════════════════════════════════════════════════════════════ */

const toastEl = document.getElementById('toast');
let toastTimeout = null;

function showToast(msg, ms = 2400) {
    if (toastTimeout) clearTimeout(toastTimeout);
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    toastTimeout = setTimeout(() => toastEl.classList.remove('show'), ms);
}

}); // end DOMContentLoaded
