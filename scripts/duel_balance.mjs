/**
 * Kızıl Kraliçe senaryolarının dengesini ölçer: her senaryoda iki "orta"
 * yapay zekâ birbirine karşı oynar. Kurallar değişince çalıştırılıp çıktısı
 * src/web/scripts/pages/duel/scenarios.js içindeki `balance` alanlarına
 * yazılmalıdır.
 *
 *   node scripts/duel_balance.mjs [oyun sayısı]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

globalThis.location = { pathname: '/' };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(root, 'src/web/scripts');
const DATA = path.join(root, 'data/web');

const data = await import(path.join(WEB, 'core/data.js'));
const corridor = JSON.parse(fs.readFileSync(path.join(DATA, 'corridor.json'), 'utf8'));
data.db.corridor = corridor;
data.db.types = corridor.types;
const D = await import(path.join(WEB, 'pages/duel/engine.js'));
const AI = await import(path.join(WEB, 'pages/duel/ai.js'));
const { DUEL_SCENARIOS } = await import(path.join(WEB, 'pages/duel/scenarios.js'));
const { rng } = await import(path.join(WEB, 'core/random.js'));

const N = Number(process.argv[2] || 60);
const out = {};
for (const sc of DUEL_SCENARIOS) {
    const row = corridor.series[sc.id].find((r) => r[0] === sc.year);
    const gameData = JSON.parse(fs.readFileSync(path.join(DATA, 'game', `${sc.id}.json`), 'utf8'));
    const tally = { state: 0, society: 0, draw: 0 };
    for (let i = 1; i <= N; i++) {
        const seed = i * 7919 + sc.year;
        const g = D.createDuel({ id: sc.id, name: sc.id, startYear: sc.year, start: { x: row[1], y: row[2] }, rounds: 12, seed, gameData });
        const r = rng(seed * 3 + 1);
        while (g.status === 'playing') {
            D.submit(g, 'state', AI.chooseMove(g, 'state', 'orta', r));
            D.submit(g, 'society', AI.chooseMove(g, 'society', 'orta', r));
            D.resolve(g);
        }
        const { winner } = D.duelResult(g);
        tally[winner === 'none' ? 'draw' : winner]++;
    }
    out[`${sc.id}-${sc.year}`] = { state: +(tally.state / N).toFixed(2), society: +(tally.society / N).toFixed(2) };
    console.log(`${sc.id} ${sc.year}: Devlet %${Math.round((100 * tally.state) / N)} · Toplum %${Math.round((100 * tally.society) / N)} · berabere %${Math.round((100 * tally.draw) / N)}`);
}
console.log(JSON.stringify(out));
