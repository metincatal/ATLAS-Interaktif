/**
 * Özgürlük Dengesi — oyun motoru (saf mantık, arayüzden bağımsız)
 *
 * Konum, uygulamanın geri kalanıyla aynı düzlemdedir: x = toplumun gücü,
 * y = devletin gücü. Leviathan tipi, verideki küme merkezlerine en yakınlıkla
 * belirlenir; böylece oyundaki bölgeler Gözlemevi'ndeki bölgelerle aynıdır.
 *
 * Her yıl:
 *   1. Olay (varsa) seçilir ve etkisi hemen uygulanır.
 *   2. Seçilen politikalar uygulanır (azalan getiri ile).
 *   3. Kızıl Kraliçe dinamiği: denge bozulursa geride kalan taraf daha da
 *      geriler; koridorda ise iki taraf birlikte büyür.
 *   4. Kurumsal süreklilik: konum yavaşça başlangıca doğru çekilir.
 *   5. Güç odakları, özgürlük endeksi ve siyasi sermaye güncellenir.
 *   6. Kriz ve çöküş koşulları denetlenir, puan eklenir.
 */

import { db, corridorGap } from '../../core/data.js';
import { pctPoss } from '../../core/format.js';
import { POLICIES, POLICY_BY_ID } from './policies.js';
import { EVENTS, CRISES, EVENT_BY_ID } from './events.js';

export const GROUPS = ['military', 'elite', 'civil', 'religious', 'international'];
export const MAX_POLICIES = 3;
export const HAND_SIZE = 5;
export const REDRAW_COST = 5;

export const DIFFICULTY = {
    kolay: { label: 'Kolay', effect: 1.2, drift: 0.7, capital: 1.25, noise: 0.03, eventChance: 0.5, crisis: 0.12 },
    dengeli: { label: 'Dengeli', effect: 1.0, drift: 1.0, capital: 1.0, noise: 0.045, eventChance: 0.62, crisis: 0.18 },
    zor: { label: 'Zor', effect: 0.85, drift: 1.3, capital: 0.85, noise: 0.06, eventChance: 0.75, crisis: 0.22 },
};

const TYPE_CAPITAL = {
    Shackled: { max: 110, regen: 32 },
    Despotic: { max: 130, regen: 36 },
    Paper: { max: 95, regen: 28 },
    Absent: { max: 90, regen: 26 },
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const round = (v, d = 3) => Math.round(v * 10 ** d) / 10 ** d;

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

function gauss(r) {
    const u = Math.max(1e-9, r());
    const v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function pickWeighted(items, weights, r) {
    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) return null;
    let x = r() * total;
    for (let i = 0; i < items.length; i++) {
        x -= weights[i];
        if (x <= 0) return items[i];
    }
    return items[items.length - 1];
}

export function nearestType(x, y) {
    let best = null;
    let bestD = Infinity;
    for (const [t, [cx, cy]] of Object.entries(db.corridor.centroids)) {
        const d = (x - cx) ** 2 + (y - cy) ** 2;
        if (d < bestD) {
            bestD = d;
            best = t;
        }
    }
    return best;
}

export function distanceToCorridor(x, y) {
    const [cx, cy] = db.corridor.centroids.Shackled;
    return Math.hypot(x - cx, y - cy);
}

/** Özgürlük endeksinin (0–1) konuma göre dengesi */
function libertyTarget(x, y) {
    const z = 1.1 * x + 0.5 * y - 0.4;
    return 0.02 + 0.88 / (1 + Math.exp(-z));
}

// ---------------------------------------------------------------------------

export function createGame({ id, name, start, startYear, turns = 20, difficulty = 'dengeli', gameData, seed = Date.now() % 1e9 }) {
    const yearData = gameData?.years?.[String(startYear)] || null;
    const stake = {};
    GROUPS.forEach((g, i) => {
        const pair = yearData?.s?.[i];
        stake[g] = { inf: clamp(pair?.[0] ?? 0.5, 0.2, 0.8), sat: clamp(pair?.[1] ?? 0.5, 0.1, 0.9) };
    });
    const libdem = yearData?.v?.[0];
    const type = nearestType(start.x, start.y);
    const cap = TYPE_CAPITAL[type];
    const k = DIFFICULTY[difficulty].capital;
    const s = {
        v: 1,
        id,
        name,
        startYear,
        year: startYear,
        turn: 0,
        turns,
        difficulty,
        seed,
        x: start.x,
        y: start.y,
        start: { x: start.x, y: start.y },
        type,
        startType: type,
        liberty: libdem ?? libertyTarget(start.x, start.y),
        stake,
        capital: { current: Math.round(cap.max * k * 0.7), max: Math.round(cap.max * k), regen: Math.round(cap.regen * k), penalty: null },
        hand: [],
        selected: [],
        redrawn: false,
        event: null,
        usedEvents: {},
        pendingCrisis: null,
        lastElection: null,
        history: [],
        log: [],
        score: 0,
        corridorYears: 0,
        crises: 0,
        status: 'playing',
        ending: null,
    };
    s.startLiberty = s.liberty;
    s.history.push(snapshot(s));
    addLog(s, 'info', 'Göreve başladınız', `${typeLabel(type)} bölgesinden başlıyorsunuz.`);
    drawHand(s, rng(seed));
    return s;
}

function typeLabel(t) {
    return { Shackled: 'Zincirlenmiş', Despotic: 'Despotik', Paper: 'Kâğıttan', Absent: 'Namevcut' }[t];
}

function snapshot(s) {
    return {
        year: s.year,
        x: round(s.x),
        y: round(s.y),
        type: s.type,
        liberty: round(s.liberty),
        capital: Math.round(s.capital.current),
        sat: Object.fromEntries(GROUPS.map((g) => [g, round(s.stake[g].sat, 2)])),
    };
}

function addLog(s, kind, title, detail = '') {
    s.log.unshift({ year: s.year, turn: s.turn, kind, title, detail });
    if (s.log.length > 80) s.log.pop();
}

// ---------------------------------------------------------------------------
// Etkiler

function diminish(value, delta) {
    if (delta > 0) return clamp(1 - (value - 1.1) / 2.4, 0.3, 1);
    if (delta < 0) return clamp(1 + (value + 1.6) / 2.2, 0.35, 1);
    return 1;
}

/** Bir etki kümesini uygular; gerçekleşen değişimi döndürür */
export function applyEffects(s, eff = {}) {
    const k = DIFFICULTY[s.difficulty].effect;
    const dy = (eff.dState || 0) * k * diminish(s.y, eff.dState || 0);
    const dx = (eff.dSociety || 0) * k * diminish(s.x, eff.dSociety || 0);
    s.x = clamp(s.x + dx, -3.2, 3.2);
    s.y = clamp(s.y + dy, -3.2, 3.2);
    for (const [g, d] of Object.entries(eff.stake || {})) {
        if (s.stake[g]) s.stake[g].sat = clamp(s.stake[g].sat + d, 0, 1);
    }
    if (eff.capital) s.capital.current = clamp(s.capital.current + eff.capital, 0, s.capital.max);
    return { dx, dy };
}

/** Seçili politikaların tahmini etkisi (rastlantı ve dinamik hariç) */
export function preview(s, ids = s.selected) {
    const k = DIFFICULTY[s.difficulty].effect;
    let dx = 0;
    let dy = 0;
    let cost = 0;
    const stake = {};
    for (const id of ids) {
        const p = POLICY_BY_ID[id];
        dy += p.dState * k * diminish(s.y + dy, p.dState);
        dx += p.dSociety * k * diminish(s.x + dx, p.dSociety);
        cost += p.cost;
        for (const [g, d] of Object.entries(p.stake || {})) stake[g] = (stake[g] || 0) + d;
    }
    const synergy = synergyBonus(ids);
    return { dx: dx * synergy, dy: dy * synergy, cost, stake, synergy: synergy > 1 };
}

/** Aynı yıl hem devleti hem toplumu güçlendiren politikalar: Kızıl Kraliçe primi */
function synergyBonus(ids) {
    const up = ids.map((id) => POLICY_BY_ID[id]);
    const stateUp = up.some((p) => p.dState >= 0.05);
    const socUp = up.some((p) => p.dSociety >= 0.05);
    return stateUp && socUp && ids.length >= 2 ? 1.12 : 1;
}

// ---------------------------------------------------------------------------
// Kartlar

export function drawHand(s, r) {
    const gap = corridorGap(s.x, s.y);
    const weights = POLICIES.map((p) => {
        let w = 1;
        if (gap > 0.8 && (p.cat === 'toplum' || p.cat === 'denetim')) w *= 1.5;
        if (gap < -0.8 && p.cat === 'devlet') w *= 1.6;
        if (s.x < -0.3 && s.y < -0.3 && (p.cat === 'devlet' || p.cat === 'denetim')) w *= 1.3;
        if (p.cat === 'baski') w *= 0.8;
        if (p.cat === 'uzlasi') {
            const g = Object.keys(p.stake)[0];
            if (s.stake[g] && s.stake[g].sat < 0.35) w *= 2.2;
        }
        if (s.hand.includes(p.id)) w *= 0.35;
        return w;
    });
    const hand = [];
    const cats = {};
    let guard = 0;
    while (hand.length < HAND_SIZE && guard++ < 200) {
        const p = pickWeighted(POLICIES, weights, r);
        if (!p || hand.includes(p.id)) continue;
        if ((cats[p.cat] || 0) >= 2) continue;
        hand.push(p.id);
        cats[p.cat] = (cats[p.cat] || 0) + 1;
    }
    // Her elde en az bir "cazip ama bedelli" ya da uzlaşı kartı olsun
    if (!hand.some((id) => ['baski', 'uzlasi'].includes(POLICY_BY_ID[id].cat))) {
        const pool = POLICIES.filter((p) => (p.cat === 'baski' || p.cat === 'uzlasi') && !hand.includes(p.id));
        hand[hand.length - 1] = pool[Math.floor(r() * pool.length)].id;
    }
    s.hand = hand;
    s.selected = [];
}

export function toggleSelect(s, id) {
    if (s.status !== 'playing') return { ok: false };
    if (s.selected.includes(id)) {
        s.selected = s.selected.filter((x) => x !== id);
        return { ok: true };
    }
    if (s.selected.length >= MAX_POLICIES) return { ok: false, reason: `Bir yılda en fazla ${MAX_POLICIES} politika uygulayabilirsiniz.` };
    const cost = preview(s, [...s.selected, id]).cost;
    if (cost > s.capital.current) return { ok: false, reason: 'Bu politika için yeterli siyasi sermayeniz yok.' };
    s.selected = [...s.selected, id];
    return { ok: true };
}

export function redraw(s) {
    if (s.redrawn) return { ok: false, reason: 'Kartları bu yıl zaten yenilediniz.' };
    if (s.capital.current < REDRAW_COST) return { ok: false, reason: 'Kartları yenilemek için yeterli sermaye yok.' };
    s.capital.current -= REDRAW_COST;
    s.redrawn = true;
    drawHand(s, rng(s.seed + s.turn * 131 + 17));
    return { ok: true };
}

// ---------------------------------------------------------------------------
// Olaylar

function drawEvent(s, r) {
    if (s.pendingCrisis) {
        const crisis = CRISES[s.pendingCrisis];
        s.pendingCrisis = null;
        return { id: crisis.id, choice: null, outcome: null };
    }
    if (s.turn === 0 || r() > DIFFICULTY[s.difficulty].eventChance) return null;
    const pool = EVENTS.filter((e) => {
        const used = s.usedEvents[e.id];
        if (used !== undefined && (e.once || s.turn - used < 6)) return false;
        return !e.cond || e.cond(s);
    });
    const ev = pickWeighted(pool, pool.map((e) => (e.weight ? e.weight(s) : 1)), r);
    if (!ev) return null;
    s.usedEvents[ev.id] = s.turn;
    return { id: ev.id, choice: null, outcome: null };
}

export function currentEvent(s) {
    return s.event ? EVENT_BY_ID[s.event.id] : null;
}

export function chooseEvent(s, index) {
    const ev = currentEvent(s);
    if (!ev || s.event.choice !== null) return null;
    const choice = ev.choices[index];
    const r = rng(s.seed + s.turn * 977 + index);
    let outcome = { success: true, text: '' };
    let eff = typeof choice.effects === 'function' ? choice.effects(s) : choice.effects;
    let influence = choice.influence;
    let text = typeof choice.result === 'function' ? choice.result(s) : choice.result;
    if (choice.risk) {
        const chance = choice.risk.chance(s);
        const success = r() < chance;
        const branch = success ? choice.risk.success : choice.risk.fail;
        eff = branch.effects;
        influence = branch.influence;
        text = branch.result;
        outcome = { success, chance, text };
        if (!success && branch.gameOver) {
            s.event.choice = index;
            s.event.outcome = outcome;
            endGame(s, branch.gameOver);
            addLog(s, 'crisis', ev.title, text);
            return outcome;
        }
    }
    const before = { x: s.x, y: s.y };
    applyEffects(s, eff || {});
    for (const [g, d] of Object.entries(influence || {})) s.stake[g].inf = clamp(s.stake[g].inf + d, 0.15, 0.85);
    if (choice.penalty) s.capital.penalty = { ...choice.penalty };
    ev.onChoose?.(s);
    if (ev.crisis) s.crises += 1;
    outcome.text = text;
    outcome.dx = s.x - before.x;
    outcome.dy = s.y - before.y;
    s.event.choice = index;
    s.event.outcome = outcome;
    s.type = nearestType(s.x, s.y);
    addLog(s, ev.crisis ? 'crisis' : 'event', ev.title, `${choice.label}: ${text}`);
    // Seçilmiş politikaların maliyeti değişen sermayeyi aşarsa seçimi daralt
    while (s.selected.length && preview(s).cost > s.capital.current) s.selected.pop();
    return outcome;
}

// ---------------------------------------------------------------------------
// Yıl sonu

export function canEndYear(s) {
    if (s.status !== 'playing') return false;
    if (s.event && s.event.choice === null) return false;
    return true;
}

export function endYear(s) {
    if (!canEndYear(s)) return null;
    const D = DIFFICULTY[s.difficulty];
    const r = rng(s.seed + (s.turn + 1) * 7919);
    const before = { x: s.x, y: s.y, type: s.type, dist: distanceToCorridor(s.x, s.y) };
    const report = { year: s.year, policies: [...s.selected], notes: [] };

    // 1. Politikalar
    const pv = preview(s);
    let dxSum = 0;
    let dySum = 0;
    for (const id of s.selected) {
        const p = POLICY_BY_ID[id];
        const d = applyEffects(s, { dState: p.dState, dSociety: p.dSociety, stake: p.stake });
        dxSum += d.dx;
        dySum += d.dy;
        addLog(s, 'policy', p.title, `Devlet ${fmt(d.dy)} · Toplum ${fmt(d.dx)}`);
        if (p.cat === 'baski') s.stake.military.inf = clamp(s.stake.military.inf + 0.02, 0.15, 0.85);
    }
    s.capital.current = clamp(s.capital.current - pv.cost, 0, s.capital.max);
    if (pv.synergy) {
        s.x += dxSum * 0.12;
        s.y += dySum * 0.12;
        report.notes.push('Devleti ve toplumu birlikte güçlendirdiniz: Kızıl Kraliçe primi.');
    }

    // 2. Kızıl Kraliçe dinamiği
    const gap = corridorGap(s.x, s.y);
    if (gap > 1.0) {
        s.x -= 0.03 * D.drift * (gap - 0.5);
        s.stake.civil.sat = clamp(s.stake.civil.sat - 0.02, 0, 1);
        report.notes.push('Devlet toplumun çok önünde; sivil alan daralıyor.');
    } else if (gap < -1.0) {
        s.y -= 0.03 * D.drift * (-gap - 0.5);
        s.stake.elite.sat = clamp(s.stake.elite.sat - 0.015, 0, 1);
        report.notes.push('Toplum devletin çok önünde; kamu kapasitesi aşınıyor.');
    } else if (nearestType(s.x, s.y) === 'Shackled') {
        // Kızıl Kraliçe: koridorda yerinde kalmak için koşmaya devam etmek gerekir
        const running = pv.dx > 0.03 || pv.dy > 0.03;
        if (running && Math.abs(gap) < 0.8) {
            s.x += 0.012;
            s.y += 0.012;
            report.notes.push('Koridordasınız: devlet ve toplum birlikte koşuyor.');
        } else if (!running) {
            s.x -= 0.035 * D.drift;
            s.y -= 0.035 * D.drift;
            report.notes.push('Bu yıl reform yapmadınız; koridorda yerinde saymak geriye düşmek demek.');
        }
    }

    // 3. Kurumsal süreklilik ve rastlantı
    s.x += (s.start.x - s.x) * 0.03 * D.drift + gauss(r) * D.noise;
    s.y += (s.start.y - s.y) * 0.03 * D.drift + gauss(r) * D.noise;
    s.x = clamp(s.x, -3.2, 3.2);
    s.y = clamp(s.y, -3.2, 3.2);

    // 4. Güç odakları: hafıza zamanla solar, etki toplumun gücüyle değişir
    for (const g of GROUPS) s.stake[g].sat = clamp(s.stake[g].sat + (0.5 - s.stake[g].sat) * 0.06, 0, 1);
    const socMove = s.x - before.x;
    s.stake.civil.inf = clamp(s.stake.civil.inf + socMove * 0.12, 0.15, 0.85);
    s.stake.military.inf = clamp(s.stake.military.inf - socMove * 0.05, 0.15, 0.85);

    // 5. Özgürlük endeksi
    s.liberty = clamp(s.liberty + (libertyTarget(s.x, s.y) - s.liberty) * 0.3, 0, 1);

    // 6. Tip ve sermaye
    const newType = nearestType(s.x, s.y);
    if (newType !== s.type) {
        addLog(s, 'type', `Bölge değişimi: ${typeLabel(s.type)} → ${typeLabel(newType)}`, newType === 'Shackled' ? 'Dar koridora girdiniz.' : '');
        report.typeChange = { from: s.type, to: newType };
    }
    s.type = newType;
    const base = TYPE_CAPITAL[s.type];
    s.capital.max = Math.round(base.max * D.capital);
    s.capital.regen = Math.round(base.regen * D.capital);
    const weighted = GROUPS.reduce((a, g) => a + s.stake[g].sat * s.stake[g].inf, 0) / GROUPS.reduce((a, g) => a + s.stake[g].inf, 0);
    let regen = s.capital.regen * (0.55 + 0.9 * weighted);
    if (s.capital.penalty) {
        regen *= s.capital.penalty.regen;
        s.capital.penalty.turns -= 1;
        if (s.capital.penalty.turns <= 0) s.capital.penalty = null;
    }
    s.capital.current = clamp(s.capital.current + regen, 0, s.capital.max);
    report.regen = Math.round(regen);

    // 7. Puan
    const dist = distanceToCorridor(s.x, s.y);
    let pts = 0;
    if (s.type === 'Shackled') {
        pts += 12;
        s.corridorYears += 1;
    } else {
        pts += Math.max(0, 6 - 3 * dist);
        if (dist < before.dist - 0.02) pts += 2;
    }
    pts += s.liberty * 6 + weighted * 4;
    if (s.event && EVENT_BY_ID[s.event.id]?.crisis) pts -= 8;
    s.score += pts;
    report.points = Math.round(pts);
    report.dx = s.x - before.x;
    report.dy = s.y - before.y;

    // 8. Krizler ve çöküş
    if (s.y < -2.6) {
        s.history.push(snapshot(s));
        endGame(s, 'collapse');
        return report;
    }
    const risk = GROUPS.map((g) => ({ g, sat: s.stake[g].sat, inf: s.stake[g].inf }))
        .filter(({ g, sat, inf }) => sat < D.crisis && (inf > 0.42 || g === 'international'))
        .sort((a, b) => a.sat - b.sat)[0];
    const cooled = risk && s.turn - (s.lastCrisis?.[risk.g] ?? -10) >= 3;
    s.pendingCrisis = cooled ? risk.g : null;
    if (cooled) s.lastCrisis = { ...(s.lastCrisis || {}), [risk.g]: s.turn };

    // 9. Yeni yıl
    s.year += 1;
    s.turn += 1;
    s.history.push(snapshot(s));
    if (s.turn >= s.turns) {
        endGame(s, 'complete');
        return report;
    }
    s.redrawn = false;
    drawHand(s, r);
    s.event = drawEvent(s, r);
    return report;
}

function endGame(s, reason) {
    s.status = 'over';
    s.selected = [];
    s.ending = { reason };
}

function fmt(v) {
    const t = Math.abs(v).toFixed(2).replace('.', ',');
    return (v >= 0 ? '+' : '−') + t;
}

// ---------------------------------------------------------------------------
// Danışman ve rapor

export function advisor(s) {
    const tips = [];
    const gap = corridorGap(s.x, s.y);
    const low = GROUPS.filter((g) => s.stake[g].sat < 0.3 && s.stake[g].inf > 0.4);
    const names = { military: 'Ordu', elite: 'Ekonomik elit', civil: 'Sivil toplum', religious: 'Dinî kurumlar', international: 'Uluslararası toplum' };
    if (low.includes('military')) tips.push('Ordu huzursuz ve etkili; memnuniyeti daha da düşerse darbe girişimi gelebilir. Uzlaşı ya da güvenlik kartları nefes aldırır ama toplumun gücünden yer.');
    else if (low.length) tips.push(`${names[low[0]]} memnuniyetsiz. Memnuniyet çok düşerse kriz kapıda; siyasi sermayeniz de memnuniyete bağlı olarak yenilenir.`);
    if (s.type === 'Shackled') tips.push('Koridordasınız. Kızıl Kraliçe’yi unutmayın: yerinizde kalmak için devleti ve toplumu birlikte büyütmeye devam edin.');
    else if (gap > 0.9) tips.push('Devlet toplumun çok önünde. Toplumu güçlendiren politikalar (örgütlenme, basın, yerel yönetim) olmadan koridora giremezsiniz; aksi hâlde toplum daha da geriler.');
    else if (gap < -0.9) tips.push('Toplum güçlü ama devlet kapasitesi zayıf. Vergi, liyakat ve hukuk gibi kapasite politikalarıyla devleti toplumun hızına yetiştirin.');
    else if (s.x < -0.2 && s.y < -0.2) tips.push('Devlet de toplum da zayıf: Kâğıttan Leviathan. Denetim ve denge politikaları ikisini birlikte büyütür ve Kızıl Kraliçe primi kazandırır.');
    else tips.push('Denge görece korunuyor. Aynı yıl hem devleti hem toplumu güçlendiren iki politika seçerseniz ek etki (Kızıl Kraliçe primi) kazanırsınız.');
    if (s.capital.current < 20) tips.push('Siyasi sermayeniz azaldı. Ucuz kartlarla yetinin ya da güç odaklarını yatıştırarak yenilenmeyi hızlandırın.');
    return tips.slice(0, 2);
}

export const ENDINGS = {
    coup: { title: 'Askerî darbe', text: 'Ordu yönetime el koydu. Toplumun zincirleyemediği bir Leviathan, sonunda kendi zincirlerini de kırdı.' },
    revolution: { title: 'Rejim devrildi', text: 'Güvenlik güçleri halka karşı gelmedi ve hükümet düştü. Baskı, toplumun gücünü bastırmak yerine ona karşı birleştirdi.' },
    collapse: { title: 'Devlet çöktü', text: 'Devletin kapasitesi tükendi; ülke Namevcut Leviathan’a savruldu. Düzen olmadan özgürlük de kalıcı olamadı.' },
    complete: { title: 'Görev süresi tamamlandı', text: '' },
};

/** Sayılar için iyelik + bulunma eki: 14’ünde, 6’sında, 20’sinde */
function locative(n) {
    const poss = pctPoss(n / 100);
    const v = poss[poss.length - 1];
    return `${poss}${v === 'i' || v === 'ü' ? 'nde' : 'nda'}`;
}

/** Sonucu gerçekte olana göre anlatan kısa metin */
function outcomeText(s, first, last) {
    const n = s.corridorYears;
    const total = Math.max(1, s.turn);
    const startIn = first.type === 'Shackled';
    const endIn = last.type === 'Shackled';
    let firstIn = null;
    for (const h of s.history) {
        if (h.type === 'Shackled') {
            firstIn = h.year;
            break;
        }
    }
    const libUp = s.liberty - s.startLiberty;
    const lib = libUp > 0.05 ? ' Özgürlük endeksi belirgin biçimde yükseldi.' : libUp < -0.05 ? ' Özgürlük endeksi ise geriledi.' : '';
    if (startIn && endIn) return `${n === total ? `Ülkeyi ${total} yılın tamamında` : `Ülkeyi ${total} yılın ${n}’${locative(n)}`} koridorda tuttunuz. Kızıl Kraliçe yarışını sürdürdünüz.${lib}`;
    if (startIn && !endIn) return `Koridordan başladınız ama sonunda dışarı kaydınız: devlet ile toplumun birlikte büyümesi durdu.${lib}`;
    if (!startIn && endIn && firstIn) return `Koridora ${firstIn} yılında ulaştınız ve ${n} yıl orada kaldınız. Dengeyi daha erken kurmak puanı artırırdı.${lib}`;
    if (!startIn && n > 0) return `Koridora girdiniz ama kalıcı olamadınız; toplam ${n} yıl orada kaldınız.${lib}`;
    return `Koridora ulaşamadınız. Denge için devleti ve toplumu aynı anda güçlendiren politikalara ağırlık verin.${lib}`;
}

export function finalReport(s) {
    const turns = Math.max(1, s.turn);
    const avg = s.score / turns;
    const grades = [
        [17.5, 'A', 'Özgürlüğün mimarı', 'Devleti ve toplumu birlikte büyüttünüz; ülke dar koridorda kalıcı bir yer edindi.'],
        [13.5, 'B', 'Koridorun eşiğinde', 'Dengeyi büyük ölçüde kurdunuz; koridor artık ulaşılabilir bir hedef.'],
        [9.5, 'C', 'Kırılgan denge', 'İlerleme var ama kazanımlar kırılgan; güç odakları ve dinamikler dengeyi zorluyor.'],
        [5.5, 'D', 'Kaçırılmış fırsat', 'Ülke başladığı yerden pek uzaklaşamadı; Kızıl Kraliçe yarışında geride kaldınız.'],
        [-Infinity, 'E', 'Leviathan’ın gölgesinde', 'Denge bozuldu; özgürlük için gereken koşullar zayıfladı.'],
    ];
    let g = grades.find(([t]) => avg >= t);
    if (s.ending?.reason && s.ending.reason !== 'complete') g = [0, 'E', ENDINGS[s.ending.reason].title, ENDINGS[s.ending.reason].text];
    const first = s.history[0];
    const last = s.history[s.history.length - 1];
    if (!s.ending || s.ending.reason === 'complete') g = [g[0], g[1], g[2], outcomeText(s, first, last)];
    return {
        grade: g[1],
        title: g[2],
        text: g[3],
        score: Math.round(s.score),
        avg: Math.round(avg * 10) / 10,
        corridorYears: s.corridorYears,
        years: turns,
        startType: first.type,
        endType: last.type,
        dx: last.x - first.x,
        dy: last.y - first.y,
        liberty: [s.startLiberty, s.liberty],
        crises: s.crises,
        ending: s.ending?.reason || 'complete',
    };
}
