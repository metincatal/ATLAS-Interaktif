/**
 * Özgürlük Dengesi — oyun sonu raporu. Oyun ekranı ve tekrar sayfası ortak kullanır.
 */

import { icon } from '../../core/icons.js';
import { esc } from '../../core/dom.js';
import { db, corridorYear, corridorSeries, countryName } from '../../core/data.js';
import { TYPES, typeChip } from '../../core/theory.js';
import { signed, num } from '../../core/format.js';
import { href } from '../../core/router.js';
import { CorridorChart } from '../../components/corridor-chart.js';
import { copyText, appURL } from '../../components/share.js';
import { DIFFICULTY, finalReport, ENDINGS } from './engine.js';
import { encodeGame } from './replay-code.js';
import { corridorStrip, dayLabel, signedInt } from './daily.js';

/** Paylaşım metni: sonuç, yıl yıl koridor şeridi ve doğrulanabilir tekrar bağlantısı */
export function shareText(s, r, link) {
    const head = s.mode === 'gunluk' && s.daily ? `ATLAS İnteraktif · Günün senaryosu #${s.daily.number} · ${dayLabel(s.daily.key)}` : 'ATLAS İnteraktif · Özgürlük Dengesi';
    const parts = [];
    if (r.margin !== null) parts.push(`Tarihe karşı ${signedInt(r.margin)}`);
    parts.push(`Not ${r.grade}`, `Puan ${r.score}`, `Koridorda ${r.corridorYears} yıl`);
    return [head, `${countryName(s.id)} ${s.startYear} · ${r.years} yıl · ${DIFFICULTY[s.difficulty].label}`, parts.join(' · '), corridorStrip(s.history), link].join('\n');
}

export function replayLink(s, r = finalReport(s)) {
    return appURL(href('/oyun/tekrar', { k: encodeGame(s), p: r.score }));
}

function stat(label, value, sub = '', cls = '') {
    return `<div class="card report-stat ${cls}"><span class="tiny faint">${label}</span><span class="serif report-val">${value}</span>${sub ? `<span class="tiny faint">${sub}</span>` : ''}</div>`;
}

function realSentence(id, real) {
    const a = real[0];
    const b = real[real.length - 1];
    const range = `${a.year}–${b.year}`;
    const name = countryName(id);
    if (a.type === b.type) return `Gerçekte ${name}, ${range} arasında ${TYPES[a.type].short} bölgede kaldı.`;
    return `Gerçekte ${name}, ${range} arasında ${TYPES[a.type].short} bölgeden ${TYPES[b.type].short} bölgeye geçti.`;
}

function marginSentence(r) {
    if (r.margin === null) return 'Oyun verinin bittiği yıldan sonrasına uzandığı için gerçek tarihle karşılaştırılamadı.';
    const per = r.margin / Math.max(1, r.marginYears);
    const years = `${r.marginYears} yılda`;
    if (per >= 3) return `${years} gerçek tarihten açık ara iyi yönettiniz (yılda ortalama ${signedInt(per)} puan).`;
    if (per >= 0.5) return `${years} gerçek tarihten biraz daha iyi yönettiniz.`;
    if (per > -0.5) return `${years} gerçek tarihle başa baş gittiniz.`;
    return `${years} gerçekte olanın gerisinde kaldınız.`;
}

function strip(types) {
    return `<div class="type-strip" role="img" aria-label="Yıllara göre Leviathan tipi">${types.map((t) => `<span class="t-${t.type}" title="${t.year}: ${TYPES[t.type].short}"></span>`).join('')}</div>`;
}

/**
 * Raporu kök elemana çizer.
 * options.banner: raporun üstüne eklenecek HTML (ör. tekrar doğrulaması)
 * options.note: paylaşım kartına eklenecek açıklama
 * options.actions: [{ label, icon, onClick, primary }]
 */
export function renderReport(root, s, { banner = '', note = '', actions = [] } = {}) {
    const r = finalReport(s);
    const ending = ENDINGS[r.ending];
    const real = corridorSeries(s.id).filter((p) => p.year >= s.startYear && p.year <= s.year);
    const link = replayLink(s, r);
    const text = shareText(s, r, link);
    const eyebrow = s.mode === 'gunluk' && s.daily ? `Günün senaryosu #${s.daily.number} · ` : '';
    const realTypes = [{ year: s.history[0].year, type: s.history[0].type }, ...s.hist.filter((h) => h.year <= s.year)];

    root.innerHTML = `
        <div class="container gp-report">
            ${banner}
            <section class="card report-hero">
                <div class="grade grade-${r.grade}" aria-label="Not ${r.grade}">${r.grade}</div>
                <div class="stack grow" style="gap:8px">
                    <span class="eyebrow">${eyebrow}${esc(countryName(s.id))} · ${s.startYear}–${s.year} · ${DIFFICULTY[s.difficulty].label}</span>
                    <h1 class="display-2">${esc(r.title)}</h1>
                    <p class="lede" style="max-width:640px">${esc(r.ending === 'complete' ? r.text : ending.text)}</p>
                    <div class="row" style="gap:8px;flex-wrap:wrap">${typeChip(r.startType, { small: true, label: `Başlangıç: ${TYPES[r.startType].short}` })}${icon('arrowR', 'icon-sm')}${typeChip(r.endType, { small: true, label: `Bitiş: ${TYPES[r.endType].short}` })}</div>
                </div>
                ${
                    r.margin !== null
                        ? `<div class="report-margin ${r.margin >= 0 ? 'pos' : 'neg'}"><span class="tiny faint">Tarihe karşı</span><span class="serif">${signedInt(r.margin)}</span><span class="tiny faint">${r.marginYears} yıl</span></div>`
                        : ''
                }
            </section>
            <div class="report-stats">
                ${stat('Koridorda geçen yıl', `${r.corridorYears} / ${r.years}`, `${r.runYears} yıl birlikte koştunuz`)}
                ${stat('Puan', `${r.score}`, `yıllık ort. ${num(r.avg, 1)}`)}
                ${stat('Tarihe karşı', r.margin === null ? '—' : signedInt(r.margin), r.margin === null ? 'karşılaştırma yok' : `gerçekte ${r.histScore} puan`, r.margin === null ? '' : r.margin >= 0 ? 'is-pos' : 'is-neg')}
                ${stat('Özgürlük endeksi', `${num(r.liberty[0])} → ${num(r.liberty[1])}`)}
                ${stat('Devlet · toplum', `${signed(r.dy, 1)} · ${signed(r.dx, 1)}`, 'güçteki değişim')}
                ${stat('Kriz', `${r.crises}`)}
            </div>
            <div class="report-grid">
                <section class="card card-pad stack" style="gap:10px">
                    <div class="card-title"><span>Sizin rotanız${real.length > 1 ? ' ve gerçek tarih' : ''}</span><span class="hint">${real.length > 1 ? 'kesikli çizgi: gerçekte olan' : ''}</span></div>
                    <div class="report-chart" data-report-chart></div>
                    <p class="tiny faint">${esc(real.length > 1 ? `${realSentence(s.id, real)} ${marginSentence(r)}` : marginSentence(r))}</p>
                </section>
                <div class="stack" style="gap:16px;min-width:0">
                    <section class="card card-pad stack" style="gap:10px">
                        <div class="card-title"><span>Yıl yıl</span></div>
                        <div class="strip-rows">
                            <span class="tiny faint">Siz</span>${strip(s.history)}
                            ${realTypes.length > 1 ? `<span class="tiny faint">Gerçekte</span>${strip(realTypes)}` : ''}
                        </div>
                        <div class="row tiny faint" style="justify-content:space-between"><span>${s.startYear}</span><span>${s.year}</span></div>
                        <ol class="gp-log" style="max-height:260px">${
                            s.log
                                .filter((l) => ['type', 'crisis', 'event'].includes(l.kind))
                                .slice(0, 14)
                                .map((l) => `<li><span class="mono tiny faint">${l.year}</span><span class="stack" style="gap:2px"><span class="small">${esc(l.title)}</span>${l.detail ? `<span class="tiny faint">${esc(l.detail)}</span>` : ''}</span></li>`)
                                .join('') || '<li class="tiny faint">Kayda değer olay yok.</li>'
                        }</ol>
                    </section>
                    <section class="card card-pad stack report-share" style="gap:10px" aria-labelledby="rp-share">
                        <div class="card-title"><span id="rp-share" class="row" style="gap:8px">${icon('share', 'icon-sm')}Paylaş</span><span class="hint">tekrar bağlantısı puanı doğrular</span></div>
                        <pre class="share-text">${esc(text)}</pre>
                        ${note ? `<p class="tiny faint">${note}</p>` : ''}
                        <div class="row" style="gap:8px;flex-wrap:wrap">
                            <button class="btn btn-secondary btn-sm" type="button" data-copy-text>${icon('copy', 'icon-sm')}Sonucu kopyala</button>
                            <button class="btn btn-ghost btn-sm" type="button" data-copy-link>${icon('link', 'icon-sm')}Tekrar bağlantısı</button>
                        </div>
                    </section>
                </div>
            </div>
            <div class="row report-actions" data-actions></div>
        </div>`;

    const chart = new CorridorChart(root.querySelector('[data-report-chart]'), { variant: 'mini', pointRadius: 2.2, baseOpacity: 0.22, interactive: false });
    const worldYear = Math.min(s.year, db.lastYear);
    chart.setPoints([...corridorYear(worldYear).filter((p) => p.id !== s.id), { id: s.id, x: s.x, y: s.y, type: s.type, year: s.year }], { duration: 0 });
    chart.setEmphasis([s.id]);
    const trails = [{ id: 'player', points: s.history.map((h) => ({ year: h.year, x: h.x, y: h.y, type: h.type })), colorDots: true }];
    if (real.length > 1) trails.push({ id: 'real', points: real, color: '#86AEFF', opacity: 0.6, showStart: false });
    chart.setTrails(trails);
    chart.svg.selectAll('g.trail-g').filter((d) => d.id === 'real').select('path').attr('stroke-dasharray', '4 4');

    root.querySelector('[data-copy-text]').addEventListener('click', () => copyText(text, 'Sonuç panoya kopyalandı.'));
    root.querySelector('[data-copy-link]').addEventListener('click', () => copyText(link, 'Tekrar bağlantısı panoya kopyalandı.'));
    const bar = root.querySelector('[data-actions]');
    for (const a of actions) {
        const el = document.createElement(a.href ? 'a' : 'button');
        el.className = `btn ${a.primary ? 'btn-primary' : a.ghost ? 'btn-ghost' : 'btn-secondary'}`;
        if (a.href) el.href = a.href;
        else el.type = 'button';
        el.innerHTML = `${a.icon ? icon(a.icon) : ''}${esc(a.label)}`;
        if (a.onClick) el.addEventListener('click', a.onClick);
        bar.append(el);
    }
    return { chart, report: r, text, link };
}
