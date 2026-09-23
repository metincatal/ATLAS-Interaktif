/**
 * Giriş sayfası
 */

import { icon } from '../core/icons.js';
import { db, loadCore, corridorYear, corridorSeries, typeCounts } from '../core/data.js';
import { TYPES, TYPE_ORDER } from '../core/theory.js';
import { int, suffix } from '../core/format.js';
import { navigate, href } from '../core/router.js';
import { CorridorChart, corridorTipHTML } from '../components/corridor-chart.js';
import { showTip, moveTip, hideTip } from '../components/tooltip.js';

const HIGHLIGHT = ['TUR', 'NOR', 'CHN', 'RUS', 'BRA', 'SOM', 'VEN', 'IND', 'USA'];

export async function mount(root) {
    await loadCore();
    const year = db.lastYear;
    const points = corridorYear(year);
    const counts = typeCounts(year);
    const obs = Object.values(db.corridor.series).reduce((a, s) => a + s.length, 0);
    const nCountries = Object.keys(db.corridor.series).length;

    root.innerHTML = `
    <section class="home-hero container">
        <div class="home-copy">
            <div class="row eyebrow-row"><span class="dot-accent"></span><span class="eyebrow">Acemoğlu &amp; Robinson · 2024 Nobel Ekonomi Ödülü</span></div>
            <h1 class="display-1">Özgürlük, devlet ile toplum arasındaki <em class="accent-em">dar bir koridorda</em> yaşar.</h1>
            <p class="lede">ATLAS İnteraktif, <em>Ulusların Düşüşü</em> ve <em>Dar Koridor</em>’un fikirlerini ${nCountries} ülkenin ${db.lastYear - db.firstYear + 1} yıllık verisiyle keşfetmenizi sağlar. Haritada gezinin, ülkelerin koridordaki yolculuğunu izleyin, sonra oyunlarda kuramı kendiniz deneyin.</p>
            <div class="row home-ctas">
                <a class="btn btn-primary btn-lg" href="#/atlas">Atlası aç${icon('arrowR')}</a>
                <a class="btn btn-secondary btn-lg" href="#/kuram">${icon('book')}Kuramı keşfet</a>
            </div>
            <dl class="home-stats">
                <div><dt>ülke ve tarihî birim</dt><dd>${nCountries}</dd></div>
                <div><dt>yıllık gözlem</dt><dd>${db.firstYear}–${db.lastYear}</dd></div>
                <div><dt>ülke-yıl konumu</dt><dd>${int(obs)}</dd></div>
                <div><dt>Leviathan tipi</dt><dd>4</dd></div>
            </dl>
        </div>
        <figure class="home-figure">
            <div class="card home-chart-card">
                <div class="home-chart-head">
                    <div class="row"><span class="serif" style="font-size:22px">${year}</span><span class="tiny faint">${points.length} ülke · her nokta bir ülke</span></div>
                    <a class="small row" style="gap:6px;text-decoration:none" href="${href('/koridor', { y: year, c: 'TUR' })}">Gözlemevinde aç${icon('arrowR', 'icon-sm')}</a>
                </div>
                <div class="home-chart" data-chart></div>
            </div>
            <figcaption class="tiny faint row"><span class="caption-line"></span>Beyaz çizgi: Türkiye’nin 1996–${year} rotası. Bölgeler verideki dört kümeyi gösterir. Bir noktaya tıklayarak ülke profilini açın.</figcaption>
        </figure>
    </section>

    <section class="container home-sections" aria-label="Bölümler">
        ${entry('globe', 'Harita', 'Atlas', 'Leviathan tiplerini, yönetişim ve demokrasi göstergelerini küre üzerinde yıl yıl izleyin.', '#/atlas')}
        ${entry('corridor', 'Grafik', 'Dar Koridor Gözlemevi', 'Zamanı oynatın; ülkelerin devlet–toplum düzlemindeki rotalarını karşılaştırın.', '#/koridor')}
        ${entry('scale', 'Oyun', 'Üç oyun', 'Bir ülkeyi yönetip tarihi geçmeye çalışın, bir arkadaşınıza karşı Kızıl Kraliçe düellosu oynayın ya da günlük Leviathan Avı’nda ülkeyi rotasından bulun.', '#/oyun')}
        ${entry('book', 'Okuma', 'Kuram', 'Kapsayıcı ve sömürücü kurumlar, dört Leviathan ve Kızıl Kraliçe etkisi.', '#/kuram')}
    </section>

    <section class="container home-world">
        <div class="home-world-head">
            <div class="stack" style="gap:8px">
                <span class="eyebrow">Bir bakışta</span>
                <h2 class="display-2">Dünya iki yüzyılda nasıl değişti?</h2>
                <p class="muted" style="max-width:640px">Her yıl ülkelerin hangi Leviathan tipinde olduğunun payı. Veri kapsamı zamanla genişler: ${suffix(db.firstYear, 'de')} ${corridorYear(db.firstYear).length}, ${suffix(year, 'de')} ${points.length} ülke.</p>
            </div>
            <div class="home-dist" aria-label="${year} dağılımı">
                ${TYPE_ORDER.map((t) => `<div class="home-dist-row t-${t}"><span class="swatch"></span><span class="grow">${TYPES[t].long}</span><span class="mono">${counts[t]}</span></div>`).join('')}
            </div>
        </div>
        <div class="card home-area" data-area></div>
    </section>

    <footer class="site-footer">
        <div class="container">
            <span>Veri: V-Dem v15 · Dünya Bankası WGI · Natural Earth · Historical Basemaps · CShapes 2.0</span>
            <span><a href="https://github.com/metincatal/ATLAS-Interaktif" target="_blank" rel="noopener">Kaynak kodu</a> · Bu site kitapların yazarlarıyla bağlantılı değildir.</span>
        </div>
    </footer>`;

    const chartEl = root.querySelector('[data-chart]');
    const chart = new CorridorChart(chartEl, {
        pointRadius: 4.6,
        ariaLabel: `${year} yılında ${points.length} ülkenin devlet ve toplum gücüne göre dağılımı`,
        tooltip: (p) => corridorTipHTML(p, '<div class="tip-hint">Profili açmak için tıklayın</div>'),
        onClick: (p) => navigate('/atlas', { c: p.id, y: year }),
    });
    chart.setPoints(points);
    chart.setLabels(HIGHLIGHT);
    chart.setTrails([{ id: 'TUR', points: corridorSeries('TUR').filter((p) => p.year >= 1996 && p.year <= year) }]);

    const area = drawArea(root.querySelector('[data-area]'));
    const ro = new ResizeObserver(() => area.redraw());
    ro.observe(root.querySelector('[data-area]'));

    return {
        unmount() {
            chart.destroy();
            ro.disconnect();
            hideTip();
        },
    };
}

function entry(ic, kicker, title, text, link) {
    return `<a class="home-entry card" href="${link}">
        <div class="row" style="justify-content:space-between"><span class="entry-icon">${icon(ic)}</span><span class="faint">${icon('arrowUR')}</span></div>
        <div class="stack" style="gap:6px"><span class="eyebrow">${kicker}</span><span class="title-2">${title}</span><span class="small muted">${text}</span></div>
    </a>`;
}

/** 1789–son yıl: Leviathan tiplerinin payı (yüzde yığılmış alan grafiği) */
function drawArea(el) {
    const d3 = window.d3;
    const rows = db.years.map((y) => {
        const c = typeCounts(y);
        const total = TYPE_ORDER.reduce((a, t) => a + c[t], 0) || 1;
        return { year: y, total, ...Object.fromEntries(TYPE_ORDER.map((t) => [t, c[t] / total])) };
    });
    const order = ['Shackled', 'Absent', 'Paper', 'Despotic'];
    const series = d3.stack().keys(order)(rows);

    let lastW = 0;
    const redraw = () => {
        const w = el.clientWidth;
        if (w === lastW) return;
        lastW = w;
        const h = Math.max(220, Math.min(320, w * 0.28));
        if (!w) return;
        const pad = { l: 44, r: 16, t: 16, b: 30 };
        const x = d3.scaleLinear().domain([db.firstYear, db.lastYear]).range([pad.l, w - pad.r]);
        const y = d3.scaleLinear().domain([0, 1]).range([h - pad.b, pad.t]);
        const area = d3
            .area()
            .x((d) => x(d.data.year))
            .y0((d) => y(d[0]))
            .y1((d) => y(d[1]))
            .curve(d3.curveMonotoneX);
        el.innerHTML = '';
        const svg = d3.select(el).append('svg').attr('class', 'chart-svg').attr('viewBox', `0 0 ${w} ${h}`).attr('height', h).attr('role', 'img').attr('aria-label', 'Yıllara göre Leviathan tiplerinin payı');
        svg.append('g')
            .selectAll('path')
            .data(series)
            .join('path')
            .attr('d', area)
            .attr('fill', (d) => TYPES[d.key].color)
            .attr('fill-opacity', 0.78);
        const ticksX = [1800, 1850, 1900, 1950, 2000];
        svg.append('g')
            .selectAll('text')
            .data(ticksX)
            .join('text')
            .attr('class', 'axis-num')
            .attr('x', (d) => x(d))
            .attr('y', h - 8)
            .attr('text-anchor', 'middle')
            .text((d) => d);
        svg.append('g')
            .selectAll('text')
            .data([0, 0.5, 1])
            .join('text')
            .attr('class', 'axis-num')
            .attr('x', pad.l - 8)
            .attr('y', (d) => y(d) + 4)
            .attr('text-anchor', 'end')
            .text((d) => `%${d * 100}`);
        // Olaylar
        const marks = [
            [1848, '1848 devrimleri'],
            [1914, 'I. Dünya Savaşı'],
            [1945, 'II. Dünya Savaşı sonu'],
            [1991, 'SSCB’nin dağılması'],
        ];
        const g = svg.append('g');
        for (const [yr, label] of marks) {
            g.append('line').attr('x1', x(yr)).attr('x2', x(yr)).attr('y1', pad.t).attr('y2', h - pad.b).attr('stroke', '#0A0D12').attr('stroke-opacity', 0.55).attr('stroke-dasharray', '2 3');
            if (w > 560) g.append('text').attr('x', x(yr) + 5).attr('y', pad.t + 12).attr('font-size', 11).attr('fill', '#0A0D12').attr('font-weight', 600).text(label);
        }
        // Etkileşim: dikey imleç + ipucu
        const cursor = svg.append('line').attr('y1', pad.t).attr('y2', h - pad.b).attr('stroke', '#EDE8DF').attr('stroke-width', 1.2).attr('opacity', 0);
        svg.append('rect')
            .attr('x', pad.l)
            .attr('y', pad.t)
            .attr('width', w - pad.l - pad.r)
            .attr('height', h - pad.t - pad.b)
            .attr('fill', 'transparent')
            .on('pointermove', (e) => {
                const [mx] = d3.pointer(e);
                const yr = Math.round(x.invert(mx));
                const row = rows.find((r) => r.year >= yr) || rows[rows.length - 1];
                cursor.attr('x1', x(row.year)).attr('x2', x(row.year)).attr('opacity', 0.8);
                showTip(
                    `<div class="tip-title">${row.year} · ${row.total} ülke</div><div class="tip-grid">${['Shackled', 'Despotic', 'Paper', 'Absent']
                        .map((t) => `<span class="tip-type t-${t}">${TYPES[t].short}</span><span class="v">%${Math.round(row[t] * 100)}</span>`)
                        .join('')}</div>`,
                    e.clientX,
                    e.clientY,
                );
                moveTip(e.clientX, e.clientY);
            })
            .on('pointerleave', () => {
                cursor.attr('opacity', 0);
                hideTip();
            });
    };
    redraw();
    return { redraw };
}
