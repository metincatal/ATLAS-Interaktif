/**
 * Türkçe biçimlendirme yardımcıları
 */

const MINUS = '−';

/** 0,24 biçiminde sayı (Türkçe ondalık) */
export function num(value, digits = 2) {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    const fixed = Math.abs(value).toFixed(digits).replace('.', ',');
    return (value < 0 && Number(fixed.replace(',', '.')) !== 0 ? MINUS : '') + fixed;
}

/** +0,24 / −1,49 */
export function signed(value, digits = 2) {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    const rounded = Number(value.toFixed(digits));
    if (rounded === 0) return num(0, digits);
    return (rounded > 0 ? '+' : MINUS) + Math.abs(value).toFixed(digits).replace('.', ',');
}

/** Tam sayı, binlik ayırıcılı: 23.395 */
export function int(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    return Math.round(value).toLocaleString('tr-TR');
}

/** %71 */
export function pct(value, digits = 0) {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    return '%' + (value * 100).toFixed(digits).replace('.', ',');
}

/** Arama için Türkçe karakterleri sadeleştirir */
export function fold(text) {
    return String(text || '')
        .toLocaleLowerCase('tr-TR')
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/â/g, 'a')
        .replace(/î/g, 'i')
        .replace(/û/g, 'u')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');
}

/**
 * Türkçe ek uyumu: yıl ve ad sonrasında gelen bulunma/ayrılma ekleri.
 * suffix('2003', 'de') -> "2003'te"
 */
export function suffix(word, kind) {
    const w = String(word);
    const vowels = 'aeıioöuü';
    const back = 'aıou';
    const hardConsonants = 'fstkçşhp';
    let lastVowel = null;
    // Sayılar okunuşlarına göre
    const spoken = /^\d+$/.test(w) ? numberWord(Number(w)) : w.toLocaleLowerCase('tr-TR');
    for (let i = spoken.length - 1; i >= 0; i--) {
        if (vowels.includes(spoken[i])) {
            lastVowel = spoken[i];
            break;
        }
    }
    const lastChar = spoken[spoken.length - 1];
    const isBack = lastVowel ? back.includes(lastVowel) : false;
    const hard = hardConsonants.includes(lastChar);
    const endsVowel = vowels.includes(lastChar);
    const a = isBack ? 'a' : 'e';
    const i4 = lastVowel ? ({ a: 'ı', ı: 'ı', o: 'u', u: 'u', e: 'i', i: 'i', ö: 'ü', ü: 'ü' }[lastVowel]) : 'i';
    switch (kind) {
        case 'de':
            return `${w}’${hard ? 't' : 'd'}${a}`;
        case 'den':
            return `${w}’${hard ? 't' : 'd'}${a}n`;
        case 'e':
            return `${w}’${endsVowel ? 'y' : ''}${a}`;
        case 'in':
            return `${w}’${endsVowel ? 'n' : ''}${i4}n`;
        case 'i':
            return `${w}’${endsVowel ? 'y' : ''}${i4}`;
        default:
            return w;
    }
}

function numberWord(n) {
    // Yalnızca son hecenin ünlüsü ve son harf önemli: son basamaklara göre okunuş
    const ones = ['sıfır', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
    const tens = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
    if (n % 10 !== 0) return ones[n % 10];
    if (n % 100 !== 0) return tens[(n % 100) / 10];
    if (n % 1000 !== 0) return 'yüz';
    return 'bin';
}

/** Yüzde iyelik eki: %71’i, %64’ü, %12’si, %30’u */
export function pctPoss(ratio) {
    const n = Math.round(ratio * 100);
    const last = n % 10;
    const tens = Math.floor((n % 100) / 10);
    if (n === 0) return 'ı';
    if (last === 0) return { 1: 'u', 2: 'si', 3: 'u', 4: 'ı', 5: 'si', 6: 'ı', 7: 'i', 8: 'i', 9: 'ı' }[tens] ?? 'ü';
    return { 1: 'i', 2: 'si', 3: 'ü', 4: 'ü', 5: 'i', 6: 'sı', 7: 'si', 8: 'i', 9: 'u' }[last];
}

/** Yüzde ayrılma eki: %64’ünden, %30’undan */
export function pctAbl(ratio) {
    const poss = pctPoss(ratio);
    const v = poss[poss.length - 1];
    return `${poss}n${v === 'i' || v === 'ü' ? 'den' : 'dan'}`;
}

export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
    return a + (b - a) * t;
}
