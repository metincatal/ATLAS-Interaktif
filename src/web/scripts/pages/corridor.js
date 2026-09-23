/**
 * Dar Koridor Gözlemevi — tüm ülkeler devlet–toplum düzleminde, zaman içinde
 */

import { icon } from '../core/icons.js';
import { esc, Disposer } from '../core/dom.js';
import { db, loadCore, corridorYear, corridorSeries, corridorAt, typeCounts, countryName, flagHTML } from '../core/data.js';
import { TYPES, TYPE_ORDER } from '../core/theory.js';
import { pct, suffix } from '../core/format.js';
import { replaceParams, href } from '../core/router.js';
import { setContext } from '../core/store.js';
import { CorridorChart, corridorTipHTML } from '../components/corridor-chart.js';
import { Timeline } from '../components/timeline.js';
import { openSearch, setSearchHandler } from '../components/search.js';
import { toast } from '../components/toast.js';
import { hideTip } from '../components/tooltip.js';

const MAX_TRACKED = 8;
const TRAILS = [
    { key: '10', label: '10 yıl', years: 10 },
    { key: '30', label: '30 yıl', years: 30 },
    { key: 'all', label: 'Tümü', years: 999 },
];

export async function mount(root, params) {
    await loadCore();
    const page = new CorridorPage(root, params);
    page.init();
    return page;
}

class CorridorPage {
    constructor(root, params) {
        this.root = root;
        this.year = clampYear(Number(params.y) || db.lastYear);
        const ids = (params.c || 'TUR').split(',').filter((id) => db.corridor.series[id]);
        this.tracked = ids.slice(0, MAX_TRACKED);
        this.trailKey = TRAILS.some((t) => t.key === params.t) ? params.t : '30';
        this.filter = new Set(TYPE_ORDER);
        this.d = new Disposer();
    }

    init() {
        this.root.classList.add('corridor-page');
        this.root.innerHTML = `
            <header class="cp-head">
                <div class="stack" style="gap:4px">
                    <h1 class="title-1">Dar Koridor Gözlemevi</h1>
                    <p class="small faint">${db.firstYear}–${db.lastYear} · ${Object.keys(db.corridor.series).length} ülke · Devletin ve toplumun gücü, yıllık göreli puanlar</p>
                </div>
                <div class="cp-tools">
                    <button class="field cp-add" type="button" data-add>${icon('search', 'icon-sm')}<span>Ülke ekle ve rotasını izle…</span></button>
                    <div class="segmented compact" role="group" aria-label="Rota uzunluğu">
                        ${TRAILS.map((t) => `<button type="button" data-trail="${t.key}" aria-pressed="${t.key === this.trailKey}">${t.label}</button>`).join('')}
                    </div>
                </div>
            </header>
            <div class="cp-main">
                <div class="card cp-chart-card">
                    <div class="cp-watermark serif" data-watermark aria-hidden="true">${this.year}</div>
                    <div class="cp-chart" data-chart></div>
                </div>
                <aside class="cp-side">
                    <section class="card card-pad stack" style="gap:10px" aria-labelledby="cp-dist-title">
                        <div class="card-title"><span id="cp-dist-title" data-dist-title></span><button class="hint link-btn" type="button" data-reset hidden>Tümünü göster</button></div>
                        <div class="stack" style="gap:6px" data-dist></div>
                    </section>
                    <section class="card card-pad stack" style="gap:10px" aria-labelledby="cp-track-title">
                        <div class="card-title"><span id="cp-track-title">İzlenen ülkeler</span><span class="hint" data-track-count></span></div>
                        <ul class="cp-tracked" data-tracked></ul>
                        <p class="tiny faint">Grafikte bir noktaya tıklayarak da ülke ekleyebilirsiniz.</p>
                    </section>
                    <section class="card card-pad cp-help">
                        ${icon('info')}
                        <p class="small muted">Sağa gidildikçe toplum, yukarı çıkıldıkça devlet güçlenir. Puanlar her yıl dünya ortalamasına göre hesaplanır. Arka plandaki dört bölge, verideki dört kümenin sınırlarıdır. <a href="#/kuram">Yöntemi okuyun</a>.</p>
                    </section>
                </aside>
            </div>
            <div class="card cp-timeline" data-timeline></div>`;

        this.chart = new CorridorChart(this.root.querySelector('[data-chart]'), {
            pointRadius: 5.2,
            tooltip: (p) => corridorTipHTML(p, `<div class="tip-hint">${this.tracked.includes(p.id) ? 'İzleniyor · kaldırmak için tıklayın' : 'Rotasını izlemek için tıklayın'}</div>`),
            onClick: (p) => this.toggleTrack(p.id),
        });

        this.timeline = new Timeline(this.root.querySelector('[data-timeline]'), {
            min: db.firstYear,
            max: db.lastYear,
            value: this.year,
            highlightFrom: 1996,
            highlightLabel: 'WGI + V-Dem',
            onChange: (y, info) => this.setYear(y, info),
        });

        this.root.querySelector('[data-add]').addEventListener('click', () => this.openAdd());
        this.root.querySelectorAll('[data-trail]').forEach((b) =>
            b.addEventListener('click', () => {
                this.trailKey = b.dataset.trail;
                this.root.querySelectorAll('[data-trail]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
                this.renderTrails();
                this.syncUrl();
            }),
        );
        this.root.querySelector('[data-reset]').addEventListener('click', () => {
            this.filter = new Set(TYPE_ORDER);
            this.chart.setFilter(null);
            this.renderDist();
        });
        this.root.querySelector('[data-tracked]').addEventListener('click', (e) => {
            const rm = e.target.closest('[data-remove]');
            if (rm) this.toggleTrack(rm.dataset.remove);
        });
        this.root.querySelector('[data-dist]').addEventListener('click', (e) => {
            const b = e.target.closest('[data-type]');
            if (!b) return;
            const t = b.dataset.type;
            if (this.filter.size === 4) this.filter = new Set([t]);
            else if (this.filter.has(t)) this.filter.delete(t);
            else this.filter.add(t);
            if (!this.filter.size) this.filter = new Set(TYPE_ORDER);
            this.chart.setFilter(this.filter.size === 4 ? null : this.filter);
            this.renderDist();
        });
        this.d.on(document, 'keydown', (e) => {
            const typing = /INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement?.tagName);
            if (document.querySelector('.overlay')) return;
            if (e.key === ' ' && !typing) {
                e.preventDefault();
                this.timeline.playing ? this.timeline.pause() : this.timeline.play();
            } else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !typing) {
                e.preventDefault();
                this.timeline.pause();
                this.timeline.setValue(this.year + (e.key === 'ArrowRight' ? 1 : -1));
            }
        });
        setSearchHandler((id) => this.toggleTrack(id, { forceAdd: true }));
        this.d.add(() => setSearchHandler(null));

        this.render(0);
        this.syncUrl();
    }

    // ------------------------------------------------------------------
    setYear(year, info = {}) {
        this.year = year;
        this.render(info.playing ? Math.max(0, info.stepMs * 0.9) : 350);
        if (!info.playing) this.syncUrl();
    }

    render(duration) {
        const points = corridorYear(this.year);
        this.chart.setPoints(points, { duration });
        this.chart.setEmphasis(this.tracked);
        this.chart.setAriaLabel(`${this.year} yılında ${points.length} ülkenin dar koridor düzlemindeki konumu`);
        this.root.querySelector('[data-watermark]').textContent = this.year;
        this.renderTrails();
        this.renderDist();
        this.renderTracked();
    }

    renderTrails() {
        const len = TRAILS.find((t) => t.key === this.trailKey).years;
        this.chart.setTrails(
            this.tracked.map((id) => ({
                id,
                points: corridorSeries(id).filter((p) => p.year <= this.year && p.year > this.year - len),
            })),
        );
    }

    renderDist() {
        const counts = typeCounts(this.year);
        const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
        const max = Math.max(...Object.values(counts), 1);
        this.root.querySelector('[data-dist-title]').textContent = `${suffix(this.year, 'de')} dağılım`;
        this.root.querySelector('[data-reset]').hidden = this.filter.size === 4;
        this.root.querySelector('[data-dist]').innerHTML = TYPE_ORDER.map((t) => {
            const on = this.filter.has(t);
            return `<button class="dist-row t-${t}" type="button" data-type="${t}" aria-pressed="${on && this.filter.size < 4}" style="opacity:${on ? 1 : 0.45}">
                <span class="row" style="gap:9px;width:100%"><span class="swatch"></span><span class="grow">${TYPES[t].long}</span><span class="mono">${counts[t]}</span><span class="mono faint" style="width:36px;text-align:right">${pct(counts[t] / total)}</span></span>
                <span class="meter" style="--m:var(--t)"><span style="width:${(counts[t] / max) * 100}%"></span></span>
            </button>`;
        }).join('');
    }

    renderTracked() {
        const list = this.root.querySelector('[data-tracked]');
        this.root.querySelector('[data-track-count]').textContent = `${this.tracked.length} / ${MAX_TRACKED}`;
        if (!this.tracked.length) {
            list.innerHTML = '<li class="tiny faint">Henüz ülke eklenmedi.</li>';
            return;
        }
        const len = TRAILS.find((t) => t.key === this.trailKey).years;
        list.innerHTML = this.tracked
            .map((id) => {
                const p = corridorAt(id, this.year);
                const s = corridorSeries(id).filter((q) => q.year <= this.year && q.year > this.year - len);
                const range = s.length > 1 ? `rota ${s[0].year}–${s[s.length - 1].year}` : p ? '' : 'bu yıl verisi yok';
                return `<li class="cp-track ${p ? `t-${p.type}` : ''}">
                    ${flagHTML(id)}
                    <span class="grow stack" style="gap:1px">
                        <a class="cp-track-name" href="${href('/atlas', { c: id, y: p ? p.year : this.year })}" title="Atlas’ta profili aç">${esc(countryName(id))}</a>
                        <span class="tiny" style="color:var(--t-text, var(--text-3))">${p ? TYPES[p.type].short : '—'}${range ? ` · <span class="faint">${range}</span>` : ''}</span>
                    </span>
                    <button class="icon-btn plain" type="button" data-remove="${id}" aria-label="${esc(countryName(id))} izlemeyi bırak">${icon('x', 'icon-sm')}</button>
                </li>`;
            })
            .join('');
    }

    toggleTrack(id, { forceAdd = false } = {}) {
        if (!db.corridor.series[id]) {
            toast(`${countryName(id)} için koridor verisi yok.`);
            return;
        }
        if (this.tracked.includes(id)) {
            if (forceAdd) return;
            this.tracked = this.tracked.filter((x) => x !== id);
        } else {
            if (this.tracked.length >= MAX_TRACKED) {
                toast(`En fazla ${MAX_TRACKED} ülke izlenebilir. Önce listeden birini kaldırın.`);
                return;
            }
            this.tracked = [...this.tracked, id];
            const p = corridorAt(id, this.year);
            if (!p) toast(`${countryName(id)} için ${this.year} verisi yok; zamanı değiştirince görünecek.`);
        }
        hideTip();
        this.chart.setEmphasis(this.tracked);
        this.renderTrails();
        this.renderTracked();
        this.syncUrl();
        setContext({ country: this.tracked[this.tracked.length - 1] || null, year: this.year });
    }

    openAdd() {
        openSearch({
            title: 'İzlenecek ülke',
            placeholder: 'İzlenecek ülkeyi yazın…',
            filter: (id) => Boolean(db.corridor.series[id]),
            onPick: (id) => this.toggleTrack(id, { forceAdd: true }),
        });
    }

    syncUrl() {
        replaceParams({ y: this.year, c: this.tracked.join(',') || null, t: this.trailKey === '30' ? null : this.trailKey });
    }

    update(params) {
        const y = Number(params.y);
        if (y && y !== this.year) this.timeline.setValue(clampYear(y));
        const ids = (params.c || '').split(',').filter((id) => db.corridor.series[id]);
        if (ids.join(',') !== this.tracked.join(',') && ids.length) {
            this.tracked = ids.slice(0, MAX_TRACKED);
            this.render(0);
        }
    }

    unmount() {
        this.timeline.destroy();
        this.chart.destroy();
        this.d.dispose();
        this.root.classList.remove('corridor-page');
    }
}

function clampYear(y) {
    return Math.max(db.firstYear, Math.min(db.lastYear, Math.round(y)));
}

