/**
 * Leviathan Avı — tahmin haritası
 *
 * Tahmin edilen ülkeleri, başkentlerinden gizli ülkeye olan uzaklığı (kesik
 * halka) ve sekiz yönlü ipucunun kapsadığı dilimi gösterir. Gizli ülke oyun
 * bitene dek vurgulanmaz; yön tam açıyla değil 45°'lik dilimle çizilir, böylece
 * halka ile yön tek bir noktayı ele vermez. Ülke ve başkent adları yakınlaştırdıkça
 * sığdığı ölçüde açılır; bir ülkeye dokunmak onu tahmin için seçer.
 */

import { icon } from '../../core/icons.js';
import { esc } from '../../core/dom.js';
import { db, loadWorld, countryName, flagHTML } from '../../core/data.js';
import { int } from '../../core/format.js';
import { showTip, moveTip, hideTip } from '../../components/tooltip.js';
import { capitalOf, compassWord, compassArc, NEAR_KM } from './logic.js';

const KM_PER_DEG = (Math.PI * 6371) / 180;
const MAX_ZOOM = 14;
/** Başkent adları bu yakınlaştırmadan sonra açılır (tahmin edilenlerinki hep açık) */
const CAPITAL_ZOOM = 2.6;
const FONT = { country: 11, capital: 10 };

const playable = (id) => Boolean(db.countries[id]?.corridor);

/** Yazı genişliği tahmini (px); ölçüm yapmadan çakışma denetimi için yeterli */
const textWidth = (s, size) => [...s].length * size * 0.58;

export class HuntMap {
    /**
     * @param {HTMLElement} el
     * @param {{ onPick: (id: string) => void }} opts
     */
    constructor(el, { onPick }) {
        this.el = el;
        this.onPick = onPick;
        this.d3 = window.d3;
        this.evals = [];
        this.target = null;
        this.done = false;
        this.selected = null;
        this.hover = null;
        this.frame = 0;
        this.ro = null;
    }

    async init() {
        const d3 = this.d3;
        if (!d3) return;
        try {
            this.world = await loadWorld();
        } catch {
            this.el.innerHTML = '<p class="tiny faint">Harita yüklenemedi.</p>';
            return;
        }
        if (!this.el.isConnected) return;

        this.el.innerHTML = `
            <div class="hunt-map-stage" data-stage>
                <svg class="hunt-map-svg" role="img" aria-label="Tahmin haritası: tahmin edilen ülkeler, uzaklık halkaları ve yön dilimleri"></svg>
                <div class="tool-group hunt-map-tools">
                    <button class="icon-btn" type="button" data-zoom="in" aria-label="Yakınlaştır">${icon('plus', 'icon-sm')}</button>
                    <button class="icon-btn" type="button" data-zoom="out" aria-label="Uzaklaştır">${icon('minus', 'icon-sm')}</button>
                    <button class="icon-btn" type="button" data-zoom="reset" aria-label="Tüm dünyayı göster">${icon('globe', 'icon-sm')}</button>
                </div>
                <div class="hunt-map-pick" data-pick hidden></div>
            </div>`;
        this.stage = this.el.querySelector('[data-stage]');
        this.pickEl = this.el.querySelector('[data-pick]');

        const svg = d3.select(this.el.querySelector('svg'));
        this.svg = svg;
        this.geo = svg.append('g');
        this.sphere = this.geo.append('path').attr('class', 'hm-sphere');
        this.graticule = this.geo.append('path').attr('class', 'hm-graticule');
        this.countries = this.geo
            .append('g')
            .selectAll('path')
            .data(this.world.features)
            .join('path')
            .attr('class', (d) => `hm-country${playable(d.properties.id) ? ' is-playable' : ''}`);
        this.clueLayer = this.geo.append('g').attr('class', 'hm-clues');
        const overlay = svg.append('g');
        this.dotLayer = overlay.append('g');
        this.labelLayer = overlay.append('g').attr('class', 'hm-labels');

        // Başkent noktaları: koridor verisi olan her ülke (haritada sınırı çizilmeyen küçük ülkeler dahil)
        this.capitals = Object.keys(db.countries)
            .filter(playable)
            .map((id) => ({ id, cap: capitalOf(id) }))
            .filter((d) => d.cap);
        this.dots = this.dotLayer
            .selectAll('circle')
            .data(this.capitals)
            .join('circle')
            .attr('class', 'hm-capital');

        this.projection = d3.geoNaturalEarth1();
        this.path = d3.geoPath(this.projection);
        this.zoom = d3
            .zoom()
            .scaleExtent([1, MAX_ZOOM])
            .clickDistance(5)
            .on('zoom', (e) => {
                this.transform = e.transform;
                this.geo.attr('transform', e.transform);
                this.scheduleOverlay();
            });
        this.transform = d3.zoomIdentity;
        svg.call(this.zoom).on('dblclick.zoom', null);

        const pointer = (sel) =>
            sel
                .on('pointerenter', (e, d) => {
                    if (e.pointerType !== 'mouse') return;
                    const id = d.id || d.properties.id;
                    this.hover = id;
                    this.refreshClasses();
                    showTip(this.tipHTML(id), e.clientX, e.clientY);
                })
                .on('pointermove', (e) => moveTip(e.clientX, e.clientY))
                .on('pointerleave', () => {
                    this.hover = null;
                    this.refreshClasses();
                    hideTip();
                })
                .on('click', (e, d) => {
                    e.stopPropagation();
                    this.select(d.id || d.properties.id);
                });
        pointer(this.countries);
        pointer(this.dots);
        svg.on('click', () => this.select(null));

        this.el.querySelector('.hunt-map-tools').addEventListener('click', (e) => {
            const b = e.target.closest('[data-zoom]');
            if (!b) return;
            const t = svg.transition().duration(300);
            if (b.dataset.zoom === 'reset') svg.transition().duration(500).call(this.zoom.transform, d3.zoomIdentity);
            else this.zoom.scaleBy(t, b.dataset.zoom === 'in' ? 1.8 : 1 / 1.8);
        });
        this.pickEl.addEventListener('click', (e) => {
            if (e.target.closest('[data-guess]')) this.onPick(this.selected);
            else if (e.target.closest('[data-close]')) this.select(null);
        });

        this.ro = new ResizeObserver(() => this.layout());
        this.ro.observe(this.stage);
        this.layout();
        this.render();
        if (this.done) this.focusTarget(0);
    }

    /** Oyun durumunu haritaya işler */
    update(evals, { target, done }) {
        this.evals = evals;
        this.target = target;
        const ended = done && !this.done;
        this.done = done;
        if (this.selected && (done || evals.some((e) => e.id === this.selected))) this.selected = null;
        if (!this.svg) return;
        this.render();
        if (ended) this.focusTarget();
    }

    // -----------------------------------------------------------------------

    layout() {
        const w = this.stage.clientWidth;
        if (!w) return;
        const h = Math.round(Math.max(260, Math.min(520, w * 0.56)));
        if (w === this.w && h === this.h) return;
        this.w = w;
        this.h = h;
        this.svg.attr('viewBox', `0 0 ${w} ${h}`).attr('width', w).attr('height', h);
        // Dar ekranda dünya yüksekliğe sığdırılır; yanlar taşar ve sürüklenerek görülür
        const span = Math.max(w, h * 1.95);
        const x0 = (w - span) / 2;
        this.projection.fitExtent(
            [
                [x0 + 8, 8],
                [x0 + span - 8, h - 8],
            ],
            { type: 'Sphere' },
        );
        this.zoom.extent([
            [0, 0],
            [w, h],
        ]).translateExtent([
            [Math.min(0, x0), 0],
            [Math.max(w, x0 + span), h],
        ]);
        this.svg.call(this.zoom.transform, this.d3.zoomIdentity);
        this.sphere.attr('d', this.path({ type: 'Sphere' }));
        this.graticule.attr('d', this.path(this.d3.geoGraticule10()));
        this.countries.attr('d', this.path);

        // Etiket adayları: ülke adı çapa noktasında, sığıp sığmadığı ülkenin genişliğine göre
        const feats = new Map(this.world.features.map((f) => [f.properties.id, f]));
        this.labels = Object.keys(db.countries)
            .filter(playable)
            .map((id) => {
                const c = db.countries[id];
                const cap = capitalOf(id);
                const anchor = c.label || (cap && [cap.lng, cap.lat]);
                if (!anchor) return null;
                const f = feats.get(id);
                const [[x0], [x1]] = f ? this.path.bounds(f) : [[0], [0]];
                return { id, name: countryName(id), p: this.projection(anchor), width: Math.min(x1 - x0, this.w * 0.3), area: f ? this.path.area(f) : 0 };
            })
            .filter(Boolean)
            .sort((a, b) => b.area - a.area);
        this.capitals.forEach((d) => (d.p = this.projection([d.cap.lng, d.cap.lat])));
        this.drawClues();
        this.drawOverlay();
    }

    render() {
        this.refreshClasses();
        this.drawClues();
        this.drawOverlay();
        this.renderPick();
    }

    refreshClasses() {
        const guessed = new Map(this.evals.map((e) => [e.id, e]));
        const reveal = this.done ? this.target : null;
        const cls = (id) => {
            const e = guessed.get(id);
            return {
                'is-guessed': Boolean(e) && !e.correct,
                'is-near': Boolean(e) && !e.correct && e.km !== null && e.km < NEAR_KM,
                'is-target': id === reveal,
                'is-selected': id === this.selected,
                'is-hover': id === this.hover,
                'is-locked': this.done,
            };
        };
        this.countries.each(function (d) {
            const c = cls(d.properties.id);
            for (const k in c) this.classList.toggle(k, c[k]);
        });
        this.dots.each(function (d) {
            const c = cls(d.id);
            for (const k in c) this.classList.toggle(k, c[k]);
        });
    }

    /** Halka (tam uzaklık) ve sekiz yönlü dilim; son tahmin daha belirgin */
    drawClues() {
        const d3 = this.d3;
        const clues = this.evals
            .map((e, i) => ({ e, i, cap: capitalOf(e.id) }))
            .filter(({ e, cap }) => !e.correct && cap && e.km !== null && e.km > 1);
        const last = clues.length ? clues[clues.length - 1].i : -1;
        const g = this.clueLayer
            .selectAll('g.hm-clue')
            .data(clues, (d) => d.e.id)
            .join((enter) => {
                const n = enter.append('g').attr('class', 'hm-clue');
                n.append('path').attr('class', 'hm-wedge');
                n.append('path').attr('class', 'hm-ring');
                n.append('path').attr('class', 'hm-arc');
                return n;
            })
            .classed('is-last', (d) => d.i === last && !this.done);
        g.each((d, i, nodes) => {
            if (!d.geo) {
                const { e, cap } = d;
                const arc = compassArc(cap, e.bearing, e.km);
                let wedge = { type: 'Polygon', coordinates: [[[cap.lng, cap.lat], ...arc, [cap.lng, cap.lat]]] };
                // d3-geo halkaları saat yönünde bekler; ters dönerse küreyi boyar
                if (d3.geoArea(wedge) > 2 * Math.PI) wedge = { type: 'Polygon', coordinates: [[...wedge.coordinates[0]].reverse()] };
                d.geo = {
                    ring: d3.geoCircle().center([cap.lng, cap.lat]).radius(e.km / KM_PER_DEG).precision(1)(),
                    arc: { type: 'LineString', coordinates: arc },
                    wedge,
                };
            }
            const n = d3.select(nodes[i]);
            n.select('.hm-wedge').attr('d', this.path(d.geo.wedge));
            n.select('.hm-ring').attr('d', this.path(d.geo.ring));
            n.select('.hm-arc').attr('d', this.path(d.geo.arc));
        });
    }

    scheduleOverlay() {
        if (this.frame) return;
        this.frame = requestAnimationFrame(() => {
            this.frame = 0;
            this.drawOverlay();
        });
    }

    /** Başkent noktaları ve etiketler dönüştürülmeden, ekran koordinatında çizilir */
    drawOverlay() {
        if (!this.labels) return;
        const t = this.transform;
        const k = t.k;
        const at = (p) => t.apply(p);
        const guessed = new Set(this.evals.map((e) => e.id));
        const reveal = this.done ? this.target : null;
        const key = (id) => guessed.has(id) || id === this.selected || id === this.hover || id === reveal;

        this.dots.each(function (d) {
            const [x, y] = at(d.p);
            this.setAttribute('cx', x);
            this.setAttribute('cy', y);
            this.setAttribute('r', key(d.id) ? 3.2 : Math.min(2.6, 1.3 + k * 0.12));
        });

        // Açgözlü yerleşim: önce öne çıkan ülkeler, sonra büyükten küçüğe; çakışan etiket atlanır
        const placed = [];
        const fits = (b) => b.x0 >= 2 && b.x1 <= this.w - 2 && b.y0 >= 2 && b.y1 <= this.h - 2 && !placed.some((o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
        const out = [];
        // Her etiketin birkaç olası konumu var; ilk sığan seçilir, öne çıkanlar sığmasa da ilk konumda yazılır
        const tryPlace = (cands, force) => {
            const item = cands.find((c) => fits(c.box)) || (force ? cands[0] : null);
            if (!item) return false;
            placed.push(item.box);
            out.push(item);
            return true;
        };
        const byId = new Map(this.capitals.map((c) => [c.id, c]));
        const countryItem = (l) => {
            const [x, y] = at(l.p);
            const size = key(l.id) ? FONT.country + 0.5 : FONT.country;
            const tw = textWidth(l.name, size);
            return [0, -1, 1].map((dy) => {
                const yy = y + dy * (size + 3);
                return { id: l.id, kind: 'country', text: l.name, x, y: yy, size, anchor: 'middle', box: { x0: x - tw / 2 - 2, x1: x + tw / 2 + 2, y0: yy - size * 0.8, y1: yy + size * 0.35 } };
            });
        };
        const capitalItem = (c) => {
            const [x, y] = at(c.p);
            const size = FONT.capital;
            const tw = textWidth(c.cap.name, size);
            const base = { id: c.id, kind: 'capital', text: c.cap.name, size };
            return [
                { ...base, x: x + 5, y: y + 3.5, anchor: 'start', box: { x0: x + 4, x1: x + 6 + tw, y0: y - 5, y1: y + 6 } },
                { ...base, x: x - 5, y: y + 3.5, anchor: 'end', box: { x0: x - 6 - tw, x1: x - 4, y0: y - 5, y1: y + 6 } },
                { ...base, x, y: y + 14, anchor: 'middle', box: { x0: x - tw / 2 - 1, x1: x + tw / 2 + 1, y0: y + 5, y1: y + 16 } },
            ];
        };

        const keys = [...new Set([reveal, this.selected, this.hover, ...guessed].filter(Boolean))];
        for (const id of keys) {
            const c = byId.get(id);
            if (c) tryPlace(capitalItem(c), true);
            const l = this.labels.find((x) => x.id === id);
            if (l) tryPlace(countryItem(l), true);
        }
        for (const l of this.labels) {
            if (key(l.id)) continue;
            if (textWidth(l.name, FONT.country) > l.width * k * 1.25) continue;
            tryPlace(countryItem(l));
        }
        if (k >= CAPITAL_ZOOM) {
            const shown = new Set(out.filter((o) => o.kind === 'country').map((o) => o.id));
            for (const c of this.capitals) if (!key(c.id) && shown.has(c.id)) tryPlace(capitalItem(c));
        }

        this.labelLayer
            .selectAll('text')
            .data(out, (d) => `${d.kind}:${d.id}`)
            .join('text')
            .attr('class', (d) => `hm-label hm-lab-${d.kind}${key(d.id) ? ' is-key' : ''}${d.id === reveal ? ' is-target' : ''}`)
            .attr('x', (d) => d.x)
            .attr('y', (d) => d.y)
            .attr('text-anchor', (d) => d.anchor)
            .style('font-size', (d) => `${d.size}px`)
            .text((d) => d.text);
    }

    tipHTML(id) {
        const cap = capitalOf(id);
        const e = this.evals.find((x) => x.id === id);
        const lines = [`<div class="tip-title">${esc(countryName(id))}</div>`];
        if (cap) lines.push(`<div class="tiny muted">Başkent: ${esc(cap.name)}</div>`);
        if (!playable(id)) lines.push('<div class="tiny faint">Koridor verisi yok; tahmin edilemez</div>');
        else if (e && !e.correct && e.km !== null) lines.push(`<div class="tiny">Gizli ülke ${int(e.km)} km uzakta, ${compassWord(e.bearing)} yönünde</div>`);
        return lines.join('');
    }

    select(id) {
        if (id && !playable(id)) id = null;
        this.selected = id === this.selected ? null : id;
        this.refreshClasses();
        this.drawOverlay();
        this.renderPick();
    }

    renderPick() {
        const id = this.selected;
        this.pickEl.hidden = !id;
        if (!id) {
            this.pickEl.innerHTML = '';
            return;
        }
        const cap = capitalOf(id);
        const e = this.evals.find((x) => x.id === id);
        const action = this.done
            ? ''
            : e
              ? '<span class="tiny faint">Zaten tahmin edildi</span>'
              : `<button class="btn btn-primary btn-sm" type="button" data-guess>${icon('target', 'icon-sm')}Tahmin et</button>`;
        this.pickEl.innerHTML = `
            <span class="row" style="gap:8px;min-width:0">${flagHTML(id)}<span class="stack" style="gap:0;min-width:0"><span class="small hunt-name">${esc(countryName(id))}</span>${cap ? `<span class="tiny faint">Başkent: ${esc(cap.name)}</span>` : ''}</span></span>
            <span class="row" style="gap:6px">${action}<button class="icon-btn plain" type="button" data-close aria-label="Seçimi kaldır">${icon('x', 'icon-sm')}</button></span>`;
    }

    /** Oyun bitince gizli ülkeye yaklaş */
    focusTarget(duration = 900) {
        const f = this.world.features.find((x) => x.properties.id === this.target);
        const cap = capitalOf(this.target);
        let cx;
        let cy;
        let k;
        if (f) {
            const [[x0, y0], [x1, y1]] = this.path.bounds(f);
            k = Math.max(1, Math.min(8, 0.5 / Math.max((x1 - x0) / this.w, (y1 - y0) / this.h)));
            [cx, cy] = [(x0 + x1) / 2, (y0 + y1) / 2];
        } else if (cap) {
            [cx, cy] = this.projection([cap.lng, cap.lat]);
            k = 6;
        } else return;
        const t = this.d3.zoomIdentity.translate(this.w / 2, this.h / 2).scale(k).translate(-cx, -cy);
        this.svg.transition().duration(duration).call(this.zoom.transform, t);
    }

    destroy() {
        this.ro?.disconnect();
        if (this.frame) cancelAnimationFrame(this.frame);
        this.svg?.interrupt();
        hideTip();
    }
}
