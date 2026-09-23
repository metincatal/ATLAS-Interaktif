/**
 * Veriden üretilen ülke anlatısı. Sabit metin yerine, seçilen ülke ve yıl
 * için koridor serisinden cümleler kurar.
 */

import { corridorAt, corridorSeries, corridorYear, countryName, corridorGap } from './data.js';
import { TYPES } from './theory.js';
import { num, suffix, pct, pctPoss, pctAbl } from './format.js';

/** Aynı tipte kesintisiz yıl aralıkları */
function runs(series, type) {
    const out = [];
    let start = null;
    let prev = null;
    for (const p of series) {
        if (p.type === type) {
            if (start === null || p.year - prev > 3) {
                if (start !== null) out.push([start, prev]);
                start = p.year;
            }
            prev = p.year;
        } else if (start !== null) {
            out.push([start, prev]);
            start = null;
        }
    }
    if (start !== null) out.push([start, prev]);
    return out;
}

function listYears(ranges) {
    const parts = ranges.map(([a, b]) => (a === b ? `${a}` : `${a}–${b}`));
    if (parts.length <= 1) return parts[0] || '';
    return `${parts.slice(0, -1).join(', ')} ve ${parts[parts.length - 1]}`;
}

function change(delta, noun) {
    const abs = num(Math.abs(delta), 2);
    if (Math.abs(delta) < 0.05) return `${noun} neredeyse aynı kaldı`;
    return `${noun} ${abs} puan ${delta > 0 ? 'arttı' : 'geriledi'}`;
}

export function countryStory(id, year) {
    const name = countryName(id);
    const p = corridorAt(id, year);
    if (!p) return { sentences: [`${suffix(year, 'de')} ${suffix(name, 'in')} koridor konumu için veri yok.`], point: null };

    const series = corridorSeries(id).filter((s) => s.year <= p.year);
    const sentences = [];

    // 1. Son on yıldaki değişim
    const baseTarget = p.year - 10;
    const base = [...series].reverse().find((s) => s.year <= baseTarget) || null;
    if (base && base.year < p.year) {
        const dState = p.y - base.y;
        const dSoc = p.x - base.x;
        sentences.push(`${suffix(base.year, 'den')} bu yana ${change(dSoc, 'toplumun gücü')}, ${change(dState, 'devletin gücü')}.`);
    }

    // 2. Mevcut tipe ne zaman girildi?
    let since = p.year;
    for (let i = series.length - 1; i >= 0; i--) {
        if (series[i].type !== p.type) break;
        since = series[i].year;
    }
    const idx = series.findIndex((s) => s.year === since);
    const prev = idx > 0 ? series[idx - 1] : null;
    if (prev && since !== p.year) {
        sentences.push(`${name}, ${suffix(since, 'de')} ${TYPES[prev.type].short} bölgeden ${TYPES[p.type].short} bölgeye geçti ve o yıldan beri orada.`);
    } else if (prev && since === p.year) {
        sentences.push(`${name} bu yıl ${TYPES[prev.type].short} bölgeden ${TYPES[p.type].short} bölgeye geçti.`);
    } else if (series.length > 1) {
        sentences.push(`${name}, verinin başladığı ${suffix(series[0].year, 'den')} beri ${TYPES[p.type].short} bölgede.`);
    }

    // 3. Zincirlenmiş dönemler
    if (p.type !== 'Shackled') {
        const shackled = runs(series, 'Shackled').filter(([a, b]) => b - a >= 2);
        if (shackled.length) {
            const recent = shackled.slice(-3);
            sentences.push(`${listYears(recent)} yıllarında Zincirlenmiş bölgedeydi.`);
        }
    }

    // 4. Denge
    const gap = corridorGap(p.x, p.y);
    if (gap > 1.1) sentences.push('Devlet, toplumun belirgin biçimde önünde: kuramdaki Kızıl Kraliçe yarışında toplumun geride kaldığı bir tablo.');
    else if (gap < -1.1) sentences.push('Toplum, devletin belirgin biçimde önünde: örgütlü bir toplum var ama kamu kapasitesi geride kalıyor.');
    else if (p.x > 0.3 && p.y > 0.3) sentences.push('Devlet ile toplum hem güçlü hem de görece dengede; koridorun tanımına en yakın durum bu.');
    else if (p.x < -0.3 && p.y < -0.3) sentences.push('Devlet de toplum da dünya ortalamasının gerisinde.');

    // 5. Dünyadaki sırası
    const world = corridorYear(p.year);
    if (world.length > 20) {
        const stateRank = world.filter((w) => w.y < p.y).length / (world.length - 1);
        const socRank = world.filter((w) => w.x < p.x).length / (world.length - 1);
        sentences.push(`${p.year} verisiyle devletin gücü ülkelerin ${pct(stateRank)}’${pctAbl(stateRank)}, toplumun gücü ise ${pct(socRank)}’${pctAbl(socRank)} yüksek.`);
    }

    // 6. Uzun vadeli pay
    if (series.length >= 30) {
        const share = series.filter((s) => s.type === p.type).length / series.length;
        sentences.push(`${suffix(series[0].year, 'den')} bu yana gözlemlerin ${pct(share)}’${pctPoss(share)} ${TYPES[p.type].short} bölgede.`);
    }

    return { sentences, point: p };
}

/** Asistan ve paylaşım için kısa bağlam cümlesi */
export function contextLine(id, year) {
    const p = corridorAt(id, year);
    if (!p) return `${countryName(id)} (${year}): koridor verisi yok.`;
    return `${countryName(id)} (${p.year}): ${TYPES[p.type].long}; devletin gücü ${num(p.y)}, toplumun gücü ${num(p.x)} (yıllık dünya ortalamasına göre z-puanı).`;
}

export { runs };
