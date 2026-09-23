/**
 * Özgürlük Dengesi — oyun motoru (saf mantık, arayüzden bağımsız)
 *
 * Konum, uygulamanın geri kalanıyla aynı düzlemdedir: x = toplumun gücü,
 * y = devletin gücü. Leviathan tipi, verideki küme merkezlerine en yakınlıkla
 * belirlenir; böylece oyundaki bölgeler Gözlemevi'ndeki bölgelerle aynıdır.
 *
 * Her yıl:
 *   1. Olay (varsa) seçilir ve etkisi hemen uygulanır; bazı seçimlerin
 *      etkisi sonraki yıllara yayılır ya da ileride yeni bir olay doğurur.
 *   2. Seçilen politikalar uygulanır (azalan getiri ile). Aynı yıl çok
 *      reform yapmak, kaybeden güç odaklarının tepkisini büyütür.
 *   3. Kızıl Kraliçe dinamiği: denge bozulursa geride kalan taraf daha da
 *      geriler; koridorda ise bu yıl güçlendirilmeyen taraf aşınır.
 *   4. Koridor dışında kurumsal süreklilik konumu başlangıca doğru çeker.
 *   5. Güç odakları, özgürlük endeksi ve siyasi sermaye güncellenir.
 *   6. Puan verilir; aynı formülle ülkenin gerçek tarihi de puanlanır.
 *   7. Memnuniyetsiz güç odakları olasılığa bağlı olarak kriz çıkarır.
 *
 * Bütün rastlantı tohumdan türetilir: aynı tohum ve aynı hamleler her zaman
 * aynı oyunu üretir (tekrar kodları buna dayanır).
 */

import { db, corridorGap } from '../../core/data.js';
import { pctPoss } from '../../core/format.js';
import { POLICIES, POLICY_BY_ID, REFORM_CATS } from './policies.js';
import { EVENTS, CRISES, EVENT_BY_ID } from './events.js';
import { rng, gauss, pickWeighted } from '../../core/random.js';

export { rng };

/** Kurallar değişince artırılır; eski tekrar kodları uyarıyla açılır */
export const ENGINE_VERSION = 2;

export const GROUPS = ['military', 'elite', 'civil', 'religious', 'international'];
export const MAX_POLICIES = 3;
export const HAND_SIZE = 5;
export const REDRAW_COST = 5;
/** Koridorda "koşmak" sayılan en küçük yıllık güçlenme */
export const RUN = 0.02;

/**
 * Etki büyüklükleri gerçek veriye göre ayarlandı: ülkeler yılda ortalama ~0,05,
 * hızlı dönüşümlerde ~0,3 z-puanı hareket eder. İyi bir oyuncu bu hızlı
 * dönüşümlere yaklaşabilir ama aşamaz.
 */
export const DIFFICULTY = {
    kolay: { label: 'Kolay', effect: 0.95, drift: 0.7, capital: 1.25, noise: 0.03, eventChance: 0.5, hazard: 1.0, crisisT: 0.4, pace: 0.2 },
    dengeli: { label: 'Dengeli', effect: 0.8, drift: 1.0, capital: 1.0, noise: 0.045, eventChance: 0.62, hazard: 1.5, crisisT: 0.44, pace: 0.3 },
    zor: { label: 'Zor', effect: 0.68, drift: 1.3, capital: 0.85, noise: 0.06, eventChance: 0.75, hazard: 1.9, crisisT: 0.48, pace: 0.4 },
};

const TYPE_CAPITAL = {
    Shackled: { max: 110, regen: 32 },
    Despotic: { max: 130, regen: 36 },
    Paper: { max: 95, regen: 28 },
    Absent: { max: 90, regen: 26 },
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const round = (v, d = 3) => Math.round(v * 10 ** d) / 10 ** d;

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

/** Güç odaklarının etkiyle ağırlıklı ortalama memnuniyeti */
export function weightedSatisfaction(stake) {
    const inf = GROUPS.reduce((a, g) => a + stake[g].inf, 0);
    return GROUPS.reduce((a, g) => a + stake[g].sat * stake[g].inf, 0) / (inf || 1);
}

/**
 * Bir yılın puanı. Oyuncu da gerçek tarih de aynı formülle puanlanır.
 * Koridorda puan, devletin ve toplumun o yıl birlikte güçlenmesine bağlıdır
 * (Kızıl Kraliçe: yerinde kalmak için koşmak gerekir).
 */
export function yearPoints({ type, dist, prevDist, dx, dy, liberty, satisfaction, crisis = false }) {
    let pts = 0;
    let run = 0;
    if (type === 'Shackled') {
        pts += 10;
        if (dx >= RUN && dy >= RUN) run = 3;
        else if (dx >= RUN || dy >= RUN) run = 1;
        pts += run;
    } else {
        pts += Math.max(0, 6 - 3 * dist);
        if (dist < prevDist - 0.02) pts += 2;
    }
    pts += liberty * 6 + satisfaction * 4;
    if (crisis) pts -= 8;
    return { pts, run };
}

// ---------------------------------------------------------------------------
// Gerçek tarih: aynı yılların puanı

/** Koridor serisinden (eksik yıllarda en yakın önceki yıl) konum */
function seriesPoint(id, year, tolerance = 2) {
    const rows = db.corridor?.series?.[id];
    if (!rows) return null;
    for (let y = year; y >= year - tolerance; y--) {
        const row = rows.find((r) => r[0] === y);
        if (row) return { year: y, x: row[1], y: row[2], type: db.types[row[3]] };
    }
    return null;
}

function stakeFromData(gameData, year) {
    const pairs = gameData?.years?.[String(year)]?.s;
    if (!pairs) return null;
    return Object.fromEntries(GROUPS.map((g, i) => [g, { inf: pairs[i]?.[0] ?? 0.5, sat: pairs[i]?.[1] ?? 0.5 }]));
}

/**
 * Oyunun kapsadığı yıllar için gerçekte olanın puanı. Veri serisinin bittiği
 * yıldan sonrası karşılaştırmaya girmez.
 */
export function buildHistory(id, startYear, turns, gameData) {
    const out = [];
    let prev = seriesPoint(id, startYear);
    if (!prev) return out;
    const last = db.corridor.series[id][db.corridor.series[id].length - 1][0];
    for (let k = 1; k <= turns; k++) {
        const year = startYear + k;
        if (year > last) break;
        const p = seriesPoint(id, year);
        if (!p) break;
        const libdem = gameData?.years?.[String(year)]?.v?.[0];
        const stake = stakeFromData(gameData, year);
        const { pts } = yearPoints({
            type: p.type,
            dist: distanceToCorridor(p.x, p.y),
            prevDist: distanceToCorridor(prev.x, prev.y),
            dx: p.x - prev.x,
            dy: p.y - prev.y,
            liberty: libdem ?? libertyTarget(p.x, p.y),
            satisfaction: stake ? weightedSatisfaction(stake) : 0.5,
        });
        out.push({ year, x: round(p.x), y: round(p.y), type: p.type, pts: round(pts, 2) });
        prev = p;
    }
    return out;
}

// ---------------------------------------------------------------------------

export function createGame({ id, name, start, startYear, turns = 20, difficulty = 'dengeli', gameData, seed = Date.now() % 1e9, mode = 'serbest', daily = null }) {
    const stake = stakeFromData(gameData, startYear) || Object.fromEntries(GROUPS.map((g) => [g, { inf: 0.5, sat: 0.5 }]));
    for (const g of GROUPS) {
        stake[g] = { inf: clamp(stake[g].inf, 0.2, 0.8), sat: clamp(stake[g].sat, 0.1, 0.9) };
    }
    const libdem = gameData?.years?.[String(startYear)]?.v?.[0];
    const type = nearestType(start.x, start.y);
    const cap = TYPE_CAPITAL[type];
    const k = DIFFICULTY[difficulty].capital;
    const s = {
        v: ENGINE_VERSION,
        id,
        name,
        mode,
        daily,
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
        lastCrisis: {},
        lastElection: null,
        delayed: [],
        followUps: [],
        flags: {},
        lastPace: 0,
        ops: [],
        moves: [],
        history: [],
        log: [],
        score: 0,
        corridorYears: 0,
        runYears: 0,
        crises: 0,
        hist: buildHistory(id, startYear, turns, gameData),
        histScore: 0,
        overlapScore: 0,
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

function snapshot(s, pts = null) {
    return {
        year: s.year,
        x: round(s.x),
        y: round(s.y),
        type: s.type,
        liberty: round(s.liberty),
        capital: Math.round(s.capital.current),
        sat: Object.fromEntries(GROUPS.map((g) => [g, round(s.stake[g].sat, 2)])),
        pts: pts === null ? null : round(pts, 2),
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

/** Reform temposu: aynı yıl uygulanan reform sayısına göre tepki çarpanı */
export function paceMultiplier(s, ids = s.selected) {
    const n = ids.filter((id) => REFORM_CATS.includes(POLICY_BY_ID[id].cat)).length;
    return 1 + DIFFICULTY[s.difficulty].pace * Math.max(0, n - 1);
}

/** Politikanın güç odaklarına etkisi; reform kaybedenlerinin tepkisi tempoyla büyür */
function policyStake(p, pace) {
    const reform = REFORM_CATS.includes(p.cat);
    return Object.fromEntries(Object.entries(p.stake || {}).map(([g, d]) => [g, d < 0 && reform ? d * pace : d]));
}

/** Seçili politikaların tahmini etkisi (rastlantı ve dinamik hariç) */
export function preview(s, ids = s.selected) {
    const k = DIFFICULTY[s.difficulty].effect;
    const pace = paceMultiplier(s, ids);
    let dx = 0;
    let dy = 0;
    let cost = 0;
    const stake = {};
    for (const id of ids) {
        const p = POLICY_BY_ID[id];
        dy += p.dState * k * diminish(s.y + dy, p.dState);
        dx += p.dSociety * k * diminish(s.x + dx, p.dSociety);
        cost += p.cost;
        for (const [g, d] of Object.entries(policyStake(p, pace))) stake[g] = (stake[g] || 0) + d;
    }
    const synergy = synergyBonus(ids);
    return { dx: dx * synergy, dy: dy * synergy, cost, stake, synergy: synergy > 1, pace };
}

/** Aynı yıl hem devleti hem toplumu güçlendiren politikalar: Kızıl Kraliçe primi */
function synergyBonus(ids) {
    const up = ids.map((id) => POLICY_BY_ID[id]);
    const stateUp = up.some((p) => p.dState >= 0.05);
    const socUp = up.some((p) => p.dSociety >= 0.05);
    return stateUp && socUp && ids.length >= 2 ? 1.12 : 1;
}

// ---------------------------------------------------------------------------
// Kriz riski

/** Bir güç odağının bu yıl kriz çıkarma olasılığı (0–1) */
export function crisisRisk(s, g) {
    const D = DIFFICULTY[s.difficulty];
    const { sat, inf } = s.stake[g];
    if (s.turn - (s.lastCrisis?.[g] ?? -10) < 3) return 0;
    const r = Math.max(0, (D.crisisT - sat) / D.crisisT);
    if (r <= 0) return 0;
    let hz = D.hazard * (g === 'international' ? 0.45 : inf) * r ** 1.6;
    if (g === 'military' && inf > 0.5) hz *= 1.3;
    return clamp(hz, 0, 0.85);
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
    if (!s.hand.includes(id)) return { ok: false, reason: 'Bu kart elinizde değil.' };
    if (s.selected.includes(id)) {
        s.selected = s.selected.filter((x) => x !== id);
        // Sermaye kazandıran bir kart bırakılınca kalan seçim bütçeyi aşabilir
        let dropped = 0;
        while (s.selected.length && preview(s).cost > s.capital.current) {
            s.selected.pop();
            dropped++;
        }
        return dropped ? { ok: true, reason: 'Sermaye yetmediği için son seçtiğiniz politika da bırakıldı.' } : { ok: true };
    }
    if (s.selected.length >= MAX_POLICIES) return { ok: false, reason: `Bir yılda en fazla ${MAX_POLICIES} politika uygulayabilirsiniz.` };
    const cost = preview(s, [...s.selected, id]).cost;
    if (cost > s.capital.current) return { ok: false, reason: 'Bu politika için yeterli siyasi sermayeniz yok.' };
    s.selected = [...s.selected, id];
    return { ok: true };
}

export function redraw(s) {
    if (s.status !== 'playing') return { ok: false };
    if (s.redrawn) return { ok: false, reason: 'Kartları bu yıl zaten yenilediniz.' };
    if (s.capital.current < REDRAW_COST) return { ok: false, reason: 'Kartları yenilemek için yeterli sermaye yok.' };
    s.capital.current -= REDRAW_COST;
    s.redrawn = true;
    s.ops.push('r');
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
    const due = s.followUps.findIndex((f) => f.at <= s.turn);
    if (due !== -1) {
        const [f] = s.followUps.splice(due, 1);
        const ev = EVENT_BY_ID[f.id];
        if (ev && (!ev.cond || ev.cond(s))) {
            s.usedEvents[ev.id] = s.turn;
            return { id: ev.id, choice: null, outcome: null };
        }
    }
    if (s.turn === 0 || r() > DIFFICULTY[s.difficulty].eventChance) return null;
    const pool = EVENTS.filter((e) => {
        if (e.followOnly) return false;
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

const resolveValue = (v, s) => (typeof v === 'function' ? v(s) : v);

export function chooseEvent(s, index) {
    const ev = currentEvent(s);
    if (!ev || s.event.choice !== null || s.status !== 'playing') return null;
    const choice = ev.choices[index];
    if (!choice) return null;
    s.ops.push('abc'[index]);
    const r = rng(s.seed + s.turn * 977 + index);
    let outcome = { success: true, text: '' };
    let eff = resolveValue(choice.effects, s);
    let influence = choice.influence;
    let text = resolveValue(choice.result, s);
    let later = choice.later;
    let followUp = choice.followUp;
    if (choice.risk) {
        const chance = choice.risk.chance(s);
        const success = r() < chance;
        const branch = success ? choice.risk.success : choice.risk.fail;
        eff = resolveValue(branch.effects, s);
        influence = branch.influence;
        text = resolveValue(branch.result, s);
        later = branch.later ?? later;
        followUp = branch.followUp ?? followUp;
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
    if (choice.flag) s.flags[choice.flag] = (s.flags[choice.flag] || 0) + 1;
    if (later) s.delayed.push({ label: later.label, turns: later.turns, effects: resolveValue(later.effects, s), from: ev.id });
    if (followUp) {
        const [a, b] = followUp.in;
        s.followUps.push({ id: followUp.id, at: s.turn + a + Math.floor(r() * (b - a + 1)) });
    }
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
    const report = { year: s.year, policies: [...s.selected], notes: [], later: [] };
    s.moves.push({ ops: s.ops.join(''), sel: [...s.selected] });
    s.ops = [];

    // 1. Politikalar
    const pv = preview(s);
    let dxSum = 0;
    let dySum = 0;
    for (const id of s.selected) {
        const p = POLICY_BY_ID[id];
        const d = applyEffects(s, { dState: p.dState, dSociety: p.dSociety, stake: policyStake(p, pv.pace) });
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
    if (pv.pace > 1.01) report.notes.push('Aynı yıl çok sayıda reform: kaybeden güç odaklarının tepkisi büyüdü.');
    s.lastPace = pv.pace;

    // 2. Gecikmeli etkiler
    for (const d of s.delayed) {
        applyEffects(s, d.effects);
        d.turns -= 1;
        report.later.push(d.label);
    }
    s.delayed = s.delayed.filter((d) => d.turns > 0);

    // 3. Kızıl Kraliçe dinamiği
    const gap = corridorGap(s.x, s.y);
    const inCorridor = nearestType(s.x, s.y) === 'Shackled';
    if (gap > 1.0) {
        s.x -= 0.03 * D.drift * (gap - 0.5);
        s.stake.civil.sat = clamp(s.stake.civil.sat - 0.02, 0, 1);
        report.notes.push('Devlet toplumun çok önünde; sivil alan daralıyor.');
    } else if (gap < -1.0) {
        s.y -= 0.03 * D.drift * (-gap - 0.5);
        s.stake.elite.sat = clamp(s.stake.elite.sat - 0.015, 0, 1);
        report.notes.push('Toplum devletin çok önünde; kamu kapasitesi aşınıyor.');
    }
    if (inCorridor) {
        // Koridorda yerinde kalmak için koşmak gerekir: bu yıl güçlenmeyen taraf aşınır
        const decay = 0.045 * D.drift;
        const stateRan = pv.dy >= 0.03;
        const socRan = pv.dx >= 0.03;
        if (!stateRan) s.y -= decay;
        if (!socRan) s.x -= decay;
        if (stateRan && socRan && Math.abs(gap) < 0.8) {
            s.x += 0.012;
            s.y += 0.012;
            report.notes.push('Koridordasınız: devlet ve toplum birlikte koşuyor.');
        } else if (!stateRan && !socRan) report.notes.push('Bu yıl reform yapmadınız; koridorda yerinde saymak geriye düşmek demek.');
        else report.notes.push(`Bu yıl yalnızca ${stateRan ? 'devleti' : 'toplumu'} güçlendirdiniz; geride kalan taraf aşınıyor.`);
    } else {
        // Kurumsal süreklilik: kısır döngüler ülkeyi başladığı yere çeker
        s.x += (s.start.x - s.x) * 0.03 * D.drift;
        s.y += (s.start.y - s.y) * 0.03 * D.drift;
    }

    // 4. Rastlantı
    s.x = clamp(s.x + gauss(r) * D.noise, -3.2, 3.2);
    s.y = clamp(s.y + gauss(r) * D.noise, -3.2, 3.2);

    // 5. Güç odakları: hafıza zamanla solar, etki toplumun gücüyle değişir
    for (const g of GROUPS) s.stake[g].sat = clamp(s.stake[g].sat + (0.5 - s.stake[g].sat) * 0.06, 0, 1);
    const socMove = s.x - before.x;
    s.stake.civil.inf = clamp(s.stake.civil.inf + socMove * 0.12, 0.15, 0.85);
    s.stake.military.inf = clamp(s.stake.military.inf - socMove * 0.05, 0.15, 0.85);

    // 6. Özgürlük endeksi
    s.liberty = clamp(s.liberty + (libertyTarget(s.x, s.y) - s.liberty) * 0.3, 0, 1);

    // 7. Tip ve sermaye
    const newType = nearestType(s.x, s.y);
    if (newType !== s.type) {
        addLog(s, 'type', `Bölge değişimi: ${typeLabel(s.type)} → ${typeLabel(newType)}`, newType === 'Shackled' ? 'Dar koridora girdiniz.' : '');
        report.typeChange = { from: s.type, to: newType };
    }
    s.type = newType;
    const base = TYPE_CAPITAL[s.type];
    s.capital.max = Math.round(base.max * D.capital);
    s.capital.regen = Math.round(base.regen * D.capital);
    const weighted = weightedSatisfaction(s.stake);
    let regen = s.capital.regen * (0.55 + 0.9 * weighted);
    if (s.capital.penalty) {
        regen *= s.capital.penalty.regen;
        s.capital.penalty.turns -= 1;
        if (s.capital.penalty.turns <= 0) s.capital.penalty = null;
    }
    s.capital.current = clamp(s.capital.current + regen, 0, s.capital.max);
    report.regen = Math.round(regen);

    // 8. Puan
    const crisisYear = Boolean(s.event && EVENT_BY_ID[s.event.id]?.crisis);
    const { pts, run } = yearPoints({
        type: s.type,
        dist: distanceToCorridor(s.x, s.y),
        prevDist: before.dist,
        dx: s.x - before.x,
        dy: s.y - before.y,
        liberty: s.liberty,
        satisfaction: weighted,
        crisis: crisisYear,
    });
    if (s.type === 'Shackled') s.corridorYears += 1;
    if (run === 3) s.runYears += 1;
    s.score += pts;
    report.points = Math.round(pts);
    report.run = run;
    report.dx = s.x - before.x;
    report.dy = s.y - before.y;

    // 9. Gerçek tarihle karşılaştırma
    const real = s.hist.find((h) => h.year === s.year + 1);
    if (real) {
        s.histScore += real.pts;
        s.overlapScore += pts;
        report.real = { ...real };
    }

    // 10. Çöküş ve krizler
    if (s.y < -2.6) {
        s.year += 1;
        s.turn += 1;
        s.history.push(snapshot(s, pts));
        endGame(s, 'collapse');
        return report;
    }
    const risks = GROUPS.map((g) => ({ g, p: crisisRisk(s, g) })).filter((c) => c.p > 0);
    const roll = r();
    let acc = 0;
    s.pendingCrisis = null;
    for (const c of risks.sort((a, b) => b.p - a.p)) {
        acc += c.p * (1 - acc);
        if (roll < acc) {
            s.pendingCrisis = c.g;
            s.lastCrisis = { ...s.lastCrisis, [c.g]: s.turn };
            break;
        }
    }

    // 11. Yeni yıl
    s.year += 1;
    s.turn += 1;
    s.history.push(snapshot(s, pts));
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
    // Oyunu bitiren olay seçimi de tekrar kodunda yer alsın
    if (s.ops.length) {
        s.moves.push({ ops: s.ops.join(''), sel: [] });
        s.ops = [];
    }
    s.status = 'over';
    s.selected = [];
    s.ending = { reason };
}

function fmt(v) {
    const t = Math.abs(v).toFixed(2).replace('.', ',');
    return (v >= 0 ? '+' : '−') + t;
}

/** Oyuncunun gerçek tarihe göre farkı (yalnızca verinin olduğu yıllar) */
export function historyMargin(s) {
    const years = s.hist.filter((h) => h.year <= s.year && h.year > s.startYear).length;
    return { margin: s.overlapScore - s.histScore, years, total: s.hist.length };
}

// ---------------------------------------------------------------------------
// Danışman ve rapor

export function advisor(s) {
    const tips = [];
    const gap = corridorGap(s.x, s.y);
    const names = { military: 'Ordu', elite: 'Ekonomik elit', civil: 'Sivil toplum', religious: 'Dinî kurumlar', international: 'Uluslararası toplum' };
    const risky = GROUPS.map((g) => ({ g, p: crisisRisk(s, g) }))
        .filter((c) => c.p >= 0.06)
        .sort((a, b) => b.p - a.p);
    if (risky[0]?.g === 'military') tips.push(`Ordu huzursuz: bu yıl darbe girişimi olasılığı yaklaşık %${Math.round(risky[0].p * 100)}. Uzlaşı ya da güvenlik kartları nefes aldırır ama toplumun gücünden yer.`);
    else if (risky.length) tips.push(`${names[risky[0].g]} memnuniyetsiz: kriz olasılığı yaklaşık %${Math.round(risky[0].p * 100)}. Siyasi sermayeniz de memnuniyete bağlı olarak yenilenir.`);
    if (s.selected.length && paceMultiplier(s) > 1.01) tips.push('Aynı yıl birden çok reform seçtiniz: kaybeden güç odaklarının tepkisi büyüyecek. Hızlı ilerlemek ile krizi göze almak arasında seçim yapın.');
    if (s.type === 'Shackled') tips.push('Koridordasınız. Kızıl Kraliçe’yi unutmayın: her yıl hem devleti hem toplumu güçlendirmezseniz geride kalan taraf aşınır ve puanınız düşer.');
    else if (gap > 0.9) tips.push('Devlet toplumun çok önünde. Toplumu güçlendiren politikalar (örgütlenme, basın, yerel yönetim) olmadan koridora giremezsiniz; aksi hâlde toplum daha da geriler.');
    else if (gap < -0.9) tips.push('Toplum güçlü ama devlet kapasitesi zayıf. Vergi, liyakat ve hukuk gibi kapasite politikalarıyla devleti toplumun hızına yetiştirin.');
    else if (s.x < -0.2 && s.y < -0.2) tips.push('Devlet de toplum da zayıf: Kâğıttan Leviathan. Denetim ve denge politikaları ikisini birlikte büyütür ve Kızıl Kraliçe primi kazandırır.');
    else tips.push('Denge görece korunuyor. Aynı yıl hem devleti hem toplumu güçlendiren iki politika seçerseniz ek etki (Kızıl Kraliçe primi) kazanırsınız.');
    if (s.delayed.length) tips.push('Geçmiş kararlarınızın etkileri sürüyor; “Bu yılın etkisi” bölümündeki gecikmeli etkileri hesaba katın.');
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
    if (startIn && endIn) return `${n === total ? `Ülkeyi ${total} yılın tamamında` : `Ülkeyi ${total} yılın ${n}’${locative(n)}`} koridorda tuttunuz. ${s.runYears >= n * 0.6 ? 'Kızıl Kraliçe yarışını sürdürdünüz.' : 'Ama çoğu yıl koşmadınız; yerinde saymak puanınızı düşürdü.'}${lib}`;
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
    const hm = historyMargin(s);
    return {
        grade: g[1],
        title: g[2],
        text: g[3],
        score: Math.round(s.score),
        avg: Math.round(avg * 10) / 10,
        corridorYears: s.corridorYears,
        runYears: s.runYears,
        years: turns,
        startType: first.type,
        endType: last.type,
        dx: last.x - first.x,
        dy: last.y - first.y,
        liberty: [s.startLiberty, s.liberty],
        crises: s.crises,
        ending: s.ending?.reason || 'complete',
        margin: hm.years ? Math.round(hm.margin) : null,
        marginYears: hm.years,
        histScore: Math.round(s.histScore),
        overlapScore: Math.round(s.overlapScore),
    };
}
