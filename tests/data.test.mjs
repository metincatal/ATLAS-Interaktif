import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDb, readJSON } from './setup.mjs';

const { corridorGap, db } = await loadDb();

const at = (id, year) => {
    const r = db.corridor.series[id].find((p) => p[0] === year);
    return { x: r[1], y: r[2], type: db.types[r[3]] };
};

test('koridor serisi kilit ülkeleri içerir (eski ad eşleme hatası giderildi)', () => {
    for (const id of ['RUS', 'IRN', 'EGY', 'VEN', 'YEM', 'TUR', 'CHN', 'USA']) {
        assert.ok(db.corridor.series[id], `${id} serisi var`);
        assert.ok(db.corridor.series[id].some((p) => p[0] >= 2020), `${id} için 2020 sonrası veri var`);
    }
});

test('tipler küme merkezlerine en yakınlıkla tutarlı', () => {
    let ok = 0;
    let total = 0;
    for (const rows of Object.values(db.corridor.series)) {
        for (const [, x, y, t] of rows) {
            let best = null;
            let bestD = Infinity;
            for (const [type, [cx, cy]] of Object.entries(db.corridor.centroids)) {
                const d = (x - cx) ** 2 + (y - cy) ** 2;
                if (d < bestD) [best, bestD] = [type, d];
            }
            total++;
            if (best === db.types[t]) ok++;
        }
    }
    assert.ok(ok / total > 0.99, `tutarlılık ${(ok / total).toFixed(4)}`);
});

test('denge işareti koridor eksenine göre', () => {
    assert.ok(corridorGap(at('CHN', 2023).x, at('CHN', 2023).y) > 1, 'Çin: devlet toplumun önünde');
    assert.ok(corridorGap(at('SOM', 2023).x, at('SOM', 2023).y) < -1, 'Somali: toplum devletin önünde');
    assert.ok(Math.abs(corridorGap(at('NOR', 2023).x, at('NOR', 2023).y)) < 1.1, 'Norveç: dengede');
});

test('ülke kaydı ve katman dosyaları', () => {
    const countries = readJSON('countries.json');
    assert.equal(countries.TUR.tr, 'Türkiye');
    assert.equal(countries.TUR.iso2, 'tr');
    assert.ok(countries.TUR.hist.some((h) => h[2] === 'Osmanlı İmparatorluğu'));
    const wgi = readJSON('wgi.json');
    assert.deepEqual(Object.keys(wgi.data).sort(), ['cc', 'ge', 'pv', 'rl', 'rq', 'va']);
    const meta = readJSON('meta.json');
    assert.equal(Object.keys(meta.vdem).length, 12);
});
