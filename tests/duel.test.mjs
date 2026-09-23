import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDb, WEB, readJSON } from './setup.mjs';

const { db } = await loadDb();
const D = await import(`${WEB}/pages/duel/engine.js`);
const AI = await import(`${WEB}/pages/duel/ai.js`);
const { DUEL_SCENARIOS } = await import(`${WEB}/pages/duel/scenarios.js`);
const { SOCIETY_DECK } = await import(`${WEB}/pages/duel/cards.js`);
const { rng } = await import(`${WEB}/core/random.js`);

const startOf = (id, year) => {
    const r = db.corridor.series[id].find((p) => p[0] === year);
    return { x: r[1], y: r[2] };
};
const duel = (id, year, seed = 1, rounds = 12) => D.createDuel({ id, name: id, startYear: year, start: startOf(id, year), rounds, seed, gameData: readJSON(`game/${id}.json`) });

function playOut(g, botS, botT, seed) {
    const r = rng(seed);
    while (g.status === 'playing') {
        assert.equal(D.submit(g, 'state', botS(g, 'state', r)).ok, true);
        assert.equal(D.submit(g, 'society', botT(g, 'society', r)).ok, true);
        D.resolve(g);
    }
    return D.duelResult(g);
}
const nash = (g, side, r) => AI.chooseMove(g, side, 'orta', r);
const random = (g, side, r) => {
    const st = D.legalStances(g, side).filter((s) => s.ok);
    return { stance: st[Math.floor(r() * st.length)].id, card: null };
};

test('düello her senaryoda eşit başlar ve belirlenen turda biter', () => {
    const g = duel('TUR', 2016);
    assert.equal(D.balance(g), 0);
    assert.equal(D.stateShare(D.balance(g)), 0.5);
    assert.equal(g.hands.state.length, D.HAND);
    assert.equal(g.hands.society.length, D.HAND);
    const res = playOut(g, nash, nash, 3);
    assert.equal(g.status, 'over');
    assert.ok(g.round === 12 || g.ending === 'collapse');
    assert.ok(['state', 'society', 'draw', 'none'].includes(res.winner));
    assert.equal(g.year, 2016 + g.round * D.YEARS_PER_ROUND);
});

test('aynı tohum ve aynı hamleler aynı düelloyu üretir', () => {
    const a = duel('POL', 1989, 42);
    const b = duel('POL', 1989, 42);
    const ra = playOut(a, nash, nash, 9);
    const rb = playOut(b, nash, nash, 9);
    assert.deepEqual(a.history, b.history);
    assert.equal(ra.diff, rb.diff);
});

test('kurallara aykırı hamleler reddedilir', () => {
    const g = duel('TUR', 2002);
    g.res.state = 0;
    assert.equal(D.submit(g, 'state', { stance: 'baski' }).ok, false, 'kaynak yetmiyor');
    assert.equal(D.submit(g, 'state', { stance: 'orgutlen' }).ok, false, 'karşı tarafın duruşu');
    g.res.state = 8;
    const foreign = SOCIETY_DECK[0];
    assert.equal(D.submit(g, 'state', { stance: 'insa', card: foreign }).ok, false, 'elde olmayan kart');
    g.hands.state = ['ohal', 'vergi', 'taviz'];
    assert.equal(D.submit(g, 'state', { stance: 'insa', card: 'ohal' }).ok, false, 'duruşa uymayan kart');
    assert.equal(D.submit(g, 'state', { stance: 'baski', card: 'ohal' }).ok, true);
    assert.equal(D.bothReady(g), false);
    assert.equal(D.resolve(g), null, 'iki taraf hazır olmadan tur çözülmez');
});

test('duruş matrisi kuramla tutarlı: birlikte koşmak büyütür, baskı örgütü ezer, baskıya direniş iki tarafı yıpratır', () => {
    const g = duel('TUR', 2002);
    g.event = 'sakin';
    const o = (S, T) => D.computeOutcome(g, { stance: S }, { stance: T }, { expected: true });
    const run = o('insa', 'orgutlen');
    assert.ok(run.dx > 0 && run.dy > 0 && run.redQueen);
    const crush = o('baski', 'orgutlen');
    assert.ok(crush.dx < -0.1 && crush.dLegit < 0);
    const clash = o('baski', 'direnc');
    assert.ok(clash.dx < 0 && clash.dy < 0);
    // İnşa eden devlete karşı örgütsüz direniş söner: denge devlete kayar
    const fizzle = o('insa', 'direnc');
    assert.ok(fizzle.dy - fizzle.dx > 0);
    // Uzlaşı örgütlü topluma taviz verir
    const concede = o('uzlasi', 'orgutlen');
    assert.ok(concede.dx - concede.dy > 0.1);
});

test('refah koridorda büyür, pay dengeye göre dağılır', () => {
    assert.ok(D.regionR('Shackled', 1) > 2 * D.regionR('Despotic', 1));
    assert.ok(D.stateShare(0.4) > 0.5 && D.stateShare(-0.4) < 0.5);
    assert.ok(D.stateShare(10) <= 0.9 && D.stateShare(-10) >= 0.1);
});

test('sıfır toplamlı çözücü taş-kâğıt-makası dengeye, baskın satırı saf stratejiye götürür', () => {
    const rps = AI.solveZeroSum([
        [0, -1, 1],
        [1, 0, -1],
        [-1, 1, 0],
    ], 3000);
    for (const v of [...rps.p, ...rps.q]) assert.ok(Math.abs(v - 1 / 3) < 0.05);
    const dom = AI.solveZeroSum([
        [2, 3],
        [1, 0],
    ]);
    assert.ok(dom.p[0] > 0.95);
});

test('yapay zekânın hamlesi her zaman kurallara uygundur', () => {
    for (const level of ['kolay', 'orta', 'zor']) {
        const g = duel('EGY', 2011, 5);
        const r = rng(11);
        while (g.status === 'playing') {
            for (const side of ['state', 'society']) {
                const move = AI.chooseMove(g, side, level, r, { history: g.moves[side === 'state' ? 'society' : 'state'] });
                assert.equal(D.validMove(g, side, move), null, `${level} ${side} ${JSON.stringify(move)}`);
                D.submit(g, side, move);
            }
            D.resolve(g);
        }
    }
});

test('strateji önemlidir: dengeli yapay zekâ rastgele oyuncuyu açık farkla yener', () => {
    let wins = 0;
    let games = 0;
    for (const [id, year] of [['TUR', 2002], ['POL', 1989], ['EGY', 2011]]) {
        for (let seed = 1; seed <= 4; seed++) {
            const a = playOut(duel(id, year, seed), nash, random, seed);
            const b = playOut(duel(id, year, seed + 50), random, nash, seed + 50);
            wins += (a.winner === 'state') + (b.winner === 'society');
            games += 2;
        }
    }
    assert.ok(wins / games >= 0.75, `kazanma oranı ${(wins / games).toFixed(2)}`);
});

test('seçkin senaryolarda iki taraf da kazanabilir', () => {
    let stateWins = 0;
    let societyWins = 0;
    for (const sc of DUEL_SCENARIOS.slice(0, 6)) {
        for (let seed = 1; seed <= 4; seed++) {
            const res = playOut(duel(sc.id, sc.year, seed * 31), nash, nash, seed * 31);
            if (res.winner === 'state') stateWins++;
            if (res.winner === 'society') societyWins++;
        }
    }
    const total = stateWins + societyWins;
    assert.ok(stateWins / total > 0.25 && societyWins / total > 0.25, `Devlet ${stateWins} · Toplum ${societyWins}`);
});
