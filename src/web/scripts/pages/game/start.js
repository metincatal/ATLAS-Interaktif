/**
 * Özgürlük Dengesi oyununu başlatan ortak yardımcılar (kurulum, oyun merkezi,
 * günün senaryosu ve tekrar sayfası aynı yolu kullanır).
 */

import { db, loadCore, loadGameCountry, corridorAt, countryName } from '../../core/data.js';
import { save } from '../../core/store.js';
import { navigate } from '../../core/router.js';
import { toast } from '../../components/toast.js';
import { createGame } from './engine.js';
import { dailyScenario, dayKey } from './daily.js';

export async function startGame({ id, year, turns = 20, difficulty = 'dengeli', seed = null, mode = 'serbest', daily = null }) {
    await loadCore();
    const p = corridorAt(id, year, 0);
    if (!p) {
        toast('Bu yıl için koridor verisi yok; başka bir yıl seçin.');
        return null;
    }
    let gameData;
    try {
        gameData = await loadGameCountry(id);
    } catch (error) {
        toast(`Oyun verisi yüklenemedi: ${error.message}`, { type: 'error' });
        return null;
    }
    const game = createGame({
        id,
        name: countryName(id),
        start: { x: p.x, y: p.y },
        startYear: year,
        turns,
        difficulty,
        gameData,
        seed: seed ?? Math.floor(Math.random() * 1e9),
        mode,
        daily,
    });
    save('game.current', game);
    window.__atlasGame = game; // tarayıcı depolaması kapalıysa bellekte tut
    navigate('/oyun/oyna');
    return game;
}

export async function startDaily(key = dayKey()) {
    await loadCore();
    const sc = dailyScenario(key, db.lastYear);
    return startGame({ id: sc.id, year: sc.year, turns: sc.turns, difficulty: sc.difficulty, seed: sc.seed, mode: 'gunluk', daily: { key: sc.key, number: sc.number } });
}

/** Bitmiş bir oyunun aynı senaryosu, aynı tohumla (aynı meydan okuma) */
export function restartSame(s) {
    if (s.mode === 'gunluk' && s.daily) return startDaily(s.daily.key);
    return startGame({ id: s.id, year: s.startYear, turns: s.turns, difficulty: s.difficulty, seed: s.seed });
}
