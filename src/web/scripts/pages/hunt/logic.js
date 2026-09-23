/**
 * Leviathan Avı — günlük bulmacanın mantığı (DOM'suz)
 *
 * Adı gizli bir ülkenin koridor rotası gösterilir. Her tahminde oyuncuya
 * başkentler arası uzaklık, yön ve iki ülkenin koridor rotalarının ne kadar
 * benzediği söylenir; yanlış tahminler yeni ipuçları açar.
 */

import { db } from '../../core/data.js';
import { load, save } from '../../core/store.js';
import { dayKey, dayNumber, keyFromNumber, hashString, seededOrder, dayLabel } from '../game/daily.js';

export const MAX_GUESSES = 6;
/** Paylaşımda "yakın" sayılan başkentler arası uzaklık (km) */
export const NEAR_KM = 2000;

const CONTINENTS = { Africa: 'Afrika', Asia: 'Asya', Europe: 'Avrupa', 'North America': 'Kuzey Amerika', 'South America': 'Güney Amerika', Oceania: 'Okyanusya' };
const REGIONS = {
    'Australia and New Zealand': 'Avustralya ve Yeni Zelanda',
    Caribbean: 'Karayipler',
    'Central America': 'Orta Amerika',
    'Central Asia': 'Orta Asya',
    'Eastern Africa': 'Doğu Afrika',
    'Eastern Asia': 'Doğu Asya',
    'Eastern Europe': 'Doğu Avrupa',
    Melanesia: 'Melanezya',
    'Middle Africa': 'Orta Afrika',
    'Northern Africa': 'Kuzey Afrika',
    'Northern America': 'Kuzey Amerika',
    'Northern Europe': 'Kuzey Avrupa',
    'South America': 'Güney Amerika',
    'South-Eastern Asia': 'Güneydoğu Asya',
    'Southern Africa': 'Güney Afrika',
    'Southern Asia': 'Güney Asya',
    'Southern Europe': 'Güney Avrupa',
    'Western Africa': 'Batı Afrika',
    'Western Asia': 'Batı Asya',
    'Western Europe': 'Batı Avrupa',
};

export const continentTR = (id) => CONTINENTS[db.countries[id]?.continent] || db.countries[id]?.continent || '—';
export const regionTR = (id) => REGIONS[db.countries[id]?.region] || db.countries[id]?.region || '—';

let poolCache = null;

/** Hedef olabilecek ülkeler: günümüzde var olan, haritada çizilen, başkenti bilinen ve en az 60 yıllık koridor verisi olanlar */
export function huntPool() {
    if (poolCache) return poolCache;
    poolCache = Object.entries(db.countries)
        .filter(([id, c]) => {
            const s = db.corridor?.series?.[id];
            return c.corridor && c.onMap && c.iso2 && c.capitals?.length && CONTINENTS[c.continent] && s && s.length >= 60 && s[s.length - 1][0] >= 2020;
        })
        .map(([id]) => id)
        .sort();
    return poolCache;
}

export function huntPuzzle(key = dayKey()) {
    const pool = huntPool();
    const n = Math.max(1, dayNumber(key));
    const cycle = Math.floor((n - 1) / pool.length);
    const order = seededOrder(pool.length, hashString(`leviathan-avi-${cycle}`));
    return { key, number: n, id: pool[order[(n - 1) % pool.length]] };
}

/** Pratik için rastgele (günlük olmayan) bir hedef; exclude: günün ülkesi */
export function practicePuzzle(seed, exclude = null) {
    const pool = huntPool();
    let id = pool[seed % pool.length];
    if (id === exclude) id = pool[(seed + 1) % pool.length];
    return { key: null, number: null, id, practice: true };
}

// ---------------------------------------------------------------------------
// Coğrafya ve rota karşılaştırması

export function capitalOf(id) {
    const caps = db.countries[id]?.capitals;
    if (!caps?.length) return null;
    const [, , name, lat, lng] = caps[caps.length - 1];
    return { name, lat, lng };
}

const rad = (d) => (d * Math.PI) / 180;

export function distanceKm(a, b) {
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** a'dan b'ye başlangıç yönü (derece, 0 = kuzey, saat yönünde) */
export function bearing(a, b) {
    const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
    const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
    return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
}

const COMPASS = ['kuzey', 'kuzeydoğu', 'doğu', 'güneydoğu', 'güney', 'güneybatı', 'batı', 'kuzeybatı'];
export const compassWord = (deg) => COMPASS[Math.round(deg / 45) % 8];
/** Açıyı sekiz yönlü pusulanın en yakın yönüne yuvarlar (0, 45, …, 315) */
export const compassBearing = (deg) => (Math.round(deg / 45) % 8) * 45;

/** a noktasından bearing yönünde km kadar gidilince varılan nokta (büyük çember) */
export function destination(a, deg, km) {
    const d = km / 6371;
    const t = rad(deg);
    const la = rad(a.lat);
    const lo = rad(a.lng);
    const lat = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(t));
    const lng = lo + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(lat));
    return { lat: (lat * 180) / Math.PI, lng: ((((lng * 180) / Math.PI + 540) % 360) - 180) };
}

/**
 * Sekiz yönlü ipucunun kapsadığı yay: tahminin başkentinden km uzaklıkta,
 * pusula yönünün ±22,5° çevresi. Harita tam açı yerine bu dilimi çizer;
 * yoksa halka ile yön tek bir noktayı, yani cevabı ele verir. [lng, lat] listesi.
 */
export function compassArc(a, deg, km, step = 1.5) {
    const mid = compassBearing(deg);
    const out = [];
    for (let t = mid - 22.5; t <= mid + 22.5 + 1e-9; t += step) {
        const p = destination(a, t, km);
        out.push([p.lng, p.lat]);
    }
    return out;
}

/**
 * İki ülkenin koridor rotalarının benzerliği (0–1): ortak yıllarda konumlar
 * arasındaki ortalama uzaklığa göre. Ortak yıl azsa null.
 */
export function similarity(a, b) {
    const sa = db.corridor.series[a];
    const sb = db.corridor.series[b];
    if (!sa || !sb) return null;
    const mb = new Map(sb.map((r) => [r[0], r]));
    let sum = 0;
    let n = 0;
    for (const r of sa) {
        const o = mb.get(r[0]);
        if (!o) continue;
        sum += Math.hypot(r[1] - o[1], r[2] - o[2]);
        n++;
    }
    if (n < 10) return null;
    return Math.exp(-sum / n / 1.2);
}

export function evaluateGuess(guess, target) {
    const correct = guess === target;
    const ca = capitalOf(guess);
    const cb = capitalOf(target);
    const km = ca && cb ? distanceKm(ca, cb) : null;
    return {
        id: guess,
        correct,
        km: correct ? 0 : km,
        bearing: !correct && ca && cb && km > 1 ? bearing(ca, cb) : null,
        similarity: correct ? 1 : similarity(guess, target),
        sameContinent: db.countries[guess]?.continent === db.countries[target]?.continent,
    };
}

/** Adın ilk harfi açık, diğer harfleri gizli: "T······" */
export function maskName(name) {
    let first = true;
    return [...name]
        .map((ch) => {
            if (/\s|-/.test(ch)) return ch;
            if (first) {
                first = false;
                return ch;
            }
            return '·';
        })
        .join('');
}

/**
 * Yanlış tahmin sayısına göre açılan ipuçları. Son ipucu (silüet) arayüzde çizilir.
 */
export function hints(target, wrong) {
    const c = db.countries[target];
    const cap = capitalOf(target);
    const letters = [...c.tr].filter((ch) => !/\s|-/.test(ch)).length;
    const all = [
        { key: 'continent', label: 'Kıta', value: continentTR(target) },
        { key: 'region', label: 'Bölge', value: regionTR(target) },
        { key: 'capital', label: 'Başkentin baş harfi', value: cap ? `${cap.name[0]} (${[...cap.name].length} harf)` : '—' },
        { key: 'name', label: 'Ülkenin adı', value: `${maskName(c.tr)} (${letters} harf)` },
        { key: 'shape', label: 'Sınırlar', value: 'silüet' },
    ];
    return all.slice(0, Math.min(all.length, wrong));
}

// ---------------------------------------------------------------------------
// Kayıt, seri ve paylaşım

export function huntResults() {
    return load('hunt.results', {}) || {};
}

export function huntResult(key) {
    if (!key) return null;
    const r = huntResults()[key];
    return r && r.done ? r : null;
}

export function huntProgress(key) {
    return (key && huntResults()[key]) || null;
}

export function saveHunt(key, state) {
    if (!key) return;
    const all = huntResults();
    all[key] = state;
    save('hunt.results', all);
}

/** Kesintisiz bulunan gün sayısı (bugün henüz oynanmadıysa dünden geriye) */
export function huntStreak(results = huntResults(), today = dayKey()) {
    let n = dayNumber(today);
    if (!results[keyFromNumber(n)]?.done) n -= 1;
    let streak = 0;
    while (n >= 1 && results[keyFromNumber(n)]?.solved) {
        streak++;
        n--;
    }
    return streak;
}

/** ■ bulundu, ▣ yakın (başkentler 2.000 km'den yakın), □ uzak */
export function guessSquares(evals) {
    return evals.map((e) => (e.correct ? '■' : e.km !== null && e.km < NEAR_KM ? '▣' : '□')).join('');
}

export function shareHunt({ number, key, evals, solved }, link) {
    const score = solved ? `${evals.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
    return [`ATLAS İnteraktif · Leviathan Avı #${number} · ${dayLabel(key)}`, `${score} ${guessSquares(evals)}`, link].join('\n');
}
