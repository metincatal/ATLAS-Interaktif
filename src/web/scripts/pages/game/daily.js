/**
 * Günün senaryosu: herkes aynı gün aynı ülke, başlangıç yılı ve tohumla
 * oynar; sonuçlar bu yüzden birbiriyle karşılaştırılabilir. Gün İstanbul
 * saatine göre belirlenir, böylece dünyanın her yerinde aynı senaryo çıkar.
 *
 * Havuz, gerçek tarihiyle karşılaştırmaya değer dönemlerden oluşur: geçişler,
 * geri kayışlar ve koridorda kalma sınavları. Her döngüde havuzun tamamı
 * tohumlu bir sırayla bir kez oynanır.
 */

import { load, save } from '../../core/store.js';

export const DAILY_POOL = [
    ['TUR', 1950], ['TUR', 1980], ['TUR', 2002], ['KOR', 1987], ['TWN', 1987], ['POL', 1989], ['HUN', 1989], ['CZE', 1990],
    ['ROU', 1990], ['BGR', 1990], ['UKR', 1991], ['RUS', 1991], ['RUS', 2000], ['GEO', 2003], ['KAZ', 1991], ['ESP', 1975],
    ['PRT', 1974], ['GRC', 1974], ['DEU', 1919], ['ITA', 1922], ['CHL', 1973], ['CHL', 1990], ['ARG', 1983], ['BRA', 1985],
    ['MEX', 2000], ['VEN', 1998], ['COL', 1991], ['BOL', 2006], ['ZAF', 1994], ['GHA', 1992], ['KEN', 2002], ['ETH', 1991],
    ['RWA', 1994], ['EGY', 1981], ['IRN', 1979], ['IRQ', 2003], ['TUN', 1987], ['IDN', 1998], ['PHL', 1986], ['IND', 1977],
    ['PAK', 1988], ['BGD', 1991], ['CHN', 1978], ['VNM', 1986], ['MYS', 1981], ['SEN', 2000], ['HUN', 2004], ['THA', 1992],
    ['LKA', 1994], ['SRB', 2000], ['NIC', 1990], ['URY', 1985], ['GBR', 1979], ['USA', 1980], ['SWE', 1990],
];

/** İlk günlük senaryonun tarihi (1 numaralı gün) */
const EPOCH = Date.UTC(2026, 8, 23);

/** YYYY-AA-GG biçiminde, İstanbul saatine göre bugünün anahtarı */
export function dayKey(date = new Date()) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function dayNumber(key) {
    const [y, m, d] = key.split('-').map(Number);
    return Math.round((Date.UTC(y, m - 1, d) - EPOCH) / 86400000) + 1;
}

export function keyFromNumber(n) {
    return new Date(EPOCH + (n - 1) * 86400000).toISOString().slice(0, 10);
}

export function dayLabel(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** FNV-1a: metinden kararlı bir 32 bitlik sayı */
export function hashString(text) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

/** Tohumlu Fisher–Yates karışımı: 0..n-1 dizisi */
export function seededOrder(n, seed) {
    let t = seed >>> 0;
    const next = () => {
        t += 0x6d2b79f5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
    const a = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/** Bir güne ait senaryo; lastYear verinin son yılıdır (tarihle karşılaştırma buna kadar) */
export function dailyScenario(key = dayKey(), lastYear = 2023) {
    const n = Math.max(1, dayNumber(key));
    const cycle = Math.floor((n - 1) / DAILY_POOL.length);
    const order = seededOrder(DAILY_POOL.length, hashString(`atlas-gunluk-${cycle}`));
    const [id, year] = DAILY_POOL[order[(n - 1) % DAILY_POOL.length]];
    return { key, number: n, id, year, turns: Math.min(20, lastYear - year), difficulty: 'dengeli', seed: hashString(`atlas-${key}`) % 1e9 };
}

// ---------------------------------------------------------------------------
// Sonuçlar (yalnızca ilk tamamlanan deneme resmî sonuçtur)

export function dailyResults() {
    return load('daily.results', {}) || {};
}

export function dailyResult(key) {
    return dailyResults()[key] || null;
}

export function recordDaily(key, result) {
    const all = dailyResults();
    if (all[key]) return false;
    all[key] = result;
    save('daily.results', all);
    return true;
}

/** Bugüne (ya da bugün oynanmadıysa düne) kadar kesintisiz oynanan gün sayısı */
export function dailyStreak(results = dailyResults(), today = dayKey()) {
    let n = dayNumber(today);
    if (!results[keyFromNumber(n)]) n -= 1;
    let streak = 0;
    while (n >= 1 && results[keyFromNumber(n)]) {
        streak++;
        n--;
    }
    return streak;
}

/** Yıllara göre koridor şeridi: ■ koridorda, □ dışında */
export function corridorStrip(history) {
    return history
        .slice(1)
        .map((h) => (h.type === 'Shackled' ? '■' : '□'))
        .join('');
}

export function signedInt(n) {
    if (n === null || n === undefined) return '—';
    const r = Math.round(n);
    return r > 0 ? `+${r}` : r < 0 ? `−${-r}` : '0';
}
