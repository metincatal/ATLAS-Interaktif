/**
 * Ülke profili (Atlas çekmecesi)
 */

import { icon } from '../core/icons.js';
import { esc } from '../core/dom.js';
import {
    db,
    country,
    countryName,
    histName,
    capitalAt,
    corridorAt,
    corridorSeries,
    corridorYear,
    corridorRange,
    flagHTML,
    loadWGI,
    wgiAt,
    wgiSeries,
    loadVdem,
    vdemAt,
} from '../core/data.js';
import { TYPES, typeChip } from '../core/theory.js';
import { signed, num, pct, pctPoss, suffix } from '../core/format.js';
import { countryStory } from '../core/narrative.js';
import { href } from '../core/router.js';
import { CorridorChart, corridorTipHTML } from './corridor-chart.js';
import { sparkline } from './sparkline.js';
import { openAssistant } from './assistant.js';

const WGI_ORDER = ['cc', 'rl', 'ge', 'rq', 'va', 'pv'];
const VDEM_KEYS = ['v2x_libdem', 'v2x_freexp_altinf', 'v2xcs_ccsi', 'v2x_jucon', 'v2x_corr'];

const REGION_TR = {
    'Western Asia': 'Batı Asya', 'Southern Asia': 'Güney Asya', 'Eastern Asia': 'Doğu Asya', 'South-Eastern Asia': 'Güneydoğu Asya',
    'Central Asia': 'Orta Asya', 'Northern Europe': 'Kuzey Avrupa', 'Western Europe': 'Batı Avrupa', 'Southern Europe': 'Güney Avrupa',
    'Eastern Europe': 'Doğu Avrupa', 'Northern Africa': 'Kuzey Afrika', 'Western Africa': 'Batı Afrika', 'Eastern Africa': 'Doğu Afrika',
    'Middle Africa': 'Orta Afrika', 'Southern Africa': 'Güney Afrika', 'Northern America': 'Kuzey Amerika', 'Central America': 'Orta Amerika',
    Caribbean: 'Karayipler', 'South America': 'Güney Amerika', 'Australia and New Zealand': 'Avustralya ve Yeni Zelanda',
    Melanesia: 'Melanezya', Micronesia: 'Mikronezya', Polynesia: 'Polinezya', Antarctica: 'Antarktika', 'Seven seas (open ocean)': 'Açık deniz',
};

export class CountryProfile {
    constructor(el, { onClose, onYear }) {
        this.el = el;
        this.onClose = onClose;
        this.onYear = onYear;
        this.id = null;
        this.year = null;
        this.chart = null;
        this.wgiReady = false;
        this.vdemReady = false;
        el.addEventListener('click', (e) => {
            const a = e.target.closest('[data-act]');
            if (!a) return;
            if (a.dataset.act === 'close') this.onClose?.();
            if (a.dataset.act === 'ask') openAssistant();
        });
    }

    async show(id, year) {
        const changedCountry = id !== this.id;
        this.id = id;
        this.year = year;
        if (changedCountry) this._renderShell();
        this._update();
        if (!this.wgiReady) {
            loadWGI().then(() => {
                this.wgiReady = true;
                this._update();
            });
        }
        if (!this.vdemReady) {
            Promise.all(VDEM_KEYS.map((k) => loadVdem(k))).then(() => {
                this.vdemReady = true;
                this._update();
            });
        }
    }

    setYear(year) {
        if (!this.id) return;
        this.year = year;
        this._update();
    }

    _renderShell() {
        const c = country(this.id) || { tr: this.id };
        const region = REGION_TR[c.region] || c.region || '';
        this.chart?.destroy();
        this.el.innerHTML = `
            <div class="profile-head">
                ${flagHTML(this.id, 'flag-lg')}
                <div class="grow">
                    <h2 class="title-1 profile-name">${esc(countryName(this.id))}</h2>
                    <div class="tiny faint" data-sub>${esc(region)}</div>
                </div>
                <button class="icon-btn plain" type="button" data-act="close" aria-label="Profili kapat">${icon('x')}</button>
            </div>
            <div class="profile-body">
                <div class="row profile-type" data-type></div>
                <div class="profile-chart-wrap">
                    <div class="profile-chart" data-chart></div>
                    <div class="profile-chart-cap tiny faint" data-chart-cap></div>
                </div>
                <div class="profile-metrics" data-metrics></div>
                <section class="stack" style="gap:8px" data-wgi-wrap>
                    <div class="row" style="justify-content:space-between"><span class="eyebrow">Yönetişim · WGI</span><span class="tiny faint">−2,5 … +2,5</span></div>
                    <div class="profile-wgi" data-wgi><div class="tiny faint">Yükleniyor…</div></div>
                </section>
                <section class="stack" style="gap:8px">
                    <div class="row" style="justify-content:space-between"><span class="eyebrow">Demokrasi · V-Dem</span><span class="tiny faint">0 … 1</span></div>
                    <div class="profile-vdem" data-vdem><div class="tiny faint">Yükleniyor…</div></div>
                </section>
                <section class="stack" style="gap:8px">
                    <span class="eyebrow">Veriden okuma</span>
                    <div class="profile-story" data-story></div>
                </section>
            </div>
            <div class="profile-actions" data-actions></div>`;
        const chartEl = this.el.querySelector('[data-chart]');
        this.chart = new CorridorChart(chartEl, {
            variant: 'mini',
            pointRadius: 2.4,
            regionLabels: true,
            baseOpacity: 0.32,
            tooltip: (p) => corridorTipHTML(p),
            ariaLabel: `${countryName(this.id)} koridor rotası`,
        });
    }

    _update() {
        const id = this.id;
        const year = this.year;
        if (!id) return;
        const c = country(id) || {};
        const p = corridorAt(id, year, 3);
        const range = corridorRange(id);

        // Alt başlık: bölge, tarihî ad, başkent
        const region = REGION_TR[c.region] || c.region || '';
        const hist = histName(id, year);
        const cap = capitalAt(id, year);
        const subParts = [region, hist && hist !== countryName(id) ? `${year}: ${hist}` : null, cap ? `Başkent ${cap.name}` : null].filter(Boolean);
        this.el.querySelector('[data-sub]').textContent = subParts.join(' · ');

        // Tip rozeti
        const typeEl = this.el.querySelector('[data-type]');
        if (p) {
            const series = corridorSeries(id);
            const share = series.filter((s) => s.type === p.type).length / series.length;
            typeEl.innerHTML = `${typeChip(p.type)}<span class="tiny faint">${p.year}${p.exact ? '' : ' (en yakın veri)'} · gözlemlerin ${pct(share)}’${pctPoss(share)} bu bölgede</span>`;
        } else {
            typeEl.innerHTML = `${typeChip(null)}<span class="tiny faint">${range ? `Koridor verisi ${range[0]}–${range[1]} arasında` : 'Bu ülke için koridor verisi yok'}</span>`;
        }

        // Mini grafik: son 30 yıllık rota
        const from = Math.max(range ? range[0] : year, year - 30);
        const trail = corridorSeries(id).filter((s) => s.year >= from && s.year <= year);
        const pts = corridorYear(p ? p.year : year).map((q) => ({ ...q }));
        this.chart.setPoints(pts, { duration: 0 });
        this.chart.setEmphasis(p ? [id] : []);
        this.chart.setTrails(trail.length > 1 ? [{ id, points: trail }] : []);
        this.el.querySelector('[data-chart-cap]').textContent = trail.length > 1 ? `${trail[0].year}–${trail[trail.length - 1].year} rotası; soluk noktalar aynı yıldaki diğer ülkeler` : 'Soluk noktalar aynı yıldaki diğer ülkeler';

        // Metrikler
        const base = p ? corridorSeries(id).filter((s) => s.year <= p.year - 10).pop() : null;
        const metric = (label, val, prev) => {
            const d = prev === null || prev === undefined ? null : val - prev;
            const cls = d === null ? '' : d > 0.02 ? 'pos' : d < -0.02 ? 'neg' : 'faint';
            return `<div class="metric"><span class="tiny faint">${label}</span><span class="metric-val">${val === null ? '—' : signed(val)}</span>${
                d === null ? '<span class="tiny faint">&nbsp;</span>' : `<span class="tiny ${cls} row" style="gap:4px">${icon(d >= 0 ? 'trendUp' : 'trendDown', 'icon-sm')}${signed(d)} <span class="faint">${suffix(base.year, 'e')} göre</span></span>`
            }</div>`;
        };
        this.el.querySelector('[data-metrics]').innerHTML = p ? metric('Devletin gücü', p.y, base?.y) + metric('Toplumun gücü', p.x, base?.x) : '';

        // WGI
        const wgiEl = this.el.querySelector('[data-wgi]');
        if (this.wgiReady) {
            const meta = db.meta.wgi;
            const cells = WGI_ORDER.map((k) => {
                const series = wgiSeries(k, id);
                if (!series.length) return '';
                const v = wgiAt(k, id, Math.min(year, 2023));
                const inRange = year >= 1996;
                return `<div class="spark-cell" title="${esc(meta[k].desc)}">
                    <div class="row" style="justify-content:space-between;gap:6px"><span class="tiny muted">${meta[k].short}</span><span class="mono tiny ${v !== null && v < 0 ? 'neg' : ''}">${inRange && v !== null ? signed(v) : '—'}</span></div>
                    ${sparkline(series, { width: 150, height: 28, domain: [-2.5, 2.5], zero: 0, xDomain: [1996, 2023], marker: inRange ? Math.min(year, 2023) : null })}
                </div>`;
            }).join('');
            wgiEl.innerHTML = cells || '<div class="tiny faint">Bu ülke için WGI verisi yok.</div>';
            if (cells && year < 1996) wgiEl.insertAdjacentHTML('afterbegin', '<div class="tiny faint" style="grid-column:1/-1">WGI 1996’dan itibaren yayımlanıyor; çizgiler tüm dönemi gösterir.</div>');
        }

        // V-Dem
        const vdemEl = this.el.querySelector('[data-vdem]');
        if (this.vdemReady) {
            const meta = db.meta.vdem;
            const world = (k) => {
                const vals = corridorYear(p ? p.year : year).map((q) => vdemAt(k, q.id, year)).filter((v) => v !== null).sort((a, b) => a - b);
                return vals.length ? vals[Math.floor(vals.length / 2)] : null;
            };
            const rows = VDEM_KEYS.map((k) => {
                const v = vdemAt(k, id, year);
                if (v === null) return '';
                const med = world(k);
                const good = meta[k].invert ? 1 - v : v;
                const color = good >= 0.6 ? 'var(--shackled)' : good >= 0.35 ? 'var(--paper)' : 'var(--despotic)';
                return `<div class="vdem-row" title="${esc(meta[k].desc)}">
                    <span class="small muted">${meta[k].label}</span>
                    <span class="vdem-bar"><span style="width:${v * 100}%;background:${color}"></span>${med !== null ? `<i style="left:${med * 100}%" title="Dünya medyanı"></i>` : ''}</span>
                    <span class="mono tiny">${num(v, 2)}</span>
                </div>`;
            }).join('');
            vdemEl.innerHTML = rows ? `${rows}<div class="tiny faint row" style="gap:6px"><i class="median-key"></i>dikey çizgi: o yılın dünya medyanı</div>` : '<div class="tiny faint">Bu yıl için V-Dem verisi yok.</div>';
        }

        // Anlatı
        const story = countryStory(id, year);
        this.el.querySelector('[data-story]').innerHTML = story.sentences.map((s) => `<p>${esc(s)}</p>`).join('');

        // Eylemler
        const gameOk = c.game && p;
        this.el.querySelector('[data-actions]').innerHTML = `
            <a class="btn btn-secondary btn-sm" href="${href('/koridor', { c: id, y: p ? p.year : year })}">${icon('corridor')}Koridorda incele</a>
            ${gameOk ? `<a class="btn btn-primary btn-sm" href="${href('/oyun', { c: id, y: p.year })}">${icon('scale')}Bu ülkeyle oyna</a>` : ''}
            <button class="icon-btn" type="button" data-act="ask" aria-label="Asistana sor">${icon('chat')}</button>`;
    }

    destroy() {
        this.chart?.destroy();
        this.el.innerHTML = '';
    }
}

