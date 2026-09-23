/**
 * Yıl zaman çizelgesi: oynat/duraklat, hız, kaydırıcı ve yıl işaretleri
 */

import { icon } from '../core/icons.js';
import { prefersReducedMotion } from '../core/dom.js';

const SPEEDS = [
    { label: '1×', ms: 180 },
    { label: '2×', ms: 90 },
    { label: '4×', ms: 45 },
];

export class Timeline {
    constructor(el, { min, max, value, highlightFrom = null, highlightLabel = '', onChange = () => {}, showSpeed = true, label = 'Yıl' }) {
        this.el = el;
        this.min = min;
        this.max = max;
        this.value = value ?? max;
        this.highlightFrom = highlightFrom;
        this.highlightLabel = highlightLabel;
        this.onChange = onChange;
        this.speed = 0;
        this.timer = null;
        this.playing = false;

        el.classList.add('timeline');
        el.innerHTML = `
            <button type="button" class="play-btn" data-play aria-label="Zamanı oynat">${icon('play')}</button>
            ${showSpeed ? `<button type="button" class="speed" data-speed aria-label="Oynatma hızı">1×</button>` : ''}
            <div class="timeline-year mono" aria-live="off"><span data-year>${this.value}</span></div>
            <div class="timeline-track">
                <label class="sr-only" for="tl-${this.uid()}">${label}</label>
                <input id="tl-${this.uid()}" class="range" type="range" step="1" min="${min}" max="${max}" value="${this.value}" data-range>
                <div class="timeline-ticks" data-ticks></div>
            </div>`;
        this.btn = el.querySelector('[data-play]');
        this.speedBtn = el.querySelector('[data-speed]');
        this.range = el.querySelector('[data-range]');
        this.yearEl = el.querySelector('[data-year]');
        this.ticks = el.querySelector('[data-ticks]');

        this.btn.addEventListener('click', () => (this.playing ? this.pause() : this.play()));
        this.speedBtn?.addEventListener('click', () => {
            this.speed = (this.speed + 1) % SPEEDS.length;
            this.speedBtn.textContent = SPEEDS[this.speed].label;
            if (this.playing) {
                this.pause();
                this.play();
            }
        });
        this.range.addEventListener('input', () => {
            this.pause();
            this._set(Number(this.range.value), 'input');
        });
        this._paint();
    }

    uid() {
        if (!this._uid) this._uid = Math.random().toString(36).slice(2, 8);
        return this._uid;
    }

    setRange(min, max, { highlightFrom = this.highlightFrom } = {}) {
        this.min = min;
        this.max = max;
        this.highlightFrom = highlightFrom;
        this.range.min = min;
        this.range.max = max;
        const clamped = Math.max(min, Math.min(max, this.value));
        this._paint();
        if (clamped !== this.value) this._set(clamped, 'range');
    }

    setValue(year, { silent = false } = {}) {
        const y = Math.max(this.min, Math.min(this.max, Math.round(year)));
        if (silent) {
            this.value = y;
            this.range.value = y;
            this.yearEl.textContent = y;
            this._paintTrack();
        } else {
            this._set(y, 'set');
        }
    }

    _set(year, source) {
        this.value = year;
        this.range.value = year;
        this.yearEl.textContent = year;
        this._paintTrack();
        this.onChange(year, { source, playing: this.playing, stepMs: SPEEDS[this.speed].ms });
    }

    play() {
        if (this.playing) return;
        if (this.value >= this.max) this._set(this.min, 'play');
        this.playing = true;
        this.btn.innerHTML = icon('pause');
        this.btn.setAttribute('aria-label', 'Duraklat');
        const ms = prefersReducedMotion() ? 400 : SPEEDS[this.speed].ms;
        this.timer = setInterval(() => {
            if (this.value >= this.max) {
                this.pause();
                return;
            }
            this._set(this.value + 1, 'play');
        }, ms);
    }

    pause() {
        if (!this.playing) return;
        this.playing = false;
        clearInterval(this.timer);
        this.timer = null;
        this.btn.innerHTML = icon('play');
        this.btn.setAttribute('aria-label', 'Zamanı oynat');
        this.onChange(this.value, { source: 'pause', playing: false, stepMs: 0 });
    }

    _paint() {
        const span = this.max - this.min;
        const step = span > 150 ? 50 : span > 60 ? 25 : span > 24 ? 5 : span > 10 ? 2 : 1;
        const first = Math.ceil(this.min / step) * step;
        const marks = [];
        for (let y = first; y <= this.max; y += step) marks.push(y);
        this.ticks.innerHTML = marks
            .filter((y) => (y - this.min) / span > 0.03 && (this.max - y) / span > 0.03)
            .map((y) => `<span style="left:${((y - this.min) / span) * 100}%">${y}</span>`)
            .join('');
        if (this.highlightFrom && this.highlightFrom > this.min && this.highlightLabel) {
            const left = ((this.highlightFrom - this.min) / span) * 100;
            this.ticks.insertAdjacentHTML('beforeend', `<span class="mark" style="left:${left}%;top:-30px">${this.highlightLabel}</span>`);
        }
        this._paintTrack();
    }

    _paintTrack() {
        const span = this.max - this.min || 1;
        const cur = ((this.value - this.min) / span) * 100;
        const base = 'var(--ink-3)';
        const done = 'rgba(237,232,223,0.5)';
        let bg = `linear-gradient(to right, ${done} 0 ${cur}%, ${base} ${cur}% 100%)`;
        if (this.highlightFrom && this.highlightFrom > this.min) {
            const h = ((this.highlightFrom - this.min) / span) * 100;
            bg = `linear-gradient(to right, ${done} 0 ${Math.min(cur, h)}%, ${cur > h ? 'rgba(134,174,255,0.75)' : base} ${Math.min(cur, h)}% ${Math.max(cur, h)}%, rgba(134,174,255,${cur > h ? 0.25 : 0.25}) ${Math.max(cur, h)}% 100%)`;
            if (cur < h) bg = `linear-gradient(to right, ${done} 0 ${cur}%, ${base} ${cur}% ${h}%, rgba(134,174,255,0.25) ${h}% 100%)`;
        }
        this.range.style.setProperty('--track', bg);
    }

    destroy() {
        clearInterval(this.timer);
        this.el.innerHTML = '';
    }
}
