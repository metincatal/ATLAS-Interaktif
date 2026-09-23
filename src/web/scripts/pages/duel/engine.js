/**
 * Kızıl Kraliçe — düello motoru (saf mantık, arayüzden bağımsız)
 *
 * İki taraf, Devlet ve Toplum, aynı ülkenin koridor düzlemindeki konumu
 * üzerinde yarışır: x = toplumun gücü, y = devletin gücü.
 *
 * Her tur (iki yıl):
 *   1. Bir dönem olayı açılır.
 *   2. İki taraf da gizlice bir duruş ve isterse bir özel kart seçer.
 *   3. Hamleler birlikte açılır. Sonucu iki duruşun birleşimi belirler;
 *      konum, güç odakları, kartlar ve olay bu sonucu ölçekler.
 *   4. Refah puanı dağıtılır: ülke koridordaysa refah büyüktür ve koridor
 *      ekseninde ilerledikçe artar; dışarıdaysa küçüktür. Refahın ne kadarını
 *      kimin alacağını denge belirler: devlet öndeyse Devlet, toplum öndeyse
 *      Toplum daha çok alır.
 *
 * Böylece iki taraf da dengeyi kendi lehine zorlamak ister ama ülke koridordan
 * düşerse paylaşılacak refah küçülür. Oyun sonunda puanı yüksek olan kazanır.
 */

import { db, corridorGap, corridorProgress } from '../../core/data.js';
import { rng, gauss, pickWeighted, shuffle } from '../../core/random.js';
import { nearestType, weightedSatisfaction } from '../game/engine.js';
import { STANCES, MATRIX, CARDS, STATE_DECK, SOCIETY_DECK, EVENTS, EVENT_BY_ID, CENTERS, controller } from './cards.js';

export const DUEL_VERSION = 1;
export const HAND = 3;
export const RES_CAP = 8;
export const YEARS_PER_ROUND = 2;

/**
 * Sayısal kurallar. Bir hücrenin temel sonucu = devletin eylemi + toplumun
 * eylemi + etkileşim ([devlet, toplum] gücündeki değişim). Çarpanlar eylemleri
 * ayrı ayrı ölçekler; etkileşim sabit kalır.
 */
export const RULES = {
    actS: { insa: [0.11, 0], baski: [0.04, -0.1], uzlasi: [-0.02, 0.06] },
    actT: { orgutlen: [0, 0.1], direnc: [-0.08, 0.04], katil: [0.05, 0.01] },
    inter: {
        'insa|orgutlen': [0, 0],
        'insa|direnc': [0.05, -0.03],
        'insa|katil': [-0.01, 0],
        'baski|orgutlen': [0.01, -0.15],
        'baski|direnc': [-0.04, 0.01],
        'baski|katil': [-0.04, 0.02],
        'uzlasi|orgutlen': [0, -0.03],
        'uzlasi|direnc': [0.08, -0.06],
        'uzlasi|katil': [0.03, -0.01],
    },
    redQueen: 1.15,
    shareSlope: 0.25,
    /** Katıl: toplum o turun refahından fazladan pay alır (koridordaysa daha çok) */
    katilShare: { Shackled: 0.06, other: 0.03 },
    entropy: 0.02,
    noise: 0.025,
    imbalance: 0,
    katilIncome: 2,
    revolution: { dy: -0.25, dx: 0.15, legit: 4 },
    collapseY: -2.5,
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const round3 = (v) => Math.round(v * 1000) / 1000;

function dimPos(v) {
    return clamp(1 - (v - 1.1) / 2.4, 0.3, 1);
}
function dimNeg(v) {
    return clamp(1 + (v + 1.6) / 2.2, 0.35, 1);
}

/** Bu turun refahı: koridorda büyük ve ilerledikçe artan, dışarıda küçük */
export function regionR(type, progress) {
    if (type === 'Shackled') return 3 + 2 * clamp(progress - 0.9, 0, 1);
    if (type === 'Despotic') return 1.4;
    if (type === 'Absent') return 1.1;
    return 0.9;
}

/**
 * Güç dengesi: başlangıçtan bu yana devletin gücündeki artış eksi toplumun
 * gücündeki artış. Her senaryo 0'dan başlar (Go'daki komi gibi); böylece
 * kazananı başlangıç konumu değil, oyuncuların hamleleri belirler.
 */
export function balance(g) {
    return g.y - g.start.y - (g.x - g.start.x);
}

/** Refahtan Devlet'in payı: denge devlete kaydıkça artar, topluma kaydıkça azalır */
export function stateShare(bal) {
    return clamp(0.5 + RULES.shareSlope * bal, 0.1, 0.9);
}

export function stanceCost(stance) {
    return STANCES[stance]?.cost ?? 0;
}

// ---------------------------------------------------------------------------
// Kurulum

/**
 * Başlangıç eğilimleri Leviathan tipine göre senaryoya renk katar; her tipte
 * eğilimlerin toplamı sıfırdır ve hiçbir taraf bir güç odağını hazır kontrol
 * ederek başlamaz (kontrol ±2'de başlar). Odaklar oyun içinde kazanılır.
 */
const START_LEANS = {
    Despotic: { military: 1, elite: 1, civil: -1, religious: 0, international: -1 },
    Paper: { military: 1, elite: 0, civil: 0, religious: -1, international: 0 },
    Absent: { military: 0, elite: 0, civil: -1, religious: 0, international: 1 },
    Shackled: { military: 0, elite: 1, civil: -1, religious: 0, international: 0 },
};

function initialCenters(type) {
    return { ...START_LEANS[type] };
}

export function createDuel({ id, name, startYear, start, rounds = 12, seed = Date.now() % 1e9, mode = 'hotseat', human = null, aiLevel = 'orta', gameData = null }) {
    const pairs = gameData?.years?.[String(startYear)]?.s;
    const stake = pairs ? { military: { inf: pairs[0][0], sat: pairs[0][1] }, elite: { inf: pairs[1][0], sat: pairs[1][1] }, civil: { inf: pairs[2][0], sat: pairs[2][1] }, religious: { inf: pairs[3][0], sat: pairs[3][1] }, international: { inf: pairs[4][0], sat: pairs[4][1] } } : null;
    const type = nearestType(start.x, start.y);
    const r = rng(seed);
    const g = {
        v: DUEL_VERSION,
        id,
        name,
        startYear,
        year: startYear,
        round: 0,
        rounds,
        seed,
        mode,
        human,
        aiLevel,
        x: start.x,
        y: start.y,
        start: { x: start.x, y: start.y },
        type,
        startType: type,
        legit: stake ? clamp(5 + Math.round((weightedSatisfaction(stake) - 0.45) * 5), 4, 6) : 5,
        res: { state: 4, society: 3 },
        centers: initialCenters(type),
        decks: { state: shuffle(STATE_DECK, r), society: shuffle(SOCIETY_DECK, r) },
        hands: { state: [], society: [] },
        discard: { state: [], society: [] },
        event: null,
        lastEvent: null,
        pending: { state: null, society: null },
        score: { state: 0, society: 0 },
        prosperity: 0,
        corridorRounds: 0,
        moves: { state: [], society: [] },
        history: [],
        log: [],
        last: null,
        status: 'playing',
        ending: null,
    };
    for (const side of ['state', 'society']) while (g.hands[side].length < HAND) draw(g, side, r);
    g.history.push(snapshot(g, null));
    startRound(g);
    return g;
}

function draw(g, side, r) {
    if (!g.decks[side].length) {
        g.decks[side] = shuffle(g.discard[side], r);
        g.discard[side] = [];
    }
    const card = g.decks[side].shift();
    if (card) g.hands[side].push(card);
}

function snapshot(g, report) {
    return {
        round: g.round,
        year: g.year,
        x: round3(g.x),
        y: round3(g.y),
        type: g.type,
        gap: round3(corridorGap(g.x, g.y)),
        balance: round3(balance(g)),
        legit: g.legit,
        res: { ...g.res },
        centers: { ...g.centers },
        score: { state: round3(g.score.state), society: round3(g.score.society) },
        moves: report ? report.moves : null,
    };
}

/** Tur başı: dönem olayı açılır ve başlangıç etkisi uygulanır */
function startRound(g) {
    const r = rng(g.seed + (g.round + 1) * 104729);
    const pool = EVENTS.filter((e) => e.id !== g.lastEvent);
    const ev = pickWeighted(pool, pool.map((e) => e.weight ?? 1), r);
    g.event = ev.id;
    g.lastEvent = ev.id;
    ev.start?.(g);
    g.res.state = clamp(g.res.state, 0, RES_CAP);
    g.res.society = clamp(g.res.society, 0, RES_CAP);
    for (const k of CENTERS) g.centers[k] = clamp(g.centers[k], -3, 3);
    g.legit = clamp(g.legit, 0, 10);
    g.pending = { state: null, society: null };
}

// ---------------------------------------------------------------------------
// Hamleler

export function stancesFor(side) {
    return side === 'state' ? ['insa', 'baski', 'uzlasi'] : ['orgutlen', 'direnc', 'katil'];
}

/** Bir tarafın bu tur seçebileceği duruşlar (kaynak yetmiyorsa kapalı) */
export function legalStances(g, side) {
    return stancesFor(side).map((id) => ({ id, ok: stanceCost(id) <= g.res[side], cost: stanceCost(id) }));
}

export function cardFits(cardId, stance) {
    const c = CARDS[cardId];
    return c.with.includes('any') || c.with.includes(stance);
}

export function legalCards(g, side, stance) {
    const budget = g.res[side] - stanceCost(stance);
    return g.hands[side].map((id) => ({ id, ok: cardFits(id, stance) && CARDS[id].cost <= budget, fits: cardFits(id, stance), cost: CARDS[id].cost }));
}

export function validMove(g, side, move) {
    if (!move || !stancesFor(side).includes(move.stance)) return 'Bir duruş seçin.';
    if (stanceCost(move.stance) > g.res[side]) return 'Bu duruş için kaynağınız yetmiyor.';
    if (move.card) {
        if (!g.hands[side].includes(move.card)) return 'Bu kart elinizde değil.';
        if (!cardFits(move.card, move.stance)) return 'Bu kart seçtiğiniz duruşla oynanamaz.';
        if (stanceCost(move.stance) + CARDS[move.card].cost > g.res[side]) return 'Kart için kaynağınız yetmiyor.';
    }
    return null;
}

export function submit(g, side, move) {
    if (g.status !== 'playing') return { ok: false, reason: 'Düello bitti.' };
    const reason = validMove(g, side, move);
    if (reason) return { ok: false, reason };
    g.pending[side] = { stance: move.stance, card: move.card || null };
    return { ok: true };
}

export function bothReady(g) {
    return Boolean(g.pending.state && g.pending.society);
}

// ---------------------------------------------------------------------------
// Çözüm

/**
 * İki hamlenin sonucunu hesaplar (durumu değiştirmez).
 * expected: rastlantı yerine beklenen değer (yapay zekânın öngörüsü için).
 */
export function computeOutcome(g, moveS, moveT, { r = null, expected = false } = {}) {
    const S = moveS.stance;
    const T = moveT.stance;
    const gap = corridorGap(g.x, g.y);
    const bal = balance(g);
    const c = { S, T, x: g.x, y: g.y, gap, bal, centers: g.centers, mS: 1, mSy: 1, mT: 1, mTx: 1, dx: 0, dy: 0, legit: MATRIX[S][T].legit, res: { state: 0, society: 0 }, shift: {}, gamble: null };

    // İvme ve güç odakları: dengeyi başlangıca göre kendi lehine çeviren tarafın araçları güçlenir
    if (S === 'baski') {
        c.mS *= clamp(1 + 0.5 * bal, 0.5, 1.6);
        const mil = controller(g.centers.military);
        if (mil === 'state') c.mS *= 1.25;
        else if (mil === 'society') c.mS *= 0.6;
        if (controller(g.centers.international) === 'society') c.legit -= 1;
    }
    if (T === 'direnc') c.mT *= clamp(1 - 0.5 * bal, 0.5, 1.6) * (g.legit <= 3 ? 1.3 : 1);
    if (T === 'orgutlen') {
        const civ = controller(g.centers.civil);
        if (civ === 'society') c.mTx *= 1.2;
        else if (civ === 'state') c.mTx *= 0.8;
    }
    if (S === 'insa') {
        const el = controller(g.centers.elite);
        if (el === 'state') c.mSy *= 1.15;
        else if (el === 'society') c.mSy *= 0.9;
    }

    EVENT_BY_ID[g.event]?.mod?.(c);
    if (moveS.card) CARDS[moveS.card].apply(c);
    if (moveT.card) CARDS[moveT.card].apply(c);

    const [aSy, aSx] = RULES.actS[S];
    const [aTy, aTx] = RULES.actT[T];
    const [iy, ix] = RULES.inter[`${S}|${T}`];
    let dy = aSy * c.mS * c.mSy + aTy * c.mT + iy + c.dy;
    let dx = aSx * c.mS + aTx * c.mT * c.mTx + ix + c.dx;

    // Olağanüstü hal kumarı
    let gamble = null;
    if (c.gamble) {
        const { p, win, lose } = c.gamble;
        if (expected) {
            dx += p * (win.dx || 0);
            c.legit += (1 - p) * (lose.legit || 0);
            c.shift.military = (c.shift.military || 0) + (1 - p) * (lose.military || 0);
        } else {
            const won = (r ? r() : 0.5) < p;
            gamble = { won, p };
            if (won) dx += win.dx || 0;
            else {
                c.legit += lose.legit || 0;
                c.shift.military = (c.shift.military || 0) + (lose.military || 0);
            }
        }
    }

    // Kızıl Kraliçe: dengeye yakınken birlikte koşmak ikisini de fazladan büyütür
    const redQueen = S === 'insa' && T === 'orgutlen' && Math.abs(gap) < 1;
    if (redQueen) {
        if (dy > 0) dy *= RULES.redQueen;
        if (dx > 0) dx *= RULES.redQueen;
    }

    // Azalan getiri iki eksende aynı: güçlü ülkelerde büyüme yavaşlar ama taraflardan birini kayırmaz
    const up = dimPos(Math.max(g.x, g.y));
    const down = dimNeg(Math.min(g.x, g.y));
    dy *= dy > 0 ? up : down;
    dx *= dx > 0 ? up : down;

    // Duruşların güç odaklarına etkisi
    const shift = { ...c.shift };
    const add = (k, v) => (shift[k] = (shift[k] || 0) + v);
    if (S === 'baski') {
        add('international', -1);
        add('civil', -1);
        if (T === 'direnc' && moveS.card !== 'ohal') add('military', -1);
    }
    if (T === 'orgutlen' && S !== 'baski') add('civil', -1);
    if (S === 'insa' && T === 'katil') add('elite', 1);

    return {
        dx,
        dy,
        dLegit: c.legit,
        shift,
        resState: -stanceCost(S) - (moveS.card ? CARDS[moveS.card].cost : 0) + c.res.state,
        resSociety: -stanceCost(T) - (moveT.card ? CARDS[moveT.card].cost : 0) + c.res.society + (T === 'katil' ? RULES.katilIncome : 0),
        redQueen,
        gamble,
        katil: T === 'katil',
        text: MATRIX[S][T].text,
    };
}

/**
 * Tur sonu geliri: taban gelir, başlangıçtan bu yana kendi gücündeki büyüme ve
 * tutulan güç odakları. Büyüme mutlak düzeye göre değil başlangıca göre
 * ölçülür; zayıf bir devletle başlayan oyuncu da eşit gelirle başlar.
 */
export function income(g, side) {
    const growth = side === 'state' ? g.y - g.start.y : g.x - g.start.x;
    let inc = 1 + clamp(Math.round(growth * 3), 0, 2);
    const has = (k) => controller(g.centers[k]) === side;
    if (has('elite')) inc += 1;
    if (has('international')) inc += 1;
    if (has('religious')) inc += 1;
    if (side === 'society' && has('civil')) inc += 1;
    if (side === 'state' && g.legit >= 7) inc += 1;
    return inc;
}

/**
 * Bir turu uygular. project: yapay zekânın öngörüsü için hafif kopya üzerinde
 * (rastlantısız, kart çekmeden, kayıt tutmadan) çalışır.
 */
export function applyRound(g, moveS, moveT, { r = null, project = false } = {}) {
    const out = computeOutcome(g, moveS, moveT, { r, expected: project });
    const before = { x: g.x, y: g.y, type: g.type };

    g.x = clamp(g.x + out.dx, -3.2, 3.2);
    g.y = clamp(g.y + out.dy, -3.2, 3.2);
    g.legit = clamp(g.legit + out.dLegit, 0, 10);
    for (const [k, v] of Object.entries(out.shift)) g.centers[k] = clamp(g.centers[k] + v, -3, 3);
    g.res.state = clamp(g.res.state + out.resState, 0, RES_CAP);
    g.res.society = clamp(g.res.society + out.resSociety, 0, RES_CAP);

    const notes = [];
    // Denge bozulursa geride kalan taraf daha da geriler
    const gap = corridorGap(g.x, g.y);
    if (RULES.imbalance && gap > 1.0) {
        g.x -= RULES.imbalance * (gap - 0.5);
        notes.push('Devlet toplumun çok önünde; sivil alan daralıyor.');
    } else if (RULES.imbalance && gap < -1.0) {
        g.y -= RULES.imbalance * (-gap - 0.5);
        notes.push('Toplum devletin çok önünde; kamu kapasitesi aşınıyor.');
    }
    // Koşmayan geride kalır
    g.x -= RULES.entropy;
    g.y -= RULES.entropy;
    // Dinî kurumlar
    const rel = controller(g.centers.religious);
    if (rel === 'society') {
        g.y -= 0.02;
        notes.push('Dinî kurumlar toplumun yanında: gelenekler devlet kapasitesini sınırlıyor (normlar kafesi).');
    } else if (rel === 'state') g.legit = clamp(g.legit + 0.5, 0, 10);
    if (!project && r) {
        g.x = clamp(g.x + gauss(r) * RULES.noise, -3.2, 3.2);
        g.y = clamp(g.y + gauss(r) * RULES.noise, -3.2, 3.2);
    }

    // Devrim
    let revolution = false;
    if (g.legit <= 0) {
        revolution = true;
        g.y += RULES.revolution.dy;
        g.x += RULES.revolution.dx;
        for (const k of CENTERS) g.centers[k] = clamp(g.centers[k] - 1, -3, 3);
        g.legit = RULES.revolution.legit;
        g.res.state = Math.max(0, g.res.state - 3);
        notes.push('Meşruiyet tükendi: kitlesel ayaklanma rejimi sarstı.');
    }

    // Gelir
    g.res.state = clamp(g.res.state + income(g, 'state'), 0, RES_CAP);
    g.res.society = clamp(g.res.society + income(g, 'society'), 0, RES_CAP);

    // Puan
    g.type = nearestType(g.x, g.y);
    const prog = corridorProgress(g.x, g.y);
    const R = regionR(g.type, prog);
    let share = stateShare(balance(g));
    if (out.katil) share = Math.max(0.05, share - (g.type === 'Shackled' ? RULES.katilShare.Shackled : RULES.katilShare.other));
    g.score.state += R * share;
    g.score.society += R * (1 - share);
    g.prosperity += R;
    if (g.type === 'Shackled') g.corridorRounds += 1;

    g.round += 1;
    g.year += YEARS_PER_ROUND;
    return { out, before, R, share, notes, revolution };
}

/** İki taraf da hamlesini yaptıysa turu çözer ve bir sonrakine geçer */
export function resolve(g) {
    if (g.status !== 'playing' || !bothReady(g)) return null;
    const moveS = g.pending.state;
    const moveT = g.pending.society;
    const r = rng(g.seed + (g.round + 1) * 7919);
    const event = g.event;
    const legitBefore = g.legit;
    const { out, before, R, share, notes, revolution } = applyRound(g, moveS, moveT, { r });

    // Kartlar: oynanan kart atılır, el yeniden üçe tamamlanır
    for (const [side, move] of [['state', moveS], ['society', moveT]]) {
        if (move.card) {
            g.hands[side] = g.hands[side].filter((c) => c !== move.card);
            g.discard[side].push(move.card);
        }
        while (g.hands[side].length < HAND) draw(g, side, r);
        g.moves[side].push(move.stance);
    }

    const report = {
        round: g.round,
        yearFrom: g.year - YEARS_PER_ROUND,
        year: g.year,
        event,
        moves: { state: moveS, society: moveT },
        dx: g.x - before.x,
        dy: g.y - before.y,
        legit: g.legit - legitBefore,
        R,
        share,
        gain: { state: R * share, society: R * (1 - share) },
        text: out.text,
        redQueen: out.redQueen,
        gamble: out.gamble,
        shift: out.shift,
        notes,
        revolution,
        typeChange: before.type !== g.type ? { from: before.type, to: g.type } : null,
    };
    g.last = report;
    g.history.push(snapshot(g, report));
    g.log.unshift(report);

    if (g.y < RULES.collapseY) {
        g.status = 'over';
        g.ending = 'collapse';
    } else if (g.round >= g.rounds) {
        g.status = 'over';
        g.ending = 'complete';
    } else startRound(g);
    return report;
}

// ---------------------------------------------------------------------------
// Sonuç

export function duelResult(g) {
    const diff = g.score.state - g.score.society;
    let winner = Math.abs(diff) < 0.5 ? 'draw' : diff > 0 ? 'state' : 'society';
    if (g.ending === 'collapse') winner = 'none';
    const first = g.history[0];
    const last = g.history[g.history.length - 1];
    const stanceShare = (side) => {
        const n = g.moves[side].length || 1;
        return Object.fromEntries(stancesFor(side).map((s) => [s, g.moves[side].filter((m) => m === s).length / n]));
    };
    return {
        winner,
        diff,
        score: { ...g.score },
        prosperity: g.prosperity,
        maxProsperity: g.rounds * 5,
        corridorRounds: g.corridorRounds,
        rounds: g.round,
        startType: first.type,
        endType: last.type,
        dx: last.x - first.x,
        dy: last.y - first.y,
        stances: { state: stanceShare('state'), society: stanceShare('society') },
        redQueenRounds: g.log.filter((l) => l.redQueen).length,
    };
}

/** Arayüz için: bu turda her duruş çiftinin beklenen sonucu (kartsız) */
export function outcomeGrid(g) {
    const grid = {};
    for (const S of stancesFor('state')) {
        grid[S] = {};
        for (const T of stancesFor('society')) {
            const o = computeOutcome(g, { stance: S }, { stance: T }, { expected: true });
            grid[S][T] = { dy: o.dy, dx: o.dx, legit: o.dLegit };
        }
    }
    return grid;
}
