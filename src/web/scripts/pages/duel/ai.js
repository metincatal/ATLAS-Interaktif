/**
 * Kızıl Kraliçe — yapay zekâ rakip (saf mantık)
 *
 * Her tur kendi seçeneklerini (duruş + isteğe bağlı kart) rakibin olası
 * duruşlarına karşı bir tur ileriye bakarak değerlendirir. Düello sıfır
 * toplamlı olduğu için ortaya çıkan matris bir oyun olarak çözülür
 * (pişmanlık eşleştirmesi) ve hamle bu karma stratejiden seçilir; böylece
 * yapay zekâ tahmin edilebilir bir kalıba düşmez.
 *
 *   kolay: sık sık rastgele oynar, kart kullanmayı ihmal eder
 *   orta:  dengeli (Nash) strateji
 *   zor:   Nash stratejisini rakibin alışkanlıklarına karşı en iyi yanıtla karıştırır
 */

import { corridorProgress } from '../../core/data.js';
import { nearestType } from '../game/engine.js';
import { applyRound, legalStances, legalCards, regionR, stateShare, balance } from './engine.js';
import { CENTERS, controller } from './cards.js';

export const AI_LEVELS = {
    kolay: { label: 'Kolay', desc: 'Sık sık rastgele oynar.' },
    orta: { label: 'Orta', desc: 'Dengeli, tahmin edilmesi zor bir strateji.' },
    zor: { label: 'Zor', desc: 'Alışkanlıklarınızı öğrenir ve cezalandırır.' },
};

/** Değerlendirme ağırlıkları (simülasyonla ayarlandı) */
export const WEIGHTS = { proj: 0.85, center: 0.3, lean: 0.03, res: 0.15, resCap: 6, legit: 0.1, legitCap: 7, legitLow: 0.35 };

function lightClone(g) {
    return {
        x: g.x,
        y: g.y,
        legit: g.legit,
        res: { ...g.res },
        centers: { ...g.centers },
        score: { ...g.score },
        prosperity: g.prosperity,
        corridorRounds: g.corridorRounds,
        round: g.round,
        rounds: g.rounds,
        year: g.year,
        event: g.event,
        type: g.type,
        start: g.start,
    };
}

/** Durumun Devlet açısından değeri (Toplum için eksi işaretlisi) */
export function evaluate(h, w = WEIGHTS) {
    const D = h.score.state - h.score.society;
    const remaining = Math.max(0, h.rounds - h.round);
    const R = regionR(nearestType(h.x, h.y), corridorProgress(h.x, h.y));
    const proj = remaining * R * (2 * stateShare(balance(h)) - 1) * w.proj;
    if (!remaining) return D;
    let centers = 0;
    for (const k of CENTERS) {
        const c = controller(h.centers[k]);
        centers += (c === 'state' ? 1 : c === 'society' ? -1 : 0) * w.center + h.centers[k] * w.lean;
    }
    const soon = Math.min(1, remaining / 4);
    // Azalan getiri: tavandaki kaynak ve yüksek meşruiyet fazladan değer taşımaz
    const res = w.res * (Math.min(h.res.state, w.resCap) - Math.min(h.res.society, w.resCap));
    const legit = w.legit * Math.min(h.legit, w.legitCap) - w.legitLow * Math.max(0, 3 - h.legit);
    // Bu terimler refahın ölçeğiyle birlikte ölçeklenir: refahın küçük olduğu
    // senaryolarda denge, meşruiyet ve güç odakları karşısında ucuzlamaz
    const scale = Math.max(0.4, R / 2.5);
    return D + proj + soon * scale * (centers + res + legit);
}

/** Pişmanlık eşleştirmesi (RM+): satır oyuncusu A'yı enbüyükler, sütun oyuncusu enküçükler */
export function solveZeroSum(A, iterations = 600) {
    const n = A.length;
    const m = A[0].length;
    const regR = new Array(n).fill(0);
    const regC = new Array(m).fill(0);
    const sumR = new Array(n).fill(0);
    const sumC = new Array(m).fill(0);
    const norm = (reg) => {
        const pos = reg.map((v) => Math.max(0, v));
        const t = pos.reduce((a, b) => a + b, 0);
        return t > 0 ? pos.map((v) => v / t) : reg.map(() => 1 / reg.length);
    };
    for (let it = 0; it < iterations; it++) {
        const p = norm(regR);
        const q = norm(regC);
        for (let i = 0; i < n; i++) sumR[i] += p[i];
        for (let j = 0; j < m; j++) sumC[j] += q[j];
        const u = A.map((row) => row.reduce((a, v, j) => a + v * q[j], 0));
        const vr = u.reduce((a, v, i) => a + v * p[i], 0);
        for (let i = 0; i < n; i++) regR[i] = Math.max(0, regR[i] + u[i] - vr);
        const w = new Array(m).fill(0);
        for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) w[j] -= p[i] * A[i][j];
        const vc = w.reduce((a, v, j) => a + v * q[j], 0);
        for (let j = 0; j < m; j++) regC[j] = Math.max(0, regC[j] + w[j] - vc);
    }
    const tr = sumR.reduce((a, b) => a + b, 0);
    const tc = sumC.reduce((a, b) => a + b, 0);
    return { p: sumR.map((v) => v / tr), q: sumC.map((v) => v / tc) };
}

function sample(items, probs, r) {
    let x = r();
    for (let i = 0; i < items.length; i++) {
        x -= probs[i];
        if (x <= 0) return items[i];
    }
    return items[items.length - 1];
}

/**
 * İki adımlı değer: bir sonraki turu da (kartsız duruşlarla) oyun olarak çözer.
 * Rakibin ertesi tur vereceği en iyi yanıtı hesaba katar.
 */
export function evaluateDeep(h, w = WEIGHTS) {
    if (h.rounds - h.round <= 1) return evaluate(h, w);
    const rows = legalStances(h, 'state').filter((s) => s.ok);
    const cols = legalStances(h, 'society').filter((s) => s.ok);
    const A = rows.map((rs) =>
        cols.map((cs) => {
            const k = lightClone(h);
            applyRound(k, { stance: rs.id, card: null }, { stance: cs.id, card: null }, { project: true });
            return evaluate(k, w);
        }),
    );
    const { p, q } = solveZeroSum(A, 200);
    let v = 0;
    for (let i = 0; i < p.length; i++) for (let j = 0; j < q.length; j++) v += p[i] * q[j] * A[i][j];
    return v;
}

/** Kendi seçenekleri × rakibin duruşları için değer matrisi */
export function payoffMatrix(g, side, w = WEIGHTS, { cards = true, deep = false } = {}) {
    const other = side === 'state' ? 'society' : 'state';
    const options = [];
    for (const st of legalStances(g, side).filter((s) => s.ok)) {
        options.push({ stance: st.id, card: null });
        if (cards) for (const c of legalCards(g, side, st.id).filter((c) => c.ok)) options.push({ stance: st.id, card: c.id });
    }
    const columns = legalStances(g, other)
        .filter((s) => s.ok)
        .map((s) => s.id);
    const sign = side === 'state' ? 1 : -1;
    const A = options.map((o) =>
        columns.map((col) => {
            const h = lightClone(g);
            const moveS = side === 'state' ? o : { stance: col, card: null };
            const moveT = side === 'state' ? { stance: col, card: null } : o;
            applyRound(h, moveS, moveT, { project: true });
            return sign * (deep ? evaluateDeep(h, w) : evaluate(h, w));
        }),
    );
    return { options, columns, A };
}

/**
 * Yapay zekânın hamlesi. history: rakibin geçmiş duruşları (zor seviye için).
 */
export function chooseMove(g, side, level = 'orta', r = Math.random, { history = [], weights = WEIGHTS } = {}) {
    const { options, columns, A } = payoffMatrix(g, side, weights, { cards: level !== 'kolay' || r() < 0.4, deep: level === 'zor' });
    const { p, q } = solveZeroSum(A);
    if (level === 'kolay') {
        if (r() < 0.45) {
            const stances = [...new Set(options.map((o) => o.stance))];
            return { stance: stances[Math.floor(r() * stances.length)], card: null };
        }
        const flat = p.map((v) => (v + 1 / p.length) / 2);
        return sample(options, flat, r);
    }
    if (level === 'zor' && history.length >= 3) {
        const counts = columns.map((c) => history.filter((h) => h === c).length + 1);
        const total = counts.reduce((a, b) => a + b, 0);
        const model = columns.map((_, j) => 0.55 * q[j] + 0.45 * (counts[j] / total));
        let best = 0;
        let bestV = -Infinity;
        A.forEach((row, i) => {
            const v = row.reduce((a, x, j) => a + x * model[j], 0);
            if (v > bestV) {
                bestV = v;
                best = i;
            }
        });
        if (r() < 0.5) return options[best];
    }
    return sample(options, p, r);
}
