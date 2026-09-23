/**
 * Tekrar kodu: bir oyunun senaryosu ve bütün hamleleri tek satırlık bir koda
 * sığar. Motor tohumlu olduğu için kod yeniden oynatılınca aynı oyun ve aynı
 * puan çıkar; paylaşılan skorlar bu yüzden doğrulanabilir.
 *
 * Biçim: 2-TUR-2016-20-d-<tohum, 36 tabanında>-<tur>_<tur>_…
 *   tur = işlemler + "." + seçilen politikalar
 *   işlemler: a/b/c olay seçeneği, r kartları yenileme (yapıldıkları sırayla)
 *   politikalar: politika destesindeki sıraları, 62 tabanında birer karakter
 */

import { POLICIES } from './policies.js';
import { ENGINE_VERSION, MAX_POLICIES, createGame, chooseEvent, redraw, preview, endYear } from './engine.js';

const B62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIFF = { kolay: 'k', dengeli: 'd', zor: 'z' };
const DIFF_BACK = { k: 'kolay', d: 'dengeli', z: 'zor' };
const POLICY_INDEX = new Map(POLICIES.map((p, i) => [p.id, i]));

export function encodeGame(s) {
    const turns = s.moves.map((m) => `${m.ops}.${m.sel.map((id) => B62[POLICY_INDEX.get(id)]).join('')}`);
    return [s.v, s.id, s.startYear, s.turns, DIFF[s.difficulty], s.seed.toString(36), turns.join('_')].join('-');
}

export function decodeCode(code) {
    const parts = String(code || '')
        .trim()
        .split(/[-~]/);
    if (parts.length < 6) throw new Error('Tekrar kodu eksik ya da bozuk.');
    const [v, id, startYear, turns, diff, seed36, moves = ''] = parts;
    const out = {
        v: Number(v),
        id: id.toUpperCase(),
        startYear: Number(startYear),
        turns: Number(turns),
        difficulty: DIFF_BACK[diff],
        seed: parseInt(seed36, 36),
        moves: moves ? moves.split('_').map(parseTurn) : [],
    };
    if (!/^[A-Z]{3}$/.test(out.id) || !Number.isInteger(out.startYear) || !Number.isInteger(out.turns) || out.turns < 1 || out.turns > 60 || !out.difficulty || !Number.isFinite(out.seed)) {
        throw new Error('Tekrar kodu okunamadı.');
    }
    if (out.moves.length > out.turns) throw new Error('Tekrar kodunda oyun süresinden fazla tur var.');
    return out;
}

function parseTurn(token) {
    const [ops = '', sel = ''] = token.split('.');
    if (!/^[abcr]*$/.test(ops)) throw new Error('Tekrar kodunda tanınmayan bir hamle var.');
    return {
        ops: [...ops],
        sel: [...sel].map((c) => {
            const p = POLICIES[B62.indexOf(c)];
            if (!p) throw new Error('Tekrar kodunda tanınmayan bir politika var.');
            return p.id;
        }),
    };
}

/** Eski bir motor sürümüyle üretilmiş kod mu? */
export function isOutdated(decoded) {
    return decoded.v !== ENGINE_VERSION;
}

/**
 * Kodu baştan oynatır ve oyunun son durumunu döndürür. Olay seçimleri ve kart
 * yenilemeleri oyuncunun yaptığı sırayla uygulanır; yıl sonundaki seçim ise
 * olduğu gibi kurulur ve kurallara uygunluğu (elde olma, adet, sermaye)
 * denetlenir. Kurallara aykırı bir hamle `issues` listesine yazılır.
 */
export function replayGame(decoded, { name, start, gameData, mode = 'tekrar', daily = null }) {
    const s = createGame({ id: decoded.id, name, start, startYear: decoded.startYear, turns: decoded.turns, difficulty: decoded.difficulty, gameData, seed: decoded.seed, mode, daily });
    const issues = [];
    decoded.moves.forEach((move, turn) => {
        if (s.status !== 'playing') return;
        for (const op of move.ops) {
            if (op === 'r') {
                if (!redraw(s).ok) issues.push(`${turn + 1}. tur: kart yenileme geçersiz`);
            } else if (!chooseEvent(s, 'abc'.indexOf(op))) issues.push(`${turn + 1}. tur: olay seçimi geçersiz`);
            if (s.status !== 'playing') return;
        }
        const sel = move.sel;
        const legal = sel.length <= MAX_POLICIES && new Set(sel).size === sel.length && sel.every((id) => s.hand.includes(id)) && preview(s, sel).cost <= s.capital.current;
        if (!legal) issues.push(`${turn + 1}. tur: politika seçimi kurallara uymuyor`);
        s.selected = legal ? [...sel] : [];
        if (!endYear(s)) issues.push(`${turn + 1}. tur: yıl tamamlanamadı`);
    });
    return { s, issues };
}
