import test from 'node:test';
import assert from 'node:assert/strict';
import { WEB } from './setup.mjs';

const { suffix, pctPoss, pctAbl, signed, num, fold } = await import(`${WEB}/core/format.js`);

test('yıllar için Türkçe ekler', () => {
    assert.equal(suffix(2003, 'de'), '2003’te');
    assert.equal(suffix(1996, 'de'), '1996’da');
    assert.equal(suffix(2013, 'den'), '2013’ten');
    assert.equal(suffix(1960, 'de'), '1960’ta');
    assert.equal(suffix(2020, 'de'), '2020’de');
    assert.equal(suffix(1900, 'den'), '1900’den');
    assert.equal(suffix(2012, 'e'), '2012’ye');
    assert.equal(suffix(2013, 'e'), '2013’e');
});

test('adlar için Türkçe ekler', () => {
    assert.equal(suffix('Türkiye', 'in'), 'Türkiye’nin');
    assert.equal(suffix('Rusya', 'de'), 'Rusya’da');
    assert.equal(suffix('Irak', 'de'), 'Irak’ta');
    assert.equal(suffix('Kâğıttan', 'e'), 'Kâğıttan’a');
    assert.equal(suffix('Zincirlenmiş', 'e'), 'Zincirlenmiş’e');
});

test('yüzde ekleri', () => {
    const cases = { 0.71: ['i', 'inden'], 0.64: ['ü', 'ünden'], 0.12: ['si', 'sinden'], 0.3: ['u', 'undan'], 0.4: ['ı', 'ından'], 0.06: ['sı', 'sından'], 1: ['ü', 'ünden'] };
    for (const [ratio, [poss, abl]] of Object.entries(cases)) {
        assert.equal(pctPoss(Number(ratio)), poss, `iyelik ${ratio}`);
        assert.equal(pctAbl(Number(ratio)), abl, `ayrılma ${ratio}`);
    }
});

test('sayı biçimi', () => {
    assert.equal(num(0.239), '0,24');
    assert.equal(num(-1.494), '−1,49');
    assert.equal(signed(0.239), '+0,24');
    assert.equal(signed(-0.001), '0,00');
    assert.equal(fold('Türkiye Çin Işık'), 'turkiye cin isik');
});
