/**
 * Dar Koridor grafiği (D3)
 *
 * x: toplumun gücü, y: devletin gücü. Arka plandaki dört bölge, verideki
 * dört kümenin (K-ortalamalar) sınırlarıdır; bu yüzden bir noktanın rengi ile
 * içinde durduğu bölge her zaman tutarlıdır.
 */

import { db } from '../core/data.js';
import { TYPES, TYPE_ORDER } from '../core/theory.js';
import { countryName } from '../core/data.js';
import { showTip, moveTip, hideTip } from './tooltip.js';
import { prefersReducedMotion } from '../core/dom.js';

export const DOMAIN = { x: [-3.1, 2.7], y: [-3.0, 3.3] };

const INK = '#0A0D12';
const IVORY = '#EDE8DF';
const CORNERS = {
    Shackled: ['end', 'top'],
    Despotic: ['start', 'top'],
    Paper: ['start', 'bottom'],
    Absent: ['end', 'bottom'],
};

const clampTo = (v, [a, b]) => Math.max(a, Math.min(b, v));

export class CorridorChart {
    constructor(el, options = {}) {
        this.d3 = window.d3;
        this.el = el;
        this.o = {
            variant: 'full',
            regions: true,
            regionLabels: true,
            axes: true,
            pointRadius: 5,
            interactive: true,
            tooltip: null,
            onClick: null,
            onHover: null,
            ariaLabel: 'Dar koridor grafiği',
            baseOpacity: 0.9,
            ...options,
        };
        this.points = [];
        this.trails = [];
        this.labels = new Set();
        this.emphasis = new Set();
        this.filter = null;
        this.hoverId = null;
        this.lastTap = null;
        this.width = 0;
        this.height = 0;
        this._build();
        this.ro = new ResizeObserver(() => this._resize());
        this.ro.observe(el);
        this._resize();
    }

    // ------------------------------------------------------------- kurulum
    _build() {
        const d3 = this.d3;
        this.svg = d3
            .select(this.el)
            .append('svg')
            .attr('class', 'chart-svg')
            .attr('role', 'img')
            .attr('aria-label', this.o.ariaLabel);
        const defs = this.svg.append('defs');
        this.clipId = `clip-${Math.random().toString(36).slice(2, 9)}`;
        this.clipRect = defs.append('clipPath').attr('id', this.clipId).append('rect').attr('rx', 6);
        this.gRegions = this.svg.append('g').attr('clip-path', `url(#${this.clipId})`);
        this.frame = this.svg.append('rect').attr('fill', 'none').attr('stroke', '#262D3A').attr('rx', 6);
        this.gGrid = this.svg.append('g');
        this.gRegionLabels = this.svg.append('g');
        this.gTrails = this.svg.append('g');
        this.gPoints = this.svg.append('g');
        this.gLabels = this.svg.append('g');
        this.ring = this.svg
            .append('circle')
            .attr('fill', 'none')
            .attr('stroke', IVORY)
            .attr('stroke-width', 1.6)
            .attr('r', 0)
            .attr('opacity', 0)
            .style('pointer-events', 'none');

        if (this.o.interactive) {
            this.svg.on('pointermove', (e) => this._onMove(e));
            this.svg.on('pointerleave', () => this._setHover(null));
            this.svg.on('click', (e) => this._onClick(e));
        }
    }

    _pad() {
        if (this.o.variant === 'mini') return { l: 8, r: 8, t: 8, b: 8 };
        const small = this.width < 520;
        return { l: small ? 34 : 50, r: 14, t: 14, b: small ? 34 : 42 };
    }

    _resize() {
        const w = Math.max(0, Math.floor(this.el.clientWidth));
        const h = Math.max(0, Math.floor(this.el.clientHeight));
        if (!w || !h || (w === this.width && h === this.height)) return;
        this.width = w;
        this.height = h;
        this.svg.attr('viewBox', `0 0 ${w} ${h}`).attr('width', w).attr('height', h);
        const p = this._pad();
        this.plot = { x0: p.l, y0: p.t, x1: w - p.r, y1: h - p.b };
        this.x = this.d3.scaleLinear().domain(DOMAIN.x).range([this.plot.x0, this.plot.x1]);
        this.y = this.d3.scaleLinear().domain(DOMAIN.y).range([this.plot.y1, this.plot.y0]);
        this.clipRect
            .attr('x', this.plot.x0)
            .attr('y', this.plot.y0)
            .attr('width', this.plot.x1 - this.plot.x0)
            .attr('height', this.plot.y1 - this.plot.y0);
        this.frame
            .attr('x', this.plot.x0 + 0.5)
            .attr('y', this.plot.y0 + 0.5)
            .attr('width', this.plot.x1 - this.plot.x0 - 1)
            .attr('height', this.plot.y1 - this.plot.y0 - 1);
        this._drawStatic();
        this.render({ duration: 0 });
    }

    _drawStatic() {
        const d3 = this.d3;
        const { x, y, plot } = this;
        const mini = this.o.variant === 'mini';

        // Bölgeler: küme merkezlerinin Voronoi hücreleri
        this.gRegions.selectAll('*').remove();
        if (this.o.regions && db.corridor) {
            const cents = TYPE_ORDER.map((t) => [x(db.corridor.centroids[t][0]), y(db.corridor.centroids[t][1])]);
            const vor = d3.Delaunay.from(cents).voronoi([plot.x0, plot.y0, plot.x1, plot.y1]);
            TYPE_ORDER.forEach((t, i) => {
                this.gRegions
                    .append('path')
                    .attr('d', vor.renderCell(i))
                    .attr('fill', TYPES[t].color)
                    .attr('fill-opacity', mini ? 0.1 : 0.075);
            });
            this.gRegions
                .append('path')
                .attr('d', vor.render())
                .attr('fill', 'none')
                .attr('stroke', IVORY)
                .attr('stroke-opacity', 0.15)
                .attr('stroke-dasharray', '3 5');
        }

        // Izgara ve eksenler
        this.gGrid.selectAll('*').remove();
        if (this.o.axes && !mini) {
            const g = this.gGrid;
            g.append('line').attr('x1', x(0)).attr('x2', x(0)).attr('y1', plot.y0).attr('y2', plot.y1).attr('stroke', IVORY).attr('stroke-opacity', 0.07);
            g.append('line').attr('x1', plot.x0).attr('x2', plot.x1).attr('y1', y(0)).attr('y2', y(0)).attr('stroke', IVORY).attr('stroke-opacity', 0.07);
            const small = this.width < 520;
            for (const t of [-3, -2, -1, 0, 1, 2]) {
                g.append('text').attr('class', 'axis-num').attr('x', x(t)).attr('y', plot.y1 + 17).attr('text-anchor', 'middle').text(t > 0 ? `+${t}` : t === 0 ? '0' : `−${-t}`);
            }
            for (const t of [-3, -2, -1, 0, 1, 2, 3]) {
                g.append('text').attr('class', 'axis-num').attr('x', plot.x0 - 8).attr('y', y(t) + 4).attr('text-anchor', 'end').text(t > 0 ? `+${t}` : t === 0 ? '0' : `−${-t}`);
            }
            g.append('text').attr('class', 'axis-title').attr('x', plot.x1).attr('y', this.height - (small ? 4 : 6)).attr('text-anchor', 'end').text('Toplumun gücü →');
            g.append('text')
                .attr('class', 'axis-title')
                .attr('transform', `translate(${small ? 11 : 14} ${plot.y0}) rotate(-90)`)
                .attr('text-anchor', 'end')
                .text('Devletin gücü →');
        }

        // Bölge adları
        this.gRegionLabels.selectAll('*').remove();
        if (this.o.regionLabels && this.width > 240) {
            const size = mini ? 13 : Math.max(14, Math.min(21, this.width / 44));
            const inset = mini ? 10 : 14;
            for (const t of TYPE_ORDER) {
                const [h, v] = CORNERS[t];
                this.gRegionLabels
                    .append('text')
                    .attr('class', 'region-label')
                    .attr('x', h === 'start' ? plot.x0 + inset : plot.x1 - inset)
                    .attr('y', v === 'top' ? plot.y0 + inset + size * 0.8 : plot.y1 - inset)
                    .attr('text-anchor', h)
                    .attr('font-size', size)
                    .attr('fill', TYPES[t].text)
                    .attr('fill-opacity', 0.9)
                    .text(TYPES[t].short);
            }
        }
    }

    // ------------------------------------------------------------- veri
    setPoints(points, { duration = 0 } = {}) {
        this.points = points;
        this.render({ duration });
        return this;
    }

    setTrails(trails) {
        this.trails = trails || [];
        this._renderTrails();
        return this;
    }

    setLabels(ids) {
        this.labels = new Set(ids || []);
        this.render({ duration: 0 });
        return this;
    }

    setEmphasis(ids) {
        this.emphasis = new Set(ids || []);
        this.render({ duration: 0 });
        return this;
    }

    setFilter(types) {
        this.filter = types && types.size < 4 ? types : null;
        this.render({ duration: 200 });
        return this;
    }

    setAriaLabel(text) {
        this.svg.attr('aria-label', text);
    }

    // ------------------------------------------------------------- çizim
    _cx(d) {
        return this.x(clampTo(d.x, DOMAIN.x));
    }

    _cy(d) {
        return this.y(clampTo(d.y, DOMAIN.y));
    }

    _radius(d) {
        const r = this.o.pointRadius * (this.width < 420 && this.o.variant !== 'mini' ? 0.8 : 1);
        return this.emphasis.has(d.id) ? r + 1.8 : r;
    }

    _opacity(d) {
        if (this.filter && !this.filter.has(d.type)) return 0.1;
        if (this.o.dimOthers && this.emphasis.size && !this.emphasis.has(d.id)) return 0.38;
        return this.o.baseOpacity;
    }

    render({ duration = 0 } = {}) {
        if (!this.x) return;
        const d3 = this.d3;
        const dur = prefersReducedMotion() ? 0 : duration;
        const t = this.svg.transition().duration(dur).ease(d3.easeCubicOut);

        const sel = this.gPoints.selectAll('circle.pt').data(this.points, (d) => d.id);
        sel.exit().transition(t).attr('r', 0).remove();
        const enter = sel
            .enter()
            .append('circle')
            .attr('class', 'pt')
            .attr('cx', (d) => this._cx(d))
            .attr('cy', (d) => this._cy(d))
            .attr('r', 0);
        const merged = enter.merge(sel);
        merged
            .attr('fill', (d) => TYPES[d.type]?.color || '#2A303B')
            .attr('stroke', (d) => (this.emphasis.has(d.id) ? IVORY : INK))
            .attr('stroke-width', (d) => (this.emphasis.has(d.id) ? 1.8 : 0.8));
        merged
            .transition(t)
            .attr('cx', (d) => this._cx(d))
            .attr('cy', (d) => this._cy(d))
            .attr('r', (d) => this._radius(d))
            .attr('fill-opacity', (d) => this._opacity(d));
        merged.filter((d) => this.emphasis.has(d.id)).raise();

        this._renderLabels(t);
        this._renderTrails();
        this._buildIndex();
        if (this.hoverId) this._placeRing(this.hoverId);
    }

    _renderLabels(t) {
        const ids = new Set([...this.labels, ...this.emphasis]);
        if (this.hoverId) ids.add(this.hoverId);
        const byId = new Map(this.points.map((p) => [p.id, p]));
        const items = [...ids].map((id) => byId.get(id)).filter(Boolean);
        const mini = this.o.variant === 'mini';
        const fontSize = mini ? 11 : this.width < 520 ? 11.5 : 12.5;

        // Basit çakışma önleme: aynı bölgedeki etiketleri dikeyde it
        const placed = [];
        const pos = new Map();
        items
            .map((d) => ({ d, x: this._cx(d), y: this._cy(d) }))
            .sort((a, b) => a.y - b.y)
            .forEach(({ d, x, y }) => {
                const name = countryName(d.id, { short: true });
                const wEst = name.length * fontSize * 0.56;
                const right = x + 10 + wEst < this.plot.x1 - 2;
                let ly = y + 4;
                const lx0 = right ? x + 10 : x - 10 - wEst;
                for (let guard = 0; guard < 6; guard++) {
                    const hit = placed.find((p) => Math.abs(p.y - ly) < fontSize + 1 && lx0 < p.x1 && lx0 + wEst > p.x0);
                    if (!hit) break;
                    ly = hit.y + fontSize + 2;
                }
                placed.push({ x0: lx0, x1: lx0 + wEst, y: ly });
                pos.set(d.id, { x: right ? x + 10 : x - 10, y: ly, anchor: right ? 'start' : 'end', name });
            });

        const sel = this.gLabels.selectAll('text.pt-label').data(items, (d) => d.id);
        sel.exit().remove();
        const enter = sel.enter().append('text').attr('class', 'pt-label');
        enter
            .merge(sel)
            .text((d) => pos.get(d.id).name)
            .attr('font-size', fontSize)
            .attr('text-anchor', (d) => pos.get(d.id).anchor)
            .transition(t)
            .attr('x', (d) => pos.get(d.id).x)
            .attr('y', (d) => pos.get(d.id).y)
            .attr('opacity', (d) => (this.filter && !this.filter.has(d.type) ? 0.25 : 1));
    }

    _renderTrails() {
        if (!this.x) return;
        const d3 = this.d3;
        const line = d3
            .line()
            .x((p) => this._cx(p))
            .y((p) => this._cy(p))
            .curve(d3.curveCatmullRom.alpha(0.5));
        const groups = this.gTrails.selectAll('g.trail-g').data(this.trails, (d) => d.id);
        groups.exit().remove();
        const enter = groups.enter().append('g').attr('class', 'trail-g');
        enter.append('path').attr('class', 'trail');
        enter.append('g').attr('class', 'trail-dots');
        enter.append('text').attr('class', 'trail-year');
        const merged = enter.merge(groups);
        merged.each((tr, i, nodes) => {
            const g = d3.select(nodes[i]);
            const pts = tr.points || [];
            g.select('path.trail')
                .attr('d', pts.length > 1 ? line(pts) : null)
                .attr('stroke', tr.color || IVORY)
                .attr('stroke-opacity', tr.opacity ?? 0.72);
            const every = Math.max(1, Math.ceil(pts.length / (this.o.variant === 'mini' ? 8 : 14)));
            const dots = g
                .select('g.trail-dots')
                .selectAll('circle')
                .data(pts.filter((p, j) => j % every === 0 && j !== pts.length - 1));
            dots.exit().remove();
            dots.enter()
                .append('circle')
                .attr('class', 'trail-dot')
                .attr('r', 2.1)
                .merge(dots)
                .attr('cx', (p) => this._cx(p))
                .attr('cy', (p) => this._cy(p))
                .attr('fill', (p) => (tr.colorDots ? TYPES[p.type]?.color : tr.color || IVORY));
            const first = pts[0];
            g.select('text.trail-year')
                .attr('x', first ? this._cx(first) + 6 : 0)
                .attr('y', first ? this._cy(first) + 14 : 0)
                .text(first && pts.length > 1 && tr.showStart !== false ? first.year : '');
        });
    }

    // ------------------------------------------------------------- etkileşim
    _buildIndex() {
        const visible = this.points.filter((p) => !this.filter || this.filter.has(p.type));
        this.indexed = visible;
        this.delaunay = visible.length ? this.d3.Delaunay.from(visible, (p) => this._cx(p), (p) => this._cy(p)) : null;
    }

    _nearest(event) {
        if (!this.delaunay) return null;
        const [mx, my] = this.d3.pointer(event, this.svg.node());
        const i = this.delaunay.find(mx, my);
        const p = this.indexed[i];
        if (!p) return null;
        const dist = Math.hypot(this._cx(p) - mx, this._cy(p) - my);
        const limit = event.pointerType === 'touch' ? 26 : 16;
        return dist <= limit ? p : null;
    }

    _onMove(event) {
        const p = this._nearest(event);
        this._setHover(p?.id ?? null, event);
        if (p) moveTip(event.clientX, event.clientY);
    }

    _onClick(event) {
        const p = this._nearest(event);
        if (!p) {
            this._setHover(null);
            return;
        }
        const touch = event.pointerType === 'touch' || (event.sourceCapabilities && event.sourceCapabilities.firesTouchEvents);
        if (touch && this.lastTap !== p.id) {
            this.lastTap = p.id;
            this._setHover(p.id, event);
            return;
        }
        this.lastTap = null;
        this.o.onClick?.(p);
    }

    _setHover(id, event) {
        if (id === this.hoverId) return;
        this.hoverId = id;
        if (!id) {
            this.ring.attr('opacity', 0);
            hideTip();
            this.svg.style('cursor', null);
            this._renderLabels(this.svg.transition().duration(0));
            this.o.onHover?.(null);
            return;
        }
        this.svg.style('cursor', 'pointer');
        this._placeRing(id);
        const p = this.points.find((q) => q.id === id);
        if (this.o.tooltip && p && event) showTip(this.o.tooltip(p), event.clientX, event.clientY);
        this._renderLabels(this.svg.transition().duration(0));
        this.o.onHover?.(p);
    }

    _placeRing(id) {
        const p = this.points.find((q) => q.id === id);
        if (!p) return;
        this.ring
            .attr('cx', this._cx(p))
            .attr('cy', this._cy(p))
            .attr('r', this._radius(p) + 4)
            .attr('opacity', 0.9)
            .raise();
    }

    destroy() {
        this.ro.disconnect();
        hideTip();
        this.svg.remove();
    }
}

/** Standart ipucu içeriği */
export function corridorTipHTML(p, extra = '') {
    const t = TYPES[p.type];
    return `<div class="tip-title">${countryName(p.id)}</div>
        <div class="tip-type t-${p.type}">${t ? t.long : 'Veri yok'} · ${p.year}</div>
        <div class="tip-grid"><span>Devletin gücü</span><span class="v">${fmt(p.y)}</span><span>Toplumun gücü</span><span class="v">${fmt(p.x)}</span></div>${extra}`;
}

function fmt(v) {
    const s = Math.abs(v).toFixed(2).replace('.', ',');
    return (v > 0.004 ? '+' : v < -0.004 ? '−' : '') + s;
}
