/**
 * Atlas — küre ya da düz harita üzerinde katmanlar, zaman ve ülke profili
 */

import { icon } from '../core/icons.js';
import { esc, Disposer, isMobile, prefersReducedMotion, rafThrottle } from '../core/dom.js';
import {
    db,
    loadCore,
    loadWorld,
    loadWGI,
    loadVdem,
    corridorAt,
    wgiAt,
    vdemAt,
    country,
    countryName,
    histName,
    typeCounts,
    borderMilestoneFor,
    loadBorders,
    capitalAt,
} from '../core/data.js';
import { TYPES, TYPE_ORDER } from '../core/theory.js';
import { signed, num } from '../core/format.js';
import { replaceParams } from '../core/router.js';
import { setContext } from '../core/store.js';
import { Timeline } from '../components/timeline.js';
import { CountryProfile } from '../components/country-profile.js';
import { showTip, moveTip, hideTip } from '../components/tooltip.js';
import { toast } from '../components/toast.js';
import { setSearchHandler } from '../components/search.js';

const GLOBE_SRC = 'https://cdn.jsdelivr.net/npm/globe.gl@2.46.2/dist/globe.gl.min.js';
const NODATA = '#262C37';
const STROKE = 'rgba(10,13,18,0.9)';
const IVORY = '#EDE8DF';

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing && window.Globe) return resolve();
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Küre kütüphanesi yüklenemedi'));
        document.head.append(s);
    });
}

function webglAvailable() {
    try {
        const c = document.createElement('canvas');
        return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
        return false;
    }
}

function buildLayers(wgiYears) {
    const L = {
        type: { id: 'type', group: 'corridor', label: 'Leviathan tipi', kind: 'cat', range: [db.firstYear, db.lastYear], desc: 'Ülkenin, verideki dört kümeye göre Leviathan tipi.', source: 'ATLAS analizi (V-Dem, WGI)' },
        state: { id: 'state', group: 'corridor', label: 'Devletin gücü', kind: 'div', domain: [-2.5, 2.5], range: [db.firstYear, db.lastYear], desc: 'Yönetişim göstergelerinden türetilen faktör puanı; o yılın dünya ortalamasına göre.', source: 'ATLAS analizi (V-Dem, WGI)' },
        society: { id: 'society', group: 'corridor', label: 'Toplumun gücü', kind: 'div', domain: [-2.5, 2.5], range: [db.firstYear, db.lastYear], desc: 'Sivil alan göstergelerinden türetilen faktör puanı; o yılın dünya ortalamasına göre.', source: 'ATLAS analizi (V-Dem, WGI)' },
    };
    for (const [k, m] of Object.entries(db.meta.wgi)) {
        L[`wgi:${k}`] = { id: `wgi:${k}`, key: k, group: 'wgi', label: m.label, kind: 'div', domain: [-2.5, 2.5], range: [wgiYears[0], wgiYears[wgiYears.length - 1]], desc: m.desc, source: 'Dünya Bankası, Worldwide Governance Indicators' };
    }
    for (const [k, m] of Object.entries(db.meta.vdem)) {
        L[`vdem:${k}`] = { id: `vdem:${k}`, key: k, group: 'vdem', label: m.label, kind: 'seq', domain: [0, 1], range: [m.start, m.end], invert: Boolean(m.invert), desc: m.desc, source: 'V-Dem v15' };
    }
    return L;
}

export async function mount(root, params) {
    await loadCore();
    const [world, wgi] = await Promise.all([loadWorld(), loadWGI()]);
    const page = new AtlasPage(root, world, wgi, params);
    await page.init();
    return page;
}

class AtlasPage {
    constructor(root, world, wgi, params) {
        this.root = root;
        this.world = world;
        this.d3 = window.d3;
        this.layers = buildLayers(wgi.years);
        this.layerId = this.layers[params.l] ? params.l : 'type';
        this.year = Number(params.y) || db.lastYear;
        this.selected = params.c && country(params.c) ? params.c : null;
        this.view = params.v === 'flat' || !webglAvailable() ? 'flat' : 'globe';
        this.showBorders = params.b === '1';
        this.hover = null;
        this.rotating = !prefersReducedMotion();
        this.d = new Disposer();
        this.borderCache = new Map();
        this.divScale = this.d3.scaleSequential((t) => this.d3.interpolateRdYlBu(t)).domain([-2.5, 2.5]).clamp(true);
        this.seqColor = (t) => this.d3.interpolatePlasma(0.1 + 0.85 * Math.max(0, Math.min(1, t)));
    }

    get layer() {
        return this.layers[this.layerId];
    }

    async init() {
        this.root.classList.add('page-full', 'atlas');
        this.root.innerHTML = `
            <div class="atlas-bg" aria-hidden="true"></div>
            <div class="atlas-stage" data-stage>
                <div class="atlas-globe" data-globe></div>
                <div class="atlas-flat" data-flat hidden></div>
            </div>
            <aside class="atlas-panel glass" data-panel aria-label="Harita katmanları"></aside>
            <div class="atlas-tools" role="toolbar" aria-label="Harita denetimleri">
                <div class="tool-group" role="group" aria-label="Görünüm">
                    <button class="icon-btn" type="button" data-view="globe" aria-label="Küre görünümü">${icon('globe')}</button>
                    <button class="icon-btn" type="button" data-view="flat" aria-label="Düz harita">${icon('map')}</button>
                </div>
                <button class="icon-btn" type="button" data-zoom="in" aria-label="Yakınlaş">${icon('plus')}</button>
                <button class="icon-btn" type="button" data-zoom="out" aria-label="Uzaklaş">${icon('minus')}</button>
                <button class="icon-btn" type="button" data-rotate aria-label="Dönmeyi durdur">${icon('pause')}</button>
                <button class="icon-btn mobile-only" type="button" data-panel-toggle aria-label="Katmanlar" aria-expanded="false">${icon('layers')}</button>
            </div>
            <aside class="atlas-profile glass" data-profile aria-label="Ülke profili" hidden></aside>
            <div class="atlas-bottom">
                <div class="atlas-hint" data-hint>${icon('info', 'icon-sm')}Bir ülkeye tıklayın ya da <kbd>/</kbd> ile arayın</div>
                <div class="atlas-timeline glass" data-timeline></div>
            </div>`;

        this.stage = this.root.querySelector('[data-stage]');
        this.panel = this.root.querySelector('[data-panel]');
        this.profileEl = this.root.querySelector('[data-profile]');
        this.profile = new CountryProfile(this.profileEl, { onClose: () => this.select(null) });

        this.renderPanel();
        this.bindTools();

        const L = this.layer;
        this.year = Math.max(L.range[0], Math.min(L.range[1], this.year));
        this.timeline = new Timeline(this.root.querySelector('[data-timeline]'), {
            min: L.range[0],
            max: L.range[1],
            value: this.year,
            highlightFrom: L.group === 'corridor' ? 1996 : null,
            highlightLabel: 'WGI + V-Dem',
            onChange: (y, info) => this.setYear(y, info),
        });

        await this.ensureLayerData();
        await this.setView(this.view, { initial: true });
        if (this.showBorders) this.updateBorders();
        if (this.selected) this.select(this.selected, { fly: true, replace: false });
        this.renderLegend();
        this.syncUrl();

        setSearchHandler((id) => this.select(id, { fly: true }));
        this.d.add(() => setSearchHandler(null));
        const ro = new ResizeObserver(rafThrottle(() => this.resize()));
        ro.observe(this.stage);
        this.d.add(() => ro.disconnect());
    }

    // ------------------------------------------------------------------ katmanlar
    renderPanel() {
        const groups = [
            ['corridor', 'Dar Koridor', null],
            ['wgi', 'Yönetişim', 'Dünya Bankası WGI · 1996–2023'],
            ['vdem', 'Demokrasi', 'V-Dem · 1789–2024'],
        ];
        const opt = (L) => `<label class="layer-opt">
                <input type="radio" name="atlas-layer" value="${L.id}" ${L.id === this.layerId ? 'checked' : ''}>
                <span class="radio-dot" aria-hidden="true"></span>
                <span class="grow">${esc(L.label)}</span>
                ${L.id === 'type' ? `<span class="type-swatches" aria-hidden="true">${TYPE_ORDER.map((t) => `<i style="background:${TYPES[t].color}"></i>`).join('')}</span>` : ''}
            </label>`;
        this.panel.innerHTML = `
            <div class="panel-head">
                <div class="row" style="gap:8px;font-weight:600;font-size:14px">${icon('layers')}Katmanlar</div>
                <button class="icon-btn plain mobile-only" type="button" data-panel-close aria-label="Katmanları kapat">${icon('x')}</button>
            </div>
            <div class="panel-scroll">
                ${groups
                    .map(([g, title, sub]) => {
                        const items = Object.values(this.layers).filter((L) => L.group === g);
                        if (g === 'corridor') {
                            return `<fieldset class="layer-group"><legend class="eyebrow">${title}</legend>${items.map(opt).join('')}</fieldset>`;
                        }
                        const open = this.layer.group === g;
                        return `<details class="layer-group layer-details" ${open ? 'open' : ''}>
                            <summary><span class="stack" style="gap:1px"><span>${title}</span><span class="tiny faint">${sub} · ${items.length} gösterge</span></span>${icon('chevronD', 'icon-sm chev')}</summary>
                            <fieldset class="layer-sub"><legend class="sr-only">${title}</legend>${items.map(opt).join('')}</fieldset>
                        </details>`;
                    })
                    .join('')}
                <label class="toggle-row">
                    <span class="stack" style="gap:2px"><span>Tarihî sınırlar</span><span class="tiny faint" data-border-src>O yıla en yakın harita</span></span>
                    <input class="switch" type="checkbox" data-borders ${this.showBorders ? 'checked' : ''} aria-label="Tarihî sınırları göster">
                </label>
            </div>
            <div class="legend" data-legend aria-live="polite"></div>`;

        this.panel.addEventListener('change', (e) => {
            if (e.target.name === 'atlas-layer') this.setLayer(e.target.value);
            if (e.target.matches('[data-borders]')) {
                this.showBorders = e.target.checked;
                this.updateBorders();
                this.syncUrl();
            }
        });
        this.panel.querySelector('[data-panel-close]')?.addEventListener('click', () => this.togglePanel(false));
    }

    togglePanel(open) {
        this.panel.classList.toggle('open', open);
        this.root.querySelector('[data-panel-toggle]')?.setAttribute('aria-expanded', String(open));
    }

    async setLayer(id) {
        if (!this.layers[id] || id === this.layerId) return;
        this.layerId = id;
        await this.ensureLayerData();
        const L = this.layer;
        this.timeline.setRange(L.range[0], L.range[1], { highlightFrom: L.group === 'corridor' ? 1996 : null });
        const y = Math.max(L.range[0], Math.min(L.range[1], this.year));
        this.timeline.setValue(y, { silent: true });
        this.year = y;
        this.refreshColors();
        this.renderLegend();
        this.profile.setYear(this.year);
        this.syncUrl();
        if (isMobile()) this.togglePanel(false);
    }

    async ensureLayerData() {
        const L = this.layer;
        if (L.group === 'vdem') {
            try {
                await loadVdem(L.key);
            } catch (error) {
                toast(`Gösterge yüklenemedi: ${error.message}`, { type: 'error' });
            }
        }
    }

    value(id) {
        const L = this.layer;
        const y = this.year;
        switch (L.group) {
            case 'corridor': {
                const p = corridorAt(id, y);
                if (!p) return null;
                return L.id === 'type' ? p.type : L.id === 'state' ? p.y : p.x;
            }
            case 'wgi':
                return wgiAt(L.key, id, y);
            case 'vdem':
                return vdemAt(L.key, id, y);
            default:
                return null;
        }
    }

    color(id) {
        const v = this.value(id);
        if (v === null || v === undefined) return NODATA;
        const L = this.layer;
        if (L.kind === 'cat') return TYPES[v]?.color || NODATA;
        if (L.kind === 'div') return this.divScale(v);
        return this.seqColor(L.invert ? 1 - v : v);
    }

    valueText(id) {
        const v = this.value(id);
        const L = this.layer;
        if (v === null || v === undefined) return 'Veri yok';
        if (L.kind === 'cat') return TYPES[v].long;
        if (L.kind === 'div') return signed(v);
        return num(v, 3);
    }

    renderLegend() {
        const el = this.panel.querySelector('[data-legend]');
        const L = this.layer;
        const ids = this.world.features.map((f) => f.id);
        const noData = ids.filter((id) => this.value(id) === null).length;
        if (L.kind === 'cat') {
            const counts = typeCounts(this.year);
            const max = Math.max(...Object.values(counts), 1);
            const total = Object.values(counts).reduce((a, b) => a + b, 0);
            el.innerHTML = `
                <div class="legend-head"><span>${this.year} · ${total} ülke</span><span>ülke</span></div>
                ${TYPE_ORDER.map((t) => `<div class="legend-row t-${t}"><span class="swatch"></span><span class="grow">${TYPES[t].short}</span><span class="mono">${counts[t]}</span><span class="legend-bar"><span style="width:${(counts[t] / max) * 100}%"></span></span></div>`).join('')}
                <div class="legend-row"><span class="swatch" style="background:${NODATA}"></span><span class="grow faint">Veri yok (haritada)</span><span class="mono faint">${noData}</span><span class="legend-bar"></span></div>`;
            return;
        }
        const stops = [];
        for (let i = 0; i <= 10; i++) {
            const t = i / 10;
            const v = L.domain[0] + t * (L.domain[1] - L.domain[0]);
            stops.push(`${L.kind === 'div' ? this.divScale(v) : this.seqColor(L.invert ? 1 - v : v)} ${t * 100}%`);
        }
        const mid = (L.domain[0] + L.domain[1]) / 2;
        const ends = L.kind === 'div' ? ['zayıf', 'güçlü'] : L.invert ? ['düşük', 'yüksek'] : ['düşük', 'yüksek'];
        el.innerHTML = `
            <div class="legend-head"><span>${esc(L.label)} · ${this.year}</span></div>
            <div class="legend-ramp" style="background:linear-gradient(to right, ${stops.join(',')})"></div>
            <div class="legend-scale mono"><span>${L.kind === 'div' ? '−2,5' : '0'}</span><span>${L.kind === 'div' ? '0' : num(mid, 1)}</span><span>${L.kind === 'div' ? '+2,5' : '1'}</span></div>
            <div class="legend-scale tiny faint"><span>${ends[0]}</span><span>${L.kind === 'div' ? 'dünya ortalaması' : ''}</span><span>${ends[1]}</span></div>
            <p class="tiny muted legend-desc">${esc(L.desc)}</p>
            <div class="row tiny faint" style="gap:8px"><span class="swatch" style="background:${NODATA}"></span>Veri yok · ${noData} ülke<span class="grow"></span>${esc(L.source)}</div>`;
    }

    // ------------------------------------------------------------------ zaman
    setYear(year, info = {}) {
        this.year = year;
        this.refreshColors(info.playing);
        this.renderLegend();
        if (this.showBorders) this.updateBorders();
        if (!info.playing) {
            this.profile.setYear(year);
            this.syncUrl();
            if (this.selected) setContext({ country: this.selected, year });
        } else if (this.selected && year % 3 === 0) {
            this.profile.setYear(year);
        }
    }

    // ------------------------------------------------------------------ görünümler
    async setView(view, { initial = false } = {}) {
        if (view === 'globe' && !webglAvailable()) {
            toast('Bu cihazda 3B küre desteklenmiyor; düz harita gösteriliyor.');
            view = 'flat';
        }
        this.view = view;
        this.root.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
        this.root.querySelector('[data-rotate]').hidden = view !== 'globe';
        const globeEl = this.root.querySelector('[data-globe]');
        const flatEl = this.root.querySelector('[data-flat]');
        globeEl.hidden = view !== 'globe';
        flatEl.hidden = view !== 'flat';
        if (view === 'globe') {
            if (!this.globe) {
                try {
                    await loadScript(GLOBE_SRC);
                    this.initGlobe(globeEl);
                } catch (error) {
                    toast(`${error.message}. Düz haritaya geçildi.`, { type: 'error' });
                    return this.setView('flat');
                }
            } else {
                this.globe.resumeAnimation?.();
                this.resize();
            }
        } else {
            this.globe?.pauseAnimation?.();
            if (!this.flat) this.initFlat(flatEl);
            else this.resize();
        }
        this.refreshColors();
        if (this.showBorders) this.updateBorders();
        if (!initial) this.syncUrl();
    }

    initGlobe(el) {
        const Globe = window.Globe;
        const rect = this.stage.getBoundingClientRect();
        const g = Globe({ animateIn: !prefersReducedMotion() })(el)
            .width(rect.width)
            .height(rect.height)
            .backgroundColor('rgba(0,0,0,0)')
            .showAtmosphere(true)
            .atmosphereColor('#86AEFF')
            .atmosphereAltitude(0.14)
            .showGraticules(true)
            .polygonsData(this.world.features)
            .polygonSideColor(() => 'rgba(10,13,18,0.55)')
            .polygonsTransitionDuration(260)
            .polygonLabel((d) => this.tooltipHTML(d.id))
            .onPolygonHover((d) => {
                this.hover = d?.id || null;
                el.style.cursor = d ? 'pointer' : '';
                this.refreshShape();
            })
            .onPolygonClick((d) => this.select(d.id, { fly: true }))
            .onGlobeClick(() => {
                if (isMobile()) hideTip();
            });
        const mat = g.globeMaterial();
        mat?.color?.set?.('#131A26');
        mat?.emissive?.set?.('#0A0E15');
        if (mat && 'shininess' in mat) mat.shininess = 6;
        const controls = g.controls();
        controls.autoRotate = this.rotating;
        controls.autoRotateSpeed = 0.35;
        controls.minDistance = 130;
        controls.maxDistance = 600;
        el.addEventListener('pointerdown', () => this.setRotating(false), { once: true });
        const sel = this.selected && country(this.selected)?.label;
        g.pointOfView(sel ? { lng: sel[0], lat: sel[1], altitude: 1.9 } : { lat: 28, lng: 22, altitude: isMobile() ? 2.9 : 2.25 }, 0);
        this.globe = g;
        this.refreshShape();
    }

    initFlat(el) {
        const d3 = this.d3;
        const svg = d3.select(el).append('svg').attr('class', 'flat-svg').attr('role', 'img').attr('aria-label', 'Dünya haritası');
        const root = svg.append('g');
        this.flat = { svg, root, projection: d3.geoNaturalEarth1(), path: null, zoom: null };
        this.flat.path = d3.geoPath(this.flat.projection);
        root.append('path').attr('class', 'flat-sphere');
        root.append('path').attr('class', 'flat-graticule');
        this.flat.countries = root
            .append('g')
            .selectAll('path')
            .data(this.world.features)
            .join('path')
            .attr('class', 'flat-country')
            .on('pointerenter', (e, d) => {
                this.hover = d.id;
                this.refreshShape();
                showTip(this.tooltipHTML(d.id), e.clientX, e.clientY);
            })
            .on('pointermove', (e) => moveTip(e.clientX, e.clientY))
            .on('pointerleave', () => {
                this.hover = null;
                this.refreshShape();
                hideTip();
            })
            .on('click', (e, d) => this.select(d.id, { fly: true }));
        this.flat.borders = root.append('path').attr('class', 'flat-borders');
        this.flat.zoom = d3
            .zoom()
            .scaleExtent([1, 10])
            .on('zoom', (e) => {
                root.attr('transform', e.transform);
                root.selectAll('.flat-country').attr('stroke-width', 0.6 / e.transform.k);
                this.flat.borders.attr('stroke-width', 1.2 / e.transform.k);
            });
        svg.call(this.flat.zoom);
        this.resize();
    }

    resize() {
        const rect = this.stage.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        if (this.globe && this.view === 'globe') this.globe.width(rect.width).height(rect.height);
        if (this.flat && this.view === 'flat') {
            const { svg, projection, path } = this.flat;
            svg.attr('viewBox', `0 0 ${rect.width} ${rect.height}`).attr('width', rect.width).attr('height', rect.height);
            const padTop = 20;
            const padBottom = isMobile() ? 120 : 110;
            projection.fitExtent(
                [
                    [16, padTop],
                    [rect.width - 16, rect.height - padBottom],
                ],
                { type: 'Sphere' },
            );
            this.flat.root.select('.flat-sphere').attr('d', path({ type: 'Sphere' }));
            this.flat.root.select('.flat-graticule').attr('d', path(this.d3.geoGraticule10()));
            this.flat.countries.attr('d', path);
            if (this.flatBorderGeo) this.flat.borders.attr('d', path(this.flatBorderGeo));
        }
    }

    refreshColors(fast = false) {
        if (this.globe && this.view === 'globe') {
            this.globe.polygonsTransitionDuration(fast ? 0 : 260);
            this.globe.polygonCapColor((d) => this.color(d.id));
        }
        if (this.flat && this.view === 'flat') {
            this.flat.countries.attr('fill', (d) => this.color(d.id));
        }
        this.refreshShape();
    }

    refreshShape() {
        if (this.globe && this.view === 'globe') {
            this.globe
                .polygonAltitude((d) => (d.id === this.hover ? 0.03 : d.id === this.selected ? 0.022 : 0.007))
                .polygonStrokeColor((d) => (d.id === this.selected ? IVORY : d.id === this.hover ? 'rgba(237,232,223,0.75)' : STROKE));
        }
        if (this.flat && this.view === 'flat') {
            this.flat.countries
                .attr('stroke', (d) => (d.id === this.selected ? IVORY : d.id === this.hover ? 'rgba(237,232,223,0.8)' : STROKE))
                .classed('is-selected', (d) => d.id === this.selected);
            this.flat.countries.filter((d) => d.id === this.selected || d.id === this.hover).raise();
        }
    }

    tooltipHTML(id) {
        const L = this.layer;
        const hist = histName(id, this.year);
        const name = countryName(id);
        const v = this.value(id);
        const p = corridorAt(id, this.year);
        const typeLine = L.kind === 'cat' ? '' : p ? `<div class="tip-type t-${p.type}">${TYPES[p.type].short} · ${p.year}</div>` : '';
        const valueLine =
            L.kind === 'cat'
                ? `<div class="tip-type ${v ? `t-${v}` : ''}">${v ? TYPES[v].long : 'Koridor verisi yok'} · ${this.year}</div>`
                : `<div class="tip-grid"><span>${esc(L.label)}</span><span class="v">${this.valueText(id)}</span></div>`;
        return `<div class="tip"><div class="tip-title">${esc(name)}</div>${hist && hist !== name ? `<div class="tiny faint" style="margin:-2px 0 4px">${this.year}: ${esc(hist)}</div>` : ''}${valueLine}${typeLine}<div class="tip-hint">Profil için tıklayın</div></div>`;
    }

    // ------------------------------------------------------------------ seçim
    select(id, { fly = false, replace = true } = {}) {
        if (id && !country(id)) return;
        this.selected = id;
        this.refreshShape();
        const hint = this.root.querySelector('[data-hint]');
        if (id) {
            hint?.classList.add('gone');
            this.profileEl.hidden = false;
            this.root.classList.add('has-profile');
            this.profile.show(id, this.year);
            setContext({ country: id, year: this.year });
            if (fly) this.flyTo(id);
            if (isMobile()) this.togglePanel(false);
        } else {
            this.profileEl.hidden = true;
            this.root.classList.remove('has-profile');
            setContext({ country: null });
        }
        hideTip();
        if (replace) this.syncUrl();
    }

    flyTo(id) {
        const label = country(id)?.label;
        if (!label) return;
        if (this.globe && this.view === 'globe') {
            this.setRotating(false);
            const pov = this.globe.pointOfView();
            // Mobilde profil alttan açıldığı için ülkeyi ekranın üst yarısına getir
            const latShift = isMobile() ? 24 : 0;
            this.globe.pointOfView({ lng: label[0], lat: label[1] - latShift, altitude: Math.min(pov.altitude, isMobile() ? 2.2 : 1.9) }, prefersReducedMotion() ? 0 : 900);
        }
    }

    setRotating(on) {
        this.rotating = on;
        if (this.globe) this.globe.controls().autoRotate = on;
        const btn = this.root.querySelector('[data-rotate]');
        btn.innerHTML = icon(on ? 'pause' : 'rotate');
        btn.setAttribute('aria-label', on ? 'Dönmeyi durdur' : 'Küreyi döndür');
    }

    bindTools() {
        this.root.querySelectorAll('[data-view]').forEach((b) => this.d.on(b, 'click', () => this.setView(b.dataset.view)));
        this.root.querySelectorAll('[data-zoom]').forEach((b) =>
            this.d.on(b, 'click', () => {
                const inward = b.dataset.zoom === 'in';
                if (this.view === 'globe' && this.globe) {
                    const pov = this.globe.pointOfView();
                    this.globe.pointOfView({ altitude: Math.max(0.35, Math.min(4.5, pov.altitude * (inward ? 0.75 : 1.33))) }, 400);
                } else if (this.flat) {
                    this.flat.svg.transition().duration(300).call(this.flat.zoom.scaleBy, inward ? 1.5 : 1 / 1.5);
                }
            }),
        );
        this.d.on(this.root.querySelector('[data-rotate]'), 'click', () => this.setRotating(!this.rotating));
        this.setRotating(this.rotating);
        this.d.on(this.root.querySelector('[data-panel-toggle]'), 'click', () => this.togglePanel(!this.panel.classList.contains('open')));
        this.d.on(document, 'keydown', (e) => {
            if (e.key === 'Escape' && this.selected && !document.querySelector('.overlay')) this.select(null);
        });
    }

    // ------------------------------------------------------------------ tarihî sınırlar
    async updateBorders() {
        const srcEl = this.panel.querySelector('[data-border-src]');
        if (!this.showBorders) {
            this.globe?.pathsData([]);
            this.globe?.pointsData([]);
            this.flatBorderGeo = null;
            this.flat?.borders.attr('d', null);
            if (srcEl) srcEl.textContent = 'O yıla en yakın harita';
            return;
        }
        const m = borderMilestoneFor(this.year);
        if (!m) return;
        if (srcEl) srcEl.textContent = `${m.source} · ${m.year} haritası`;
        if (this.borderYear === m.year && this.borderViewReady === this.view) {
            this.updateCapitals();
            return;
        }
        let lines = this.borderCache.get(m.year);
        if (!lines) {
            try {
                const raw = await loadBorders(m.year);
                lines = raw.map((flat) => {
                    const pts = [];
                    for (let i = 0; i < flat.length; i += 2) pts.push([flat[i], flat[i + 1]]);
                    return pts;
                });
                this.borderCache.set(m.year, lines);
            } catch (error) {
                toast(`Tarihî harita yüklenemedi: ${error.message}`, { type: 'error' });
                return;
            }
        }
        if (!this.showBorders || borderMilestoneFor(this.year)?.year !== m.year) return;
        this.borderYear = m.year;
        this.borderViewReady = this.view;
        if (this.globe && this.view === 'globe') {
            this.globe
                .pathsData(lines)
                .pathPoints((d) => d)
                .pathPointLat((p) => p[1])
                .pathPointLng((p) => p[0])
                .pathColor(() => 'rgba(237,232,223,0.7)')
                .pathTransitionDuration(0);
        }
        if (this.flat && this.view === 'flat') {
            this.flatBorderGeo = { type: 'MultiLineString', coordinates: lines };
            this.flat.borders.attr('d', this.flat.path(this.flatBorderGeo));
        }
        this.updateCapitals();
    }

    updateCapitals() {
        if (!this.globe || this.view !== 'globe') return;
        const caps = [];
        for (const [id, c] of Object.entries(db.countries)) {
            if (!c.capitals) continue;
            const cap = capitalAt(id, this.year);
            if (cap && corridorAt(id, this.year, 0)) caps.push({ id, ...cap });
        }
        this.globe
            .pointsData(caps)
            .pointLat('lat')
            .pointLng('lng')
            .pointColor(() => IVORY)
            .pointAltitude(0.012)
            .pointRadius(0.22)
            .pointsMerge(false)
            .pointLabel((d) => `<div class="tip"><div class="tip-title">${esc(histName(d.id, this.year) || countryName(d.id))}</div><div class="tiny faint">Başkent: ${esc(d.name)} · ${this.year}</div></div>`)
            .onPointClick((d) => this.select(d.id, { fly: true }));
    }

    // ------------------------------------------------------------------ adres
    syncUrl() {
        replaceParams({
            l: this.layerId === 'type' ? null : this.layerId,
            y: this.year,
            c: this.selected,
            v: this.view === 'flat' ? 'flat' : null,
            b: this.showBorders ? '1' : null,
        });
    }

    update(params) {
        if (params.l && params.l !== this.layerId && this.layers[params.l]) {
            this.panel.querySelector(`input[value="${CSS.escape(params.l)}"]`)?.click();
        }
        const y = Number(params.y);
        if (y && y !== this.year) this.timeline.setValue(y);
        if ((params.c || null) !== this.selected) this.select(params.c || null, { fly: true, replace: false });
    }

    unmount() {
        this.timeline?.destroy();
        this.profile?.destroy();
        this.d.dispose();
        hideTip();
        if (this.globe) {
            this.globe.pauseAnimation?.();
            try {
                this.globe._destructor?.();
                const renderer = this.globe.renderer?.();
                renderer?.dispose?.();
                renderer?.forceContextLoss?.();
            } catch (error) {
                console.warn(error);
            }
        }
        this.root.classList.remove('page-full', 'atlas', 'has-profile');
        setContext({ country: null });
    }
}
