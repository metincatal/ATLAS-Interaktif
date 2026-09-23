/**
 * Veri katmanı — data/web/ altındaki hafif JSON dosyalarını yükler,
 * önbelleğe alır ve hızlı erişim yardımcıları sunar.
 */

import { fold } from './format.js';

/** Yerelde depo kökünden (/src/web/) ya da yayında (site kökü) çalışır */
const DATA_BASE = location.pathname.includes('/src/web/') ? '../../data/web/' : 'data/web/';

const cache = new Map();

export async function getJSON(path) {
    if (cache.has(path)) return cache.get(path);
    const promise = fetch(DATA_BASE + path)
        .then((response) => {
            if (!response.ok) throw new Error(`${path} yüklenemedi (HTTP ${response.status})`);
            return response.json();
        })
        .catch((error) => {
            cache.delete(path);
            throw error;
        });
    cache.set(path, promise);
    return promise;
}

// ---------------------------------------------------------------------------
// Çekirdek veri: ülkeler, dar koridor serisi, meta
// ---------------------------------------------------------------------------

export const db = {
    ready: false,
    countries: {},
    corridor: null,
    meta: null,
    types: ['Shackled', 'Despotic', 'Paper', 'Absent'],
    years: [],
    firstYear: 1789,
    lastYear: 2023,
};

const seriesMap = new Map(); // id -> Map(year -> row)
const yearCache = new Map(); // year -> [{id, x, y, t}]

let corePromise = null;

export function loadCore() {
    if (!corePromise) {
        corePromise = Promise.all([getJSON('countries.json'), getJSON('corridor.json'), getJSON('meta.json')]).then(
            ([countries, corridor, meta]) => {
                db.countries = countries;
                db.corridor = corridor;
                db.meta = meta;
                db.types = corridor.types;
                db.years = corridor.years;
                db.firstYear = corridor.years[0];
                db.lastYear = corridor.years[corridor.years.length - 1];
                for (const [id, rows] of Object.entries(corridor.series)) {
                    const m = new Map();
                    for (const row of rows) m.set(row[0], row);
                    seriesMap.set(id, m);
                }
                db.ready = true;
                return db;
            },
        );
        corePromise.catch(() => {
            corePromise = null;
        });
    }
    return corePromise;
}

/**
 * Bir ülkenin belirli yıldaki koridor konumu. Veri olmayan yıllarda
 * (ör. WGI'ın iki yılda bir yayımlandığı 1997, 1999, 2001) en yakın önceki
 * yıl kullanılır.
 */
export function corridorAt(id, year, tolerance = 2) {
    const m = seriesMap.get(id);
    if (!m) return null;
    for (let y = year; y >= year - tolerance; y--) {
        const row = m.get(y);
        if (row) return { id, year: row[0], x: row[1], y: row[2], type: db.types[row[3]], exact: y === year };
    }
    return null;
}

export function corridorSeries(id) {
    const rows = db.corridor?.series[id];
    if (!rows) return [];
    return rows.map((r) => ({ year: r[0], x: r[1], y: r[2], type: db.types[r[3]] }));
}

export function corridorYear(year) {
    if (yearCache.has(year)) return yearCache.get(year);
    const out = [];
    for (const id of seriesMap.keys()) {
        const p = corridorAt(id, year);
        if (p) out.push(p);
    }
    yearCache.set(year, out);
    return out;
}

export function typeCounts(year) {
    const counts = { Shackled: 0, Despotic: 0, Paper: 0, Absent: 0 };
    for (const p of corridorYear(year)) counts[p.type]++;
    return counts;
}

/**
 * Denge: koridor eksenine (Kâğıttan → Zincirlenmiş küme merkezleri) dik uzaklık.
 * Pozitif: devlet toplumun önünde (Despotik yöne), negatif: toplum devletin
 * önünde (Namevcut yöne). Verideki eksen 45° olmadığı için basit "devlet − toplum"
 * farkı yanıltıcı olur.
 */
export function corridorGap(x, y) {
    const [px, py] = db.corridor.centroids.Paper;
    const [sx, sy] = db.corridor.centroids.Shackled;
    const dx = sx - px;
    const dy = sy - py;
    const n = Math.hypot(dx, dy) || 1;
    return ((x - px) * -dy + (y - py) * dx) / n;
}

/** Bir ülkenin koridor verisinin kapsadığı yıllar */
export function corridorRange(id) {
    const rows = db.corridor?.series[id];
    if (!rows?.length) return null;
    return [rows[0][0], rows[rows.length - 1][0]];
}

/** Tip değişimlerini döndürür: [{year, from, to}] */
export function typeChanges(id) {
    const rows = db.corridor?.series[id] || [];
    const out = [];
    for (let i = 1; i < rows.length; i++) {
        if (rows[i][3] !== rows[i - 1][3]) {
            out.push({ year: rows[i][0], from: db.types[rows[i - 1][3]], to: db.types[rows[i][3]] });
        }
    }
    return out;
}

// ---------------------------------------------------------------------------
// Ülke yardımcıları
// ---------------------------------------------------------------------------

export function country(id) {
    return db.countries[id] || null;
}

export function countryName(id, { short = false } = {}) {
    const c = db.countries[id];
    if (!c) return id;
    return (short && c.short) || c.tr || c.en || id;
}

export function histName(id, year) {
    const c = db.countries[id];
    if (!c?.hist) return null;
    const p = c.hist.find(([a, b]) => year >= a && year <= b);
    return p ? p[2] : null;
}

export function capitalAt(id, year) {
    const c = db.countries[id];
    if (!c?.capitals) return null;
    const p = c.capitals.find(([a, b]) => year >= a && year <= b);
    return p ? { name: p[2], lat: p[3], lng: p[4] } : null;
}

export function flagURL(id, width = 80) {
    const iso2 = db.countries[id]?.iso2;
    return iso2 ? `https://flagcdn.com/w${width}/${iso2}.png` : null;
}

/** Bayrak için <img> ya da yer tutucu işaretlemesi */
export function flagHTML(id, cls = '') {
    const url = flagURL(id, 80);
    if (!url) return `<span class="flag placeholder ${cls}" aria-hidden="true">${id.slice(0, 2)}</span>`;
    return `<img class="flag ${cls}" src="${url}" srcset="${flagURL(id, 160)} 2x" alt="" loading="lazy" decoding="async" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'flag placeholder ${cls}',textContent:'${id.slice(0, 2)}'}))">`;
}

let searchIndex = null;

/** Türkçe ve İngilizce adlarda arama; önce ada göre başlayanlar */
export function searchCountries(query, { limit = 12, filter = null } = {}) {
    if (!searchIndex) {
        searchIndex = Object.entries(db.countries)
            .filter(([, c]) => c.corridor || c.onMap)
            .map(([id, c]) => ({ id, tr: fold(c.tr), en: fold(c.en), short: fold(c.short || ''), hist: (c.hist || []).map(([a, b, name]) => ({ name: fold(name), years: b - a + 1 })) }));
    }
    const q = fold(query.trim());
    const pool = filter ? searchIndex.filter((e) => filter(e.id)) : searchIndex;
    if (!q) {
        return pool
            .filter((e) => db.countries[e.id].corridor)
            .sort((a, b) => a.tr.localeCompare(b.tr, 'tr'))
            .slice(0, limit)
            .map((e) => e.id);
    }
    const scored = [];
    for (const e of pool) {
        let score = -1;
        if (e.tr.startsWith(q) || e.short.startsWith(q)) score = 0;
        else if (e.en.startsWith(q)) score = 1;
        else if (e.tr.split(/[\s-]/).some((w) => w.startsWith(q))) score = 2;
        else if (e.tr.includes(q) || e.en.includes(q)) score = 3;
        else if (e.id.toLowerCase() === q) score = 1;
        else if (q.length > 2) {
            // Tarihî ad eşleşmesi: o adla geçen süre uzun olan önce gelir (osmanlı → Türkiye)
            const years = Math.max(0, ...e.hist.filter((h) => h.name.includes(q)).map((h) => h.years));
            if (years) score = 4 + 1 / (1 + years);
        }
        if (score >= 0) scored.push([score, e]);
    }
    scored.sort((a, b) => a[0] - b[0] || a[1].tr.localeCompare(b[1].tr, 'tr'));
    return scored.slice(0, limit).map(([, e]) => e.id);
}

// ---------------------------------------------------------------------------
// Katmanlar: WGI ve V-Dem
// ---------------------------------------------------------------------------

let wgi = null;
let wgiYearIndex = null;

export async function loadWGI() {
    if (wgi) return wgi;
    wgi = await getJSON('wgi.json');
    wgiYearIndex = new Map();
    const first = wgi.years[0];
    const last = wgi.years[wgi.years.length - 1];
    for (let y = first; y <= last; y++) {
        let idx = wgi.years.indexOf(y);
        if (idx === -1) idx = wgi.years.findLastIndex((yy) => yy < y);
        wgiYearIndex.set(y, idx);
    }
    return wgi;
}

export function wgiAt(ind, id, year) {
    if (!wgi) return null;
    const idx = wgiYearIndex.get(year);
    if (idx === undefined || idx < 0) return null;
    const v = wgi.data[ind]?.[id]?.[idx];
    return v === undefined ? null : v;
}

export function wgiSeries(ind, id) {
    if (!wgi) return [];
    const arr = wgi.data[ind]?.[id];
    if (!arr) return [];
    return wgi.years.map((y, i) => ({ year: y, value: arr[i] })).filter((d) => d.value !== null);
}

const vdem = new Map();

export async function loadVdem(ind) {
    if (vdem.has(ind)) return vdem.get(ind);
    const data = await getJSON(`vdem/${ind}.json`);
    vdem.set(ind, data);
    return data;
}

export function vdemAt(ind, id, year) {
    const d = vdem.get(ind);
    if (!d) return null;
    const v = d.data[id]?.[year - d.start];
    return v === undefined ? null : v;
}

export function vdemSeries(ind, id) {
    const d = vdem.get(ind);
    const arr = d?.data[id];
    if (!arr) return [];
    return arr.map((v, i) => ({ year: d.start + i, value: v })).filter((x) => x.value !== null);
}

// ---------------------------------------------------------------------------
// Tarihî sınırlar ve oyun verisi
// ---------------------------------------------------------------------------

export function borderMilestoneFor(year) {
    const ms = db.meta?.borders || [];
    let best = null;
    for (const m of ms) if (m.year <= year) best = m;
    return best || ms[0] || null;
}

export function loadBorders(milestoneYear) {
    return getJSON(`borders/${milestoneYear}.json`);
}

export function loadGameCountry(id) {
    return getJSON(`game/${id}.json`);
}

export function loadWorld() {
    return getJSON('world.geojson');
}
