import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDb, WEB } from './setup.mjs';

const { db } = await loadDb();
const E = await import(`${WEB}/pages/game/engine.js`);
const { POLICY_BY_ID } = await import(`${WEB}/pages/game/policies.js`);

const startOf = (id, year) => {
    const r = db.corridor.series[id].find((p) => p[0] === year);
    return { x: r[1], y: r[2] };
};

function play(strategy, seed = 7, id = 'TUR', year = 2016) {
    const s = E.createGame({ id, name: id, start: startOf(id, year), startYear: year, turns: 20, seed });
    while (s.status === 'playing') {
        if (s.event && s.event.choice === null) E.chooseEvent(s, strategy === 'repress' ? E.currentEvent(s).choices.length - 1 : 0);
        if (s.status !== 'playing') break;
        for (const pid of s.hand) {
            const cat = POLICY_BY_ID[pid].cat;
            if (strategy === 'reform' && ['toplum', 'denetim', 'devlet'].includes(cat)) E.toggleSelect(s, pid);
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
    assert.ok(reform > repress + 20, `reform ${reform.toFixed(1)} / baskı ${repress.toFixed(1)}`);
});

test('bütçe ve kart sınırları uygulanır', () => {
    const s = E.createGame({ id: 'TUR', name: 'TUR', start: startOf('TUR', 2002), startYear: 2002, turns: 10, seed: 1 });
    s.capital.current = 10;
    const pricey = s.hand.find((id) => POLICY_BY_ID[id].cost > 10);
    if (pricey) assert.equal(E.toggleSelect(s, pricey).ok, false);
    s.capital.current = 999;
    let picked = 0;
    for (const id of s.hand) if (E.toggleSelect(s, id).ok) picked++;
    assert.ok(picked <= E.MAX_POLICIES);
});

test('olay yanıtlanmadan yıl bitmez', () => {
    const s = E.createGame({ id: 'BRA', name: 'BRA', start: startOf('BRA', 2005), startYear: 2005, turns: 20, seed: 11 });
    for (let i = 0; i < 20 && s.status === 'playing'; i++) {
        if (s.event && s.event.choice === null) {
            assert.equal(E.canEndYear(s), false);
            E.chooseEvent(s, 0);
        }
        E.endYear(s);
    }
});
