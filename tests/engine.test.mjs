import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDb, WEB, readJSON } from './setup.mjs';

const { db } = await loadDb();
const E = await import(`${WEB}/pages/game/engine.js`);
const { POLICY_BY_ID } = await import(`${WEB}/pages/game/policies.js`);
const R = await import(`${WEB}/pages/game/replay-code.js`);
const Daily = await import(`${WEB}/pages/game/daily.js`);

const startOf = (id, year) => {
    const r = db.corridor.series[id].find((p) => p[0] === year);
    return { x: r[1], y: r[2] };
};
const gameData = (id) => readJSON(`game/${id}.json`);

function newGame(id, year, opts = {}) {
    return E.createGame({ id, name: id, start: startOf(id, year), startYear: year, turns: 20, seed: 7, gameData: gameData(id), ...opts });
}

function play(strategy, seed = 7, id = 'TUR', year = 2016, turns = 20) {
    const s = newGame(id, year, { seed, turns });
    while (s.status === 'playing') {
        if (s.event && s.event.choice === null) E.chooseEvent(s, strategy === 'repress' ? E.currentEvent(s).choices.length - 1 : 0);
        if (s.status !== 'playing') break;
        if (strategy === 'mixed' && s.turn % 3 === 1) E.redraw(s);
        for (const pid of s.hand) {
            const cat = POLICY_BY_ID[pid].cat;
            if ((strategy === 'reform' || strategy === 'mixed') && ['toplum', 'denetim', 'devlet'].includes(cat)) E.toggleSelect(s, pid);
            if (strategy === 'repress' && cat === 'baski') E.toggleSelect(s, pid);
        }
        E.endYear(s);
    }
    return { s, r: E.finalReport(s) };
}

test('aynı tohum aynı oyunu üretir', () => {
    const a = play('reform', 42);
    const b = play('reform', 42);
    assert.equal(a.r.score, b.r.score);
    assert.deepEqual(a.s.history.map((h) => h.type), b.s.history.map((h) => h.type));
});

test('oyun belirlenen tur sayısında ya da erken bir sonla biter', () => {
    const { s } = play('reform', 3);
    assert.equal(s.status, 'over');
    assert.ok(s.turn === 20 || s.ending.reason !== 'complete');
});

test('reform, baskıdan ortalamada daha yüksek puan getirir', () => {
    let reform = 0;
    let repress = 0;
    for (let seed = 1; seed <= 8; seed++) {
        reform += play('reform', seed).r.avg;
        repress += play('repress', seed).r.avg;
    }
    assert.ok(reform > repress + 15, `reform ${reform.toFixed(1)} / baskı ${repress.toFixed(1)}`);
});

test('koridorda yerinde saymak, koşmaktan belirgin biçimde kötü (Kızıl Kraliçe)', () => {
    let idle = 0;
    let run = 0;
    for (let seed = 1; seed <= 6; seed++) {
        idle += play('none', seed, 'NOR', 2003).r.avg;
        run += play('reform', seed, 'NOR', 2003).r.avg;
    }
    assert.ok(run > idle + 6 * 1.5, `koşan ${(run / 6).toFixed(1)} / yerinde sayan ${(idle / 6).toFixed(1)}`);
});

test('bütçe ve kart sınırları uygulanır', () => {
    const s = newGame('TUR', 2002, { turns: 10, seed: 1 });
    s.capital.current = 10;
    const pricey = s.hand.find((id) => POLICY_BY_ID[id].cost > 10);
    if (pricey) assert.equal(E.toggleSelect(s, pricey).ok, false);
    s.capital.current = 999;
    let picked = 0;
    for (const id of s.hand) if (E.toggleSelect(s, id).ok) picked++;
    assert.ok(picked <= E.MAX_POLICIES);
});

test('sermaye kazandıran kart bırakılınca bütçeyi aşan seçim kırpılır', () => {
    const s = newGame('TUR', 2002, { turns: 10, seed: 1 });
    s.hand = ['ohal', 'yargi', 'basin', 'dernek', 'vergi'];
    s.selected = [];
    s.capital.current = 20;
    assert.equal(E.toggleSelect(s, 'ohal').ok, true);
    assert.equal(E.toggleSelect(s, 'yargi').ok, true);
    E.toggleSelect(s, 'ohal');
    assert.ok(E.preview(s).cost <= s.capital.current, 'kalan seçim bütçe içinde');
});

test('olay yanıtlanmadan yıl bitmez', () => {
    const s = newGame('BRA', 2005, { seed: 11 });
    for (let i = 0; i < 20 && s.status === 'playing'; i++) {
        if (s.event && s.event.choice === null) {
            assert.equal(E.canEndYear(s), false);
            E.chooseEvent(s, 0);
        }
        E.endYear(s);
    }
});

test('aynı yıl çok reform, kaybedenlerin tepkisini büyütür', () => {
    const s = newGame('TUR', 2002, { seed: 1 });
    const one = E.preview(s, ['yolsuzluk']).stake.elite;
    const three = E.preview(s, ['yolsuzluk', 'dernek', 'vergi']).stake.elite;
    assert.ok(E.paceMultiplier(s, ['yolsuzluk', 'dernek', 'vergi']) > 1.5);
    assert.ok(three < one * 1.5 + -0.12, `tek reform ${one} / üç reform ${three}`);
});

test('kriz olasılığı memnuniyet düştükçe artar ve bekleme süresine uyar', () => {
    const s = newGame('TUR', 2002, { seed: 1 });
    s.stake.military = { sat: 0.6, inf: 0.6 };
    assert.equal(E.crisisRisk(s, 'military'), 0);
    s.stake.military.sat = 0.3;
    const mid = E.crisisRisk(s, 'military');
    s.stake.military.sat = 0.1;
    const high = E.crisisRisk(s, 'military');
    assert.ok(mid > 0 && high > mid);
    s.lastCrisis = { military: s.turn - 1 };
    assert.equal(E.crisisRisk(s, 'military'), 0);
});

test('gerçek tarih aynı formülle puanlanır ve fark hesaplanır', () => {
    const { s, r } = play('reform', 5, 'TUR', 2002);
    assert.equal(s.hist.length, 20);
    assert.equal(s.hist[0].year, 2003);
    assert.equal(r.marginYears, 20);
    assert.equal(r.margin, Math.round(s.overlapScore - s.histScore));
    const recent = newGame('TUR', 2016);
    assert.equal(recent.hist.length, db.corridor.series.TUR.at(-1)[0] - 2016, 'veri bittikten sonrası karşılaştırılmaz');
});

test('tekrar kodu oyunu birebir yeniden üretir', () => {
    for (const [id, year, seed] of [['TUR', 2002, 5], ['EGY', 2013, 9], ['NOR', 2003, 2]]) {
        const { s } = play('mixed', seed, id, year);
        const code = R.encodeGame(s);
        const decoded = R.decodeCode(code);
        assert.equal(R.isOutdated(decoded), false);
        const { s: again, issues } = R.replayGame(decoded, { name: id, start: startOf(id, year), gameData: gameData(id) });
        assert.deepEqual(issues, []);
        assert.equal(again.score, s.score, `${id} puanı`);
        assert.deepEqual(again.history, s.history);
        assert.equal(R.encodeGame(again), code);
    }
});

test('kurallara aykırı tekrar kodu yakalanır', () => {
    const { s } = play('reform', 5, 'TUR', 2002);
    const code = R.encodeGame(s);
    const parts = code.split('-');
    const turns = parts[6].split('_');
    turns[0] = `${turns[0].split('.')[0]}.0123`; // aynı yıl dört kart (en fazla üç olabilir)
    parts[6] = turns.join('_');
    const { issues } = R.replayGame(R.decodeCode(parts.join('-')), { name: 'TUR', start: startOf('TUR', 2002), gameData: gameData('TUR') });
    assert.ok(issues.length > 0);
    assert.throws(() => R.decodeCode('bozuk'));
    assert.throws(() => R.decodeCode('2-TUR-2002-20-d-abc-x.'));
});

test('günün senaryosu herkes için aynı ve döngüde tekrar etmiyor', () => {
    assert.match(Daily.dayKey(new Date(Date.UTC(2026, 8, 23, 22, 30))), /^2026-09-24$/, 'gün İstanbul saatine göre değişir');
    const a = Daily.dailyScenario('2026-10-01');
    const b = Daily.dailyScenario('2026-10-01');
    assert.deepEqual(a, b);
    const seen = new Set();
    for (let n = 1; n <= Daily.DAILY_POOL.length; n++) {
        const sc = Daily.dailyScenario(Daily.keyFromNumber(n));
        seen.add(`${sc.id}-${sc.year}`);
        assert.ok(db.corridor.series[sc.id].some((r) => r[0] === sc.year), `${sc.id} ${sc.year} verisi var`);
        assert.ok(sc.turns >= 12);
    }
    assert.equal(seen.size, Daily.DAILY_POOL.length);
    assert.equal(Daily.dayNumber('2026-09-23'), 1);
    const results = { '2026-09-25': {}, '2026-09-26': {}, '2026-09-27': {} };
    assert.equal(Daily.dailyStreak(results, '2026-09-27'), 3);
    assert.equal(Daily.dailyStreak(results, '2026-09-28'), 3, 'bugün henüz oynanmadıysa seri bozulmaz');
    assert.equal(Daily.dailyStreak(results, '2026-09-29'), 0);
});
