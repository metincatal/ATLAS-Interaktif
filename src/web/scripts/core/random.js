/**
 * Tohumlanabilir rastlantı yardımcıları. Oyun motorları yalnızca bunları
 * kullanır; böylece aynı tohum her zaman aynı oyunu üretir.
 */

/** Tohumlanabilir rastgele sayı üreteci (mulberry32) */
export function rng(seed) {
    let t = seed >>> 0;
    return () => {
        t += 0x6d2b79f5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

/** Standart normal dağılımdan örnek (Box–Muller) */
export function gauss(r) {
    const u = Math.max(1e-9, r());
    const v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function pickWeighted(items, weights, r) {
    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) return null;
    let x = r() * total;
    for (let i = 0; i < items.length; i++) {
        x -= weights[i];
        if (x <= 0) return items[i];
    }
    return items[items.length - 1];
}

/** Tohumlu Fisher–Yates karışımı (yeni dizi döndürür) */
export function shuffle(items, r) {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
