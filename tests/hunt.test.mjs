import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDb, WEB, readJSON } from './setup.mjs';

const { db } = await loadDb();
db.countries = readJSON('countries.json');
const H = await import(`${WEB}/pages/hunt/logic.js`);
const Daily = await import(`${WEB}/pages/game/daily.js`);

test('bulmaca havuzu güncel, haritada çizilen ve başkenti bilinen ülkelerden oluşur', () => {
    const pool = H.huntPool();
    assert.ok(pool.length >= 100, `havuz ${pool.length}`);
    const world = new Set(readJSON('world.geojson').features.map((f) => f.properties.id));
    for (const id of pool) {
        assert.ok(world.has(id), `${id} sınırları var`);
        assert.ok(H.capitalOf(id), `${id} başkenti var`);
        assert.notEqual(H.continentTR(id), '—');
    }
});

test('günün ülkesi herkes için aynı ve havuz bitmeden tekrar etmez', () => {
    const pool = H.huntPool();
    assert.deepEqual(H.huntPuzzle('2026-10-05'), H.huntPuzzle('2026-10-05'));
    const seen = new Set();
    for (let n = 1; n <= pool.length; n++) seen.add(H.huntPuzzle(Daily.keyFromNumber(n)).id);
    assert.equal(seen.size, pool.length);
    const today = H.huntPuzzle('2026-10-05');
    for (let seed = 1; seed <= 300; seed++) assert.notEqual(H.practicePuzzle(seed, today.id).id, today.id, 'pratik günün ülkesini vermez');
});

test('uzaklık ve yön hesapları', () => {
    const ankara = { lat: 39.93, lng: 32.86 };
    const istanbul = { lat: 41.01, lng: 28.98 };
    const km = H.distanceKm(ankara, istanbul);
    assert.ok(km > 330 && km < 370, `Ankara–İstanbul ${km.toFixed(0)} km`);
    // İstanbul, Ankara'nın ~330 km batısında ve yalnızca ~120 km kuzeyinde
    assert.equal(H.compassWord(H.bearing(ankara, istanbul)), 'batı');
    assert.equal(H.compassWord(H.bearing(istanbul, ankara)), 'doğu');
    assert.equal(H.compassWord(H.bearing(ankara, { lat: 55.75, lng: 37.62 })), 'kuzey');
    const self = H.evaluateGuess('TUR', 'TUR');
    assert.equal(self.correct, true);
    assert.equal(self.similarity, 1);
    const g = H.evaluateGuess('GRC', 'TUR');
    assert.equal(g.correct, false);
    assert.ok(g.km > 700 && g.km < 1000, `Atina–Ankara ${g.km.toFixed(0)} km`);
    assert.ok(g.similarity > 0 && g.similarity < 1);
});

test('harita yayı: hedef, ipucunun sekiz yönlü diliminde ve halkanın üzerinde', () => {
    const ankara = { lat: 39.93, lng: 32.86 };
    const moscow = { lat: 55.75, lng: 37.62 };
    // destination, bearing ve distanceKm ile tutarlı
    const p = H.destination(ankara, H.bearing(ankara, moscow), H.distanceKm(ankara, moscow));
    assert.ok(H.distanceKm(p, moscow) < 1, 'hedefe varır');
    assert.equal(H.compassBearing(350), 0);
    assert.equal(H.compassBearing(112), 90);
    assert.equal(H.compassBearing(113), 135);
    // Her tahmin için hedefin başkenti yayın iki ucu arasında kalır
    for (const [guess, target] of [['GRC', 'TUR'], ['BRA', 'JPN'], ['NZL', 'ISL'], ['USA', 'RUS']]) {
        const e = H.evaluateGuess(guess, target);
        const from = H.capitalOf(guess);
        const arc = H.compassArc(from, e.bearing, e.km);
        assert.ok(arc.length >= 30);
        for (const [lng, lat] of arc) assert.ok(Math.abs(H.distanceKm(from, { lng, lat }) - e.km) < 1, 'yay halkanın üzerinde');
        const off = ((e.bearing - H.compassBearing(e.bearing) + 540) % 360) - 180;
        assert.ok(Math.abs(off) <= 22.5, `${guess}→${target} yön dilimin içinde`);
    }
});

test('ipuçları yanlış tahminle açılır; ad maskesi yalnızca ilk harfi gösterir', () => {
    assert.equal(H.hints('TUR', 0).length, 0);
    assert.deepEqual(
        H.hints('TUR', 5).map((h) => h.key),
        ['continent', 'region', 'capital', 'name', 'shape'],
    );
    assert.equal(H.hints('TUR', 1)[0].value, 'Asya');
    assert.equal(H.maskName('Türkiye'), 'T······');
    assert.equal(H.maskName('Güney Kore'), 'G···· ····');
});

test('seri ve paylaşım metni', () => {
    const k = Daily.keyFromNumber;
    const results = { [k(3)]: { done: true, solved: true }, [k(4)]: { done: true, solved: true }, [k(5)]: { done: true, solved: false } };
    assert.equal(H.huntStreak(results, k(4)), 2);
    assert.equal(H.huntStreak(results, k(5)), 0, 'bulunamayan gün seriyi bozar');
    assert.equal(H.huntStreak(results, k(6)), 0);
    const evals = [H.evaluateGuess('BRA', 'MLI'), H.evaluateGuess('SEN', 'MLI'), H.evaluateGuess('MLI', 'MLI')];
    assert.equal(H.guessSquares(evals), '□▣■');
    const text = H.shareHunt({ number: 7, key: k(7), evals, solved: true }, 'https://ornek/#/oyun/leviathan-avi');
    assert.match(text, /Leviathan Avı #7/);
    assert.match(text, /3\/6 □▣■/);
});
