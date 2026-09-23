/**
 * Özgürlük Dengesi — tekrar sayfası. Paylaşılan kod baştan oynatılır; puan
 * yeniden hesaplandığı için doğrulanmış olur. Oyun yıl yıl izlenebilir.
 */

import { icon } from '../../core/icons.js';
import { esc } from '../../core/dom.js';
import { db, loadCore, loadGameCountry, corridorAt, corridorYear, countryName, flagHTML } from '../../core/data.js';
import { TYPES, typeChip } from '../../core/theory.js';
import { signed } from '../../core/format.js';
import { CorridorChart } from '../../components/corridor-chart.js';
import { finalReport } from './engine.js';
import { decodeCode, replayGame, isOutdated } from './replay-code.js';
import { renderReport } from './report.js';
import { dayKey, dayNumber, keyFromNumber, dailyScenario } from './daily.js';
import { startGame, startDaily } from './start.js';

export async function mount(root, params) {
    await loadCore();
    let decoded;
    try {
        decoded = decodeCode(params.k);
    } catch (error) {
        return fail(root, error.message);
    }
    const start = corridorAt(decoded.id, decoded.startYear, 0);
    if (!db.countries[decoded.id] || !start) return fail(root, 'Koddaki ülke ya da yıl için veri yok.');
    let gameData;
    try {
        gameData = await loadGameCountry(decoded.id);
    } catch (error) {
        return fail(root, `Oyun verisi yüklenemedi: ${error.message}`);
    }
    const daily = findDaily(decoded);
    const { s, issues } = replayGame(decoded, { name: countryName(decoded.id), start: { x: start.x, y: start.y }, gameData, mode: daily ? 'gunluk' : 'tekrar', daily });
    const page = new ReplayPage(root, s, { decoded, issues, claimed: params.p ? Number(params.p) : null, daily });
    page.render();
    return page;
}

/** Kod bir günün senaryosuna aitse (aynı ülke, yıl ve tohum) o günü bulur */
function findDaily(decoded) {
    const today = dayNumber(dayKey());
    for (let n = today + 1; n >= Math.max(1, today - 400); n--) {
        const sc = dailyScenario(keyFromNumber(n), db.lastYear);
        if (sc.seed === decoded.seed && sc.id === decoded.id && sc.year === decoded.startYear) return { key: sc.key, number: sc.number };
    }
    return null;
}

function fail(root, message) {
    root.innerHTML = `<div class="container" style="padding-top:64px;max-width:640px">
        <div class="card card-pad stack" role="alert">
            <div class="row">${icon('warning')}<strong>Tekrar açılamadı</strong></div>
            <p class="muted small">${esc(message)}</p>
            <div><a class="btn btn-secondary btn-sm" href="#/oyun">${icon('chevronL', 'icon-sm')}Oyunlara dön</a></div>
        </div>
    </div>`;
    return { unmount() {} };
}

class ReplayPage {
    constructor(root, s, { decoded, issues, claimed, daily }) {
        this.root = root;
        this.s = s;
        this.decoded = decoded;
        this.issues = issues;
        this.claimed = claimed;
        this.daily = daily;
        this.step = s.history.length - 1;
        this.timer = null;
    }

    banner() {
        const r = finalReport(this.s);
        const items = [];
        if (this.issues.length) {
            items.push(`<div class="replay-banner bad">${icon('warning')}<div><strong>Bu kod kurallara uymayan hamleler içeriyor.</strong><span class="small muted"> Sonuç geçerli sayılmaz. (${esc(this.issues.slice(0, 2).join('; '))})</span></div></div>`);
        } else if (this.claimed !== null && Number.isFinite(this.claimed)) {
            items.push(
                this.claimed === r.score
                    ? `<div class="replay-banner good">${icon('check')}<div><strong>Doğrulandı.</strong><span class="small muted"> Paylaşılan ${this.claimed} puan, hamleler baştan oynatılarak yeniden elde edildi.</span></div></div>`
                    : `<div class="replay-banner bad">${icon('warning')}<div><strong>Puan uyuşmuyor.</strong><span class="small muted"> Paylaşılan puan ${this.claimed}, yeniden hesaplanan puan ${r.score}.</span></div></div>`,
            );
        } else {
            items.push(`<div class="replay-banner">${icon('check')}<div><strong>Tekrar.</strong><span class="small muted"> Bu sonuç, koddaki hamleler baştan oynatılarak hesaplandı.</span></div></div>`);
        }
        if (isOutdated(this.decoded)) items.push(`<div class="replay-banner bad">${icon('info')}<div><span class="small">Bu kod oyunun eski bir sürümüne ait; kurallar değiştiği için sonuç farklı çıkabilir.</span></div></div>`);
        return items.join('');
    }

    render() {
        const s = this.s;
        this.root.innerHTML = `
            <div class="container replay-head">
                <a class="gs-back small" href="#/oyun">${icon('chevronL', 'icon-sm')}Oyunlar</a>
                <section class="card card-pad replay-viewer" aria-labelledby="rv-title">
                    <div class="card-title"><span id="rv-title" class="row" style="gap:8px">${icon('play', 'icon-sm')}Yıl yıl izle</span><span class="hint row" style="gap:8px">${flagHTML(s.id)}${esc(countryName(s.id))} · ${s.startYear}–${s.year}</span></div>
                    <div class="rv-grid">
                        <div class="rv-chart" data-rv-chart></div>
                        <div class="stack" style="gap:10px;min-width:0">
                            <div class="row" style="gap:12px">
                                <button class="play-btn" type="button" data-rv-play aria-label="Oynat">${icon('play')}</button>
                                <input class="range grow" type="range" min="0" max="${s.history.length - 1}" value="${this.step}" data-rv-slider aria-label="Yıl">
                                <span class="serif rv-year" data-rv-year></span>
                            </div>
                            <div data-rv-state></div>
                            <ol class="gp-log rv-log" data-rv-log></ol>
                        </div>
                    </div>
                </section>
            </div>
            <div data-report></div>`;

        this.viewChart = new CorridorChart(this.root.querySelector('[data-rv-chart]'), { variant: 'mini', pointRadius: 2.2, baseOpacity: 0.24, interactive: false });
        const slider = this.root.querySelector('[data-rv-slider]');
        slider.addEventListener('input', () => {
            this.stop();
            this.show(Number(slider.value));
        });
        this.root.querySelector('[data-rv-play]').addEventListener('click', () => (this.timer ? this.stop() : this.play()));

        const againLabel = this.daily ? 'Günün senaryosunu oyna' : 'Aynı senaryoyu oyna';
        const out = renderReport(this.root.querySelector('[data-report]'), s, {
            banner: this.banner(),
            actions: [
                { label: againLabel, icon: 'play', primary: true, onClick: () => (this.daily ? startDaily(this.daily.key) : startGame({ id: s.id, year: s.startYear, turns: s.turns, difficulty: s.difficulty, seed: s.seed })) },
                { label: 'Oyunlara dön', icon: 'flag', href: '#/oyun' },
            ],
        });
        this.reportChart = out.chart;
        this.show(this.step);
    }

    show(i) {
        const s = this.s;
        this.step = i;
        const h = s.history[i];
        const worldYear = Math.min(h.year, db.lastYear);
        this.viewChart.setPoints([...corridorYear(worldYear).filter((p) => p.id !== s.id), { id: s.id, x: h.x, y: h.y, type: h.type, year: h.year }], { duration: 300 });
        this.viewChart.setEmphasis([s.id]);
        const trail = s.history.slice(0, i + 1).map((p) => ({ year: p.year, x: p.x, y: p.y, type: p.type }));
        this.viewChart.setTrails(trail.length > 1 ? [{ id: 'player', points: trail, colorDots: true }] : []);
        this.root.querySelector('[data-rv-slider]').value = i;
        this.root.querySelector('[data-rv-year]').textContent = h.year;
        const prev = i > 0 ? s.history[i - 1] : null;
        const real = s.hist.find((r) => r.year === h.year);
        this.root.querySelector('[data-rv-state]').innerHTML = `<div class="row" style="gap:6px;flex-wrap:wrap">
                ${typeChip(h.type, { small: true, label: TYPES[h.type].short })}
                ${prev ? `<span class="effect ${h.y - prev.y >= 0 ? 'up' : 'down'}">Devlet <b>${signed(h.y - prev.y)}</b></span><span class="effect ${h.x - prev.x >= 0 ? 'up' : 'down'}">Toplum <b>${signed(h.x - prev.x)}</b></span>` : '<span class="tiny faint">Başlangıç konumu</span>'}
                ${h.pts !== null && h.pts !== undefined ? `<span class="effect up">Puan <b>${Math.round(h.pts)}</b></span>` : ''}
                ${real ? `<span class="effect">Gerçekte <b>${Math.round(real.pts)}</b></span>` : ''}
            </div>`;
        // Kronikte yıl, olayın yaşandığı yıldır; konum ise yıl sonunu gösterir
        const yearOfActions = prev ? prev.year : null;
        const kinds = { policy: 'scale', event: 'bolt', crisis: 'warning', type: 'corridor', info: 'flag' };
        const entries = s.log.filter((l) => (yearOfActions === null ? l.kind === 'info' : l.year === yearOfActions)).reverse();
        this.root.querySelector('[data-rv-log]').innerHTML =
            entries.map((l) => `<li class="log-${l.kind}"><span class="mono tiny faint">${l.year}</span><span class="log-icon">${icon(kinds[l.kind] || 'info', 'icon-sm')}</span><span class="stack" style="gap:2px"><span class="small">${esc(l.title)}</span>${l.detail ? `<span class="tiny faint">${esc(l.detail)}</span>` : ''}</span></li>`).join('') ||
            `<li class="tiny faint">${yearOfActions} yılında politika seçilmedi.</li>`;
    }

    play() {
        if (this.step >= this.s.history.length - 1) this.step = 0;
        this.root.querySelector('[data-rv-play]').innerHTML = icon('pause');
        this.show(this.step);
        this.timer = setInterval(() => {
            if (this.step >= this.s.history.length - 1) return this.stop();
            this.show(this.step + 1);
        }, 900);
    }

    stop() {
        clearInterval(this.timer);
        this.timer = null;
        const b = this.root.querySelector('[data-rv-play]');
        if (b) b.innerHTML = icon('play');
    }

    unmount() {
        this.stop();
        this.viewChart?.destroy();
        this.reportChart?.destroy();
    }
}
