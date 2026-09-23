/**
 * Kızıl Kraliçe — düello sayfası: kurulum, oynanış ve sonuç
 *
 * Aynı cihazda iki kişi oynarken seçimler sırayla ve gizli yapılır: bir taraf
 * seçerken öteki ekrana bakmaz, hamleler birlikte açılır. Yapay zekâya karşı
 * oynarken yapay zekâ hamlesini tur başında, oyuncunun hamlesini görmeden seçer.
 */

import { icon } from '../../core/icons.js';
import { esc } from '../../core/dom.js';
import { db, loadCore, loadGameCountry, corridorAt, corridorYear, countryName, flagHTML } from '../../core/data.js';
import { TYPES, typeChip } from '../../core/theory.js';
import { signed, num, pct } from '../../core/format.js';
import { navigate } from '../../core/router.js';
import { load, save, setContext } from '../../core/store.js';
import { CorridorChart } from '../../components/corridor-chart.js';
import { toast } from '../../components/toast.js';
import { copyText, appURL } from '../../components/share.js';
import { rng } from '../../core/random.js';
import * as D from './engine.js';
import { chooseMove, AI_LEVELS } from './ai.js';
import { STANCES, CARDS, EVENT_BY_ID, CENTERS, CENTER_INFO, controller } from './cards.js';
import { DUEL_SCENARIOS } from './scenarios.js';

const SIDE = {
    state: { label: 'Devlet', icon: 'flag', res: 'Hazine', gen: 'Devlet’in' },
    society: { label: 'Toplum', icon: 'people', res: 'Seferberlik', gen: 'Toplum’un' },
};
const other = (side) => (side === 'state' ? 'society' : 'state');
const ROUNDS = [8, 12, 16];

export async function mount(root, params) {
    await loadCore();
    const page = new DuelPage(root, params);
    await page.init();
    return page;
}

function stanceArrows(v) {
    const a = Math.abs(v);
    if (a < 0.02) return '·';
    const n = a >= 0.12 ? 3 : a >= 0.06 ? 2 : 1;
    return (v > 0 ? '▲' : '▼').repeat(n);
}

/** Denge değişimi: kimin lehine, ne kadar */
function balanceChip(dB) {
    if (Math.abs(dB) < 0.015) return '<span class="effect">Denge <b>≈</b></span>';
    const side = dB > 0 ? 'state' : 'society';
    return `<span class="effect side-${side}">${SIDE[side].label} lehine <b>${stanceArrows(Math.abs(dB))}</b></span>`;
}

class DuelPage {
    constructor(root, params) {
        this.root = root;
        this.params = params;
        this.g = null;
        this.chart = null;
        this.config = { opponent: 'ai', human: 'society', level: 'orta', scenario: 0, rounds: 12 };
        this.phase = null;
        this.pick = { stance: null, card: null };
    }

    async init() {
        this.root.classList.add('duel-page');
        const saved = load('duel.current');
        const valid = saved && saved.v === D.DUEL_VERSION;
        if (valid && this.params.devam) {
            this.g = saved;
            this.config = { ...this.config, ...(saved.config || {}) };
            if (saved.status === 'over') this.renderReport();
            else this.startPlay();
            return;
        }
        const last = load('duel.config');
        if (last) this.config = { ...this.config, ...last };
        this.renderSetup(valid && saved.status === 'playing' ? saved : null);
    }

    persist() {
        save('duel.current', this.g);
    }

    // ================================================================ kurulum
    renderSetup(resume) {
        this.destroyChart();
        const c = this.config;
        this.root.innerHTML = `
            <div class="container duel-setup">
                <section class="stack" style="gap:22px;min-width:0">
                    <div class="stack" style="gap:12px">
                        <a class="gs-back small" href="#/oyun">${icon('chevronL', 'icon-sm')}Oyunlar</a>
                        <span class="eyebrow">İki oyunculu düello</span>
                        <h1 class="display-2">Kızıl Kraliçe</h1>
                        <p class="lede" style="max-width:640px">Devlet ile toplum arasındaki yarış. Biriniz Devlet’i, biriniz Toplum’u yönetir. Her tur ikiniz de gizlice bir duruş seçersiniz; hamleler birlikte açılır ve ülkenin koridordaki yerini değiştirir. Dengeyi kendi lehinize çevirin ama ülkeyi koridordan düşürmeyin: refah en çok koridorda birikir.</p>
                    </div>
                    ${
                        resume
                            ? `<div class="card gs-resume"><span class="faint">${icon('history')}</span><div class="grow"><div style="font-weight:600">Yarım kalan düello</div><div class="small muted">${esc(countryName(resume.id))} ${resume.startYear} · Tur ${resume.round + 1} / ${resume.rounds}</div></div><a class="btn btn-secondary btn-sm" href="#/oyun/kizil-kralice?devam=1">Devam et${icon('arrowR', 'icon-sm')}</a></div>`
                            : ''
                    }
                    <div class="gs-step">
                        <div class="gs-label"><span class="gs-num mono">1</span>Rakip</div>
                        <div class="segmented" role="group" aria-label="Rakip" data-seg="opponent">
                            <button type="button" data-v="ai" aria-pressed="${c.opponent === 'ai'}">${icon('cpu', 'icon-sm')} Yapay zekâya karşı</button>
                            <button type="button" data-v="hotseat" aria-pressed="${c.opponent === 'hotseat'}">${icon('people', 'icon-sm')} Aynı cihazda iki kişi</button>
                        </div>
                        <div class="duel-ai-opts" ${c.opponent === 'ai' ? '' : 'hidden'} data-ai-opts>
                            <div class="segmented compact" role="group" aria-label="Tarafınız" data-seg="human">
                                <button type="button" data-v="state" aria-pressed="${c.human === 'state'}">Devlet’i ben yöneteyim</button>
                                <button type="button" data-v="society" aria-pressed="${c.human === 'society'}">Toplum’u ben yöneteyim</button>
                            </div>
                            <div class="segmented compact" role="group" aria-label="Yapay zekâ seviyesi" data-seg="level">
                                ${Object.entries(AI_LEVELS)
                                    .map(([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${c.level === k}" title="${esc(l.desc)}">${l.label}</button>`)
                                    .join('')}
                            </div>
                        </div>
                    </div>
                    <div class="gs-step">
                        <div class="gs-label"><span class="gs-num mono">2</span>Senaryo <span class="grow"></span><span class="tiny faint">denge: yapay zekâ maçlarında kazanma oranı</span></div>
                        <div class="duel-scenarios" role="listbox" aria-label="Senaryolar" data-scenarios>
                            ${DUEL_SCENARIOS.map((sc, i) => this.scenarioCard(sc, i)).join('')}
                        </div>
                    </div>
                    <div class="gs-step">
                        <div class="gs-label"><span class="gs-num mono">3</span>Süre</div>
                        <div class="segmented" role="group" aria-label="Süre" data-seg="rounds">
                            ${ROUNDS.map((r) => `<button type="button" data-v="${r}" aria-pressed="${c.rounds === r}">${r} tur · ${r * D.YEARS_PER_ROUND} yıl</button>`).join('')}
                        </div>
                    </div>
                </section>
                <aside class="card duel-rules" aria-label="Kurallar">
                    <span class="eyebrow">Nasıl oynanır?</span>
                    <ol class="duel-rule-list small muted">
                        <li><strong>Gizli ve eşzamanlı hamle.</strong> Her tur iki taraf da bir duruş seçer, isterse bir özel kart ekler. Hamleler birlikte açılır.</li>
                        <li><strong>Sonucu ikisinin birleşimi belirler.</strong> Aşağıdaki tablo, iki tarafın temel etkisini gösterir.</li>
                        <li><strong>Puan: refah × pay.</strong> Ülke koridordaysa o turun refahı büyüktür. Refahın ne kadarını kimin alacağını denge belirler: başlangıca göre devlet toplumdan daha çok güçlendiyse Devlet, toplum daha çok güçlendiyse Toplum daha büyük pay alır.</li>
                        <li><strong>Güç odakları.</strong> Ordu, ekonomik elit, sivil toplum, dinî kurumlar ve uluslararası toplum iki taraf arasında gidip gelir; bir tarafa iki adım yaklaşan odak o tarafın kontrolüne geçer ve ona avantaj sağlar.</li>
                        <li><strong>Meşruiyet.</strong> Baskı devletin meşruiyetini aşındırır; meşruiyet biterse kitlesel ayaklanma rejimi sarsar.</li>
                    </ol>
                    ${matrixTable()}
                    <button class="btn btn-primary btn-lg btn-block" type="button" data-start>${icon('crown')}Düelloyu başlat</button>
                </aside>
            </div>`;

        this.root.querySelectorAll('[data-seg]').forEach((el) => {
            el.addEventListener('click', (e) => {
                const b = e.target.closest('[data-v]');
                if (!b) return;
                const key = el.dataset.seg;
                this.config[key] = key === 'rounds' ? Number(b.dataset.v) : b.dataset.v;
                el.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
                if (key === 'opponent') this.root.querySelector('[data-ai-opts]').hidden = this.config.opponent !== 'ai';
            });
        });
        this.root.querySelector('[data-scenarios]').addEventListener('click', (e) => {
            const b = e.target.closest('[data-sc]');
            if (!b) return;
            this.config.scenario = Number(b.dataset.sc);
            this.root.querySelectorAll('[data-sc]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
        });
        this.root.querySelector('[data-start]').addEventListener('click', () => this.newDuel());
    }

    scenarioCard(sc, i) {
        const p = corridorAt(sc.id, sc.year, 0);
        const sel = i === this.config.scenario;
        const bal = sc.balance;
        return `<button type="button" role="option" class="duel-sc" data-sc="${i}" aria-selected="${sel}">
            <span class="row" style="gap:10px">${flagHTML(sc.id)}<span class="grow duel-sc-name">${esc(countryName(sc.id))} <span class="mono faint">${sc.year}</span></span>${p ? typeChip(p.type, { small: true, label: TYPES[p.type].short }) : ''}</span>
            <span class="tiny muted">${esc(sc.note)}</span>
            ${bal ? `<span class="duel-bal" title="Yapay zekâ maçlarında kazanma oranı"><span class="side-state" style="width:${bal.state * 100}%"></span><span class="duel-bal-draw" style="width:${(1 - bal.state - bal.society) * 100}%"></span><span class="side-society" style="width:${bal.society * 100}%"></span></span><span class="row tiny faint" style="justify-content:space-between"><span>Devlet ${pct(bal.state)}</span><span>Toplum ${pct(bal.society)}</span></span>` : ''}
        </button>`;
    }

    async newDuel() {
        const c = this.config;
        save('duel.config', c);
        const sc = DUEL_SCENARIOS[c.scenario] || DUEL_SCENARIOS[0];
        const p = corridorAt(sc.id, sc.year, 0);
        let gameData = null;
        try {
            gameData = await loadGameCountry(sc.id);
        } catch (error) {
            toast(`Veri yüklenemedi: ${error.message}`, { type: 'error' });
            return;
        }
        this.g = D.createDuel({
            id: sc.id,
            name: countryName(sc.id),
            startYear: sc.year,
            start: { x: p.x, y: p.y },
            rounds: c.rounds,
            seed: Math.floor(Math.random() * 1e9),
            mode: c.opponent,
            human: c.opponent === 'ai' ? c.human : null,
            aiLevel: c.level,
            gameData,
        });
        this.g.config = { ...c };
        this.persist();
        this.startPlay();
    }

    // ================================================================ oynanış
    startPlay() {
        const g = this.g;
        setContext({ country: g.id, year: Math.min(g.year, db.lastYear) });
        this.renderBoard();
        this.beginTurn();
    }

    /** Tur başı: yapay zekâ hamlesini oyuncuyu görmeden seçer */
    beginTurn() {
        const g = this.g;
        this.pick = { stance: null, card: null };
        if (g.status !== 'playing') return this.renderReport();
        if (g.mode === 'ai') {
            const aiSide = other(g.human);
            if (!g.pending[aiSide]) {
                const move = chooseMove(g, aiSide, g.aiLevel, rng(g.seed + g.round * 131 + 7), { history: g.moves[g.human] });
                D.submit(g, aiSide, move);
                this.persist();
            }
            this.phase = g.pending[g.human] ? 'reveal' : 'pick';
            this.activeSide = g.human;
        } else if (!g.pending.state) {
            this.phase = 'cover';
            this.activeSide = 'state';
        } else if (!g.pending.society) {
            this.phase = 'cover';
            this.activeSide = 'society';
        } else this.phase = 'reveal';
        if (this.phase === 'reveal') return this.reveal();
        this.renderStatus();
        this.renderAction();
    }

    renderBoard() {
        const g = this.g;
        this.destroyChart();
        this.root.innerHTML = `
            <header class="gp-bar duel-bar">
                <a class="gp-exit" href="#/oyun/kizil-kralice">${icon('chevronL', 'icon-sm')}Çık</a>
                <span class="gp-sep"></span>
                <div class="row gp-title">${flagHTML(g.id)}<span class="serif">${esc(countryName(g.id))}</span><span class="serif faint" data-year></span></div>
                <div class="row gp-turn"><span class="tiny faint">Tur</span><span class="mono small" data-round></span></div>
                <span class="grow"></span>
                <div class="duel-score" aria-label="Puan durumu">
                    <span class="duel-score-side side-state"><span class="tiny">${icon('flag', 'icon-sm')}Devlet${g.mode === 'ai' ? (g.human === 'state' ? ' · siz' : ' · YZ') : ''}</span><span class="mono" data-score-state></span></span>
                    <span class="duel-tug" aria-hidden="true"><span class="side-state" data-tug-state></span><span class="side-society" data-tug-society></span></span>
                    <span class="duel-score-side side-society right"><span class="tiny">Toplum${g.mode === 'ai' ? (g.human === 'society' ? ' · siz' : ' · YZ') : ''}${icon('people', 'icon-sm')}</span><span class="mono" data-score-society></span></span>
                </div>
            </header>
            <div class="duel-grid">
                <aside class="duel-left stack" style="gap:14px">
                    <section class="card card-pad stack" style="gap:12px" aria-labelledby="dl-pos">
                        <div class="card-title"><span id="dl-pos">Ülke</span><span data-type></span></div>
                        <div class="gp-chart" data-chart></div>
                        <div class="stack" style="gap:6px">
                            <div class="row" style="justify-content:space-between"><span class="tiny faint">Denge (başlangıca göre)</span><span class="mono tiny" data-balance-val></span></div>
                            <div class="duel-balance" aria-hidden="true"><span class="duel-balance-mid"></span><span class="duel-balance-dot" data-balance-dot></span></div>
                            <div class="row tiny faint" style="justify-content:space-between"><span class="side-society-text">Toplum lehine</span><span class="side-state-text">Devlet lehine</span></div>
                        </div>
                        <div class="row" style="justify-content:space-between"><span class="tiny faint">Refah (şu anki bölgede)</span><span class="mono small" data-r></span></div>
                        <div class="row" style="justify-content:space-between"><span class="tiny faint">Refahtan pay</span><span class="mono tiny" data-share></span></div>
                    </section>
                    <details class="card card-pad duel-help">
                        <summary class="card-title"><span>Sonuç tablosu</span><span class="hint">şu anki konumda</span></summary>
                        <div data-grid></div>
                    </details>
                </aside>
                <main class="duel-center stack" style="gap:14px">
                    <div data-event></div>
                    <div data-action></div>
                </main>
                <aside class="duel-right stack" style="gap:14px">
                    <section class="card card-pad stack" style="gap:10px" aria-labelledby="dr-res">
                        <div class="card-title"><span id="dr-res">Kaynaklar</span><span class="hint">herkes görür</span></div>
                        <div class="duel-res" data-res></div>
                        <div class="stack" style="gap:4px">
                            <div class="row" style="justify-content:space-between"><span class="tiny faint">Devlet’in meşruiyeti</span><span class="mono tiny" data-legit-val></span></div>
                            <span class="meter" style="--m:var(--side-state)"><span data-legit></span></span>
                        </div>
                    </section>
                    <section class="card card-pad stack" style="gap:10px" aria-labelledby="dr-cen">
                        <div class="card-title"><span id="dr-cen">Güç odakları</span><span class="hint">±2 = kontrol</span></div>
                        <div class="stack" style="gap:9px" data-centers></div>
                    </section>
                    <section class="card card-pad stack" style="gap:6px" aria-labelledby="dr-log">
                        <div class="card-title"><span id="dr-log" class="row" style="gap:8px">${icon('news')}Turlar</span></div>
                        <ol class="gp-log duel-log" data-log></ol>
                    </section>
                </aside>
            </div>`;
        this.chart = new CorridorChart(this.root.querySelector('[data-chart]'), { variant: 'mini', pointRadius: 2.2, baseOpacity: 0.24, interactive: false });
        this.root.querySelector('[data-action]').addEventListener('click', (e) => this.onAction(e));
    }

    /** eventOf: açılış sırasında çözülen turun olayını göstermek için */
    renderStatus(eventOf = null) {
        const g = this.g;
        this.root.querySelector('[data-year]').textContent = g.status === 'playing' ? `${g.year}–${g.year + D.YEARS_PER_ROUND - 1}` : `${g.startYear}–${g.year}`;
        this.root.querySelector('[data-round]').textContent = `${Math.min(g.round + 1, g.rounds)} / ${g.rounds}`;
        const total = g.score.state + g.score.society || 1;
        this.root.querySelector('[data-score-state]').textContent = num(g.score.state, 1);
        this.root.querySelector('[data-score-society]').textContent = num(g.score.society, 1);
        this.root.querySelector('[data-tug-state]').style.width = `${(g.score.state / total) * 100}%`;
        this.root.querySelector('[data-tug-society]').style.width = `${(g.score.society / total) * 100}%`;

        // Konum
        const worldYear = Math.min(g.startYear, db.lastYear);
        const me = { id: g.id, x: g.x, y: g.y, type: g.type, year: g.year };
        this.chart.setPoints([...corridorYear(worldYear).filter((p) => p.id !== g.id), me], { duration: 450 });
        this.chart.setEmphasis([g.id]);
        const trail = g.history.map((h) => ({ year: h.year, x: h.x, y: h.y, type: h.type }));
        trail[trail.length - 1] = me;
        this.chart.setTrails(trail.length > 1 ? [{ id: 'duel', points: trail, colorDots: true }] : []);
        this.root.querySelector('[data-type]').innerHTML = typeChip(g.type, { small: true, label: TYPES[g.type].short });
        const bal = D.balance(g);
        this.root.querySelector('[data-balance-val]').textContent = `${bal > 0.005 ? 'Devlet' : bal < -0.005 ? 'Toplum' : ''} ${signed(bal)}`.trim();
        this.root.querySelector('[data-balance-dot]').style.left = `${50 + Math.max(-48, Math.min(48, bal * 60))}%`;
        this.root.querySelector('[data-balance-dot]').className = `duel-balance-dot ${bal > 0.005 ? 'side-state' : bal < -0.005 ? 'side-society' : ''}`;
        const R = D.regionR(g.type, corridorProgressOf(g));
        this.root.querySelector('[data-r]').textContent = `${num(R, 1)}${g.type === 'Shackled' ? ' · koridorda' : ''}`;
        this.root.querySelector('[data-share]').innerHTML = `<span class="side-state-text">Devlet ${pct(D.stateShare(bal))}</span> · <span class="side-society-text">Toplum ${pct(1 - D.stateShare(bal))}</span>`;

        // Kaynaklar ve meşruiyet
        this.root.querySelector('[data-res]').innerHTML = ['state', 'society']
            .map(
                (side) => `<div class="duel-res-row side-${side}"><span class="row" style="gap:6px">${icon(side === 'state' ? 'coins' : 'people', 'icon-sm')}<span class="small">${SIDE[side].res}</span></span>
                <span class="duel-pips" aria-label="${g.res[side]} / ${D.RES_CAP}">${Array.from({ length: D.RES_CAP }, (_, i) => `<span class="${i < g.res[side] ? 'on' : ''}"></span>`).join('')}</span>
                <span class="mono small">${g.res[side]}</span><span class="tiny faint" title="Eldeki kart sayısı">${g.hands[side].length} kart</span></div>`,
            )
            .join('');
        this.root.querySelector('[data-legit-val]').textContent = `${num(g.legit, 1)} / 10`;
        this.root.querySelector('[data-legit]').style.width = `${g.legit * 10}%`;

        // Güç odakları
        this.root.querySelector('[data-centers]').innerHTML = CENTERS.map((k) => {
            const lean = g.centers[k];
            const ctl = controller(lean);
            const info = CENTER_INFO[k];
            const tip = `Devlet kontrolünde: ${info.state}. Toplum kontrolünde: ${info.society}.`;
            return `<div class="duel-center-row" title="${esc(tip)}">
                <span class="stake-icon">${icon(info.icon, 'icon-sm')}</span>
                <span class="duel-center-name small">${info.label}</span>
                <span class="duel-lean" aria-label="${info.label}: ${lean > 0 ? `devlete ${lean}` : lean < 0 ? `topluma ${-lean}` : 'tarafsız'}">${[-3, -2, -1, 0, 1, 2, 3]
                    .map((v) => `<span class="${v === Math.round(lean) ? `on ${lean > 0 ? 'side-state' : lean < 0 ? 'side-society' : ''}` : ''} ${Math.abs(v) >= 2 ? 'ctl' : ''} ${v === 0 ? 'mid' : ''}"></span>`)
                    .join('')}</span>
                <span class="tiny duel-ctl ${ctl ? `side-${ctl}-text` : 'faint'}">${ctl ? SIDE[ctl].label : '—'}</span>
            </div>`;
        }).join('');

        // Sonuç tablosu
        const grid = D.outcomeGrid(g);
        this.root.querySelector('[data-grid]').innerHTML = `<table class="duel-grid-table">
            <thead><tr><th></th>${D.stancesFor('society')
                .map((t) => `<th class="side-society-text">${STANCES[t].label}</th>`)
                .join('')}</tr></thead>
            <tbody>${D.stancesFor('state')
                .map(
                    (s) => `<tr><th class="side-state-text">${STANCES[s].label}</th>${D.stancesFor('society')
                        .map((t) => {
                            const o = grid[s][t];
                            const dB = o.dy - o.dx;
                            return `<td class="${Math.abs(dB) < 0.015 ? '' : dB > 0 ? 'side-state-bg' : 'side-society-bg'}"><span class="mono tiny">D ${stanceArrows(o.dy)}</span><span class="mono tiny">T ${stanceArrows(o.dx)}</span></td>`;
                        })
                        .join('')}</tr>`,
                )
                .join('')}</tbody></table>
            <p class="tiny faint" style="margin-top:8px">D: devletin gücü, T: toplumun gücü. Mavi hücre dengeyi Devlet’e, pembe hücre Toplum’a kaydırır. Kartlar ve olaylar hariç.</p>`;

        // Olay: seçim sırasında bu turun, açılışta az önce çözülen turun olayı
        const ev = EVENT_BY_ID[eventOf ? eventOf.event : g.event];
        const from = eventOf ? eventOf.yearFrom : g.year;
        this.root.querySelector('[data-event]').innerHTML =
            (g.status === 'playing' || eventOf) && ev
                ? `<section class="gp-event duel-event" aria-live="polite"><div class="row" style="gap:8px">${icon('bolt')}<span class="eyebrow">Dönem olayı · ${from}–${from + D.YEARS_PER_ROUND - 1}</span></div><h2 class="title-2">${esc(ev.title)}</h2><p class="small muted">${esc(ev.text)}</p></section>`
                : '';

        // Tur kaydı
        this.root.querySelector('[data-log]').innerHTML =
            g.log
                .slice(0, 12)
                .map((l) => {
                    const dB = l.dy - l.dx;
                    return `<li><span class="mono tiny faint">${l.round}</span><span class="stack" style="gap:2px"><span class="small"><span class="side-state-text">${STANCES[l.moves.state.stance].label}</span> · <span class="side-society-text">${STANCES[l.moves.society.stance].label}</span></span><span class="tiny faint">${Math.abs(dB) < 0.015 ? 'denge korundu' : `${dB > 0 ? 'Devlet' : 'Toplum'} lehine ${num(Math.abs(dB))}`} · refah ${num(l.R, 1)}</span></span></li>`;
                })
                .join('') || '<li class="tiny faint gp-log-empty">Henüz tur oynanmadı.</li>';
    }

    renderAction() {
        const g = this.g;
        const el = this.root.querySelector('[data-action]');
        const side = this.activeSide;
        if (this.phase === 'cover') {
            el.innerHTML = `<section class="card duel-cover side-${side}-border">
                <span class="duel-cover-icon side-${side}-text">${icon('eyeOff')}</span>
                <span class="eyebrow">Tur ${g.round + 1} · gizli seçim</span>
                <h2 class="display-2">${SIDE[side].gen} sırası</h2>
                <p class="muted">${SIDE[other(side)].label} oyuncusu ekrana bakmasın. ${side === 'society' ? 'Devlet hamlesini seçti ve gizledi.' : 'Önce Devlet seçer, sonra Toplum; hamleler birlikte açılır.'}</p>
                <button class="btn btn-primary btn-lg" type="button" data-act="show">${icon('eye')}Hazırım, göster</button>
            </section>`;
            return;
        }
        if (this.phase !== 'pick') return;
        const stances = D.legalStances(g, side);
        const pick = this.pick;
        const cards = D.legalCards(g, side, pick.stance || D.stancesFor(side)[0]);
        const grid = pick.stance ? D.outcomeGrid(g) : null;
        const spend = (pick.stance ? D.stanceCost(pick.stance) : 0) + (pick.card ? CARDS[pick.card].cost : 0);
        const hotseat = g.mode === 'hotseat';
        el.innerHTML = `<section class="card duel-picker side-${side}-border" aria-label="${SIDE[side].label} hamlesi">
            <div class="row duel-picker-head"><span class="duel-side-badge side-${side}">${icon(SIDE[side].icon, 'icon-sm')}${SIDE[side].label}</span><span class="grow small muted">Duruşunuzu seçin; isterseniz bir kart ekleyin.</span><span class="small">${SIDE[side].res}: <span class="mono">${g.res[side]}</span></span></div>
            <div class="duel-stances">${stances
                .map((st) => {
                    const s = STANCES[st.id];
                    const sel = pick.stance === st.id;
                    return `<button type="button" class="duel-stance${sel ? ' selected' : ''}" data-stance="${st.id}" aria-pressed="${sel}" ${st.ok ? '' : 'disabled'}>
                        <span class="row" style="justify-content:space-between"><span class="duel-stance-icon side-${side}-text">${icon(s.icon)}</span><span class="pc-cost mono">${icon('coins', 'icon-sm')}${s.cost}</span></span>
                        <span class="pc-title">${s.label}</span>
                        <span class="pc-desc">${esc(s.desc)}</span>
                        ${
                            sel && grid
                                ? `<span class="duel-if tiny">${D.stancesFor(other(side))
                                      .map((t) => {
                                          const o = side === 'state' ? grid[st.id][t] : grid[t][st.id];
                                          return `<span>${STANCES[t].label} gelirse: ${balanceChip(o.dy - o.dx)}</span>`;
                                      })
                                      .join('')}</span>`
                                : ''
                        }
                    </button>`;
                })
                .join('')}</div>
            <div class="duel-hand-head row"><span class="small" style="font-weight:600">Eldeki kartlar</span><span class="tiny faint">isteğe bağlı · her kart belirli duruşlarla oynanır</span></div>
            <div class="duel-hand">${cards
                .map((c) => {
                    const card = CARDS[c.id];
                    const sel = pick.card === c.id;
                    const usable = pick.stance ? c.ok : false;
                    const withLabel = card.with.includes('any') ? 'her duruşla' : card.with.map((w) => STANCES[w].label).join(' ya da ');
                    return `<button type="button" class="duel-card${sel ? ' selected' : ''}" data-card="${c.id}" aria-pressed="${sel}" ${usable || sel ? '' : 'aria-disabled="true"'}>
                        <span class="row" style="justify-content:space-between"><span class="pc-cat">${withLabel}</span><span class="pc-cost mono">${icon('coins', 'icon-sm')}${card.cost}</span></span>
                        <span class="duel-card-title">${esc(card.title)}</span>
                        <span class="pc-desc">${esc(card.desc)}</span>
                    </button>`;
                })
                .join('')}</div>
            <div class="gp-actions">
                <span class="small muted grow">${pick.stance ? `${STANCES[pick.stance].label}${pick.card ? ` + ${esc(CARDS[pick.card].title)}` : ''} · ${spend} ${SIDE[side].res.toLocaleLowerCase('tr-TR')}` : 'Bir duruş seçin'}</span>
                <button class="btn btn-primary" type="button" data-act="lock" ${pick.stance ? '' : 'disabled'}>${hotseat ? `${icon('eyeOff')}Gizle ve ${side === 'state' ? 'Toplum’a devret' : 'hamleleri aç'}` : `${icon('bolt')}Hamleleri aç`}</button>
            </div>
        </section>`;
    }

    onAction(e) {
        const g = this.g;
        const stance = e.target.closest('[data-stance]');
        const card = e.target.closest('[data-card]');
        const act = e.target.closest('[data-act]');
        if (stance && !stance.disabled) {
            this.pick.stance = stance.dataset.stance;
            if (this.pick.card && D.validMove(g, this.activeSide, this.pick)) this.pick.card = null;
            this.renderAction();
            return;
        }
        if (card) {
            if (!this.pick.stance) {
                toast('Önce bir duruş seçin.');
                return;
            }
            const id = card.dataset.card;
            if (this.pick.card === id) this.pick.card = null;
            else {
                const reason = D.validMove(g, this.activeSide, { stance: this.pick.stance, card: id });
                if (reason) {
                    toast(reason);
                    return;
                }
                this.pick.card = id;
            }
            this.renderAction();
            return;
        }
        if (!act) return;
        const a = act.dataset.act;
        if (a === 'show') {
            this.phase = 'pick';
            this.pick = { stance: null, card: null };
            this.renderAction();
        } else if (a === 'lock') {
            const res = D.submit(g, this.activeSide, this.pick);
            if (!res.ok) {
                toast(res.reason);
                return;
            }
            this.persist();
            this.beginTurn();
        } else if (a === 'next') {
            if (g.status !== 'playing') this.renderReport();
            else this.beginTurn();
        }
    }

    /** İki hamle de hazır: aç, çöz, göster */
    reveal() {
        const g = this.g;
        const report = D.resolve(g);
        this.persist();
        this.renderStatus(report);
        const el = this.root.querySelector('[data-action]');
        const dB = report.dy - report.dx;
        const shiftText = Object.entries(report.shift)
            .filter(([, v]) => Math.abs(v) >= 0.5)
            .map(([k, v]) => `${CENTER_INFO[k].label} ${v > 0 ? 'devlete' : 'topluma'} yaklaştı`)
            .join(' · ');
        const move = (side) => {
            const m = report.moves[side];
            return `<div class="duel-reveal-move side-${side}-border">
                <span class="duel-side-badge side-${side}">${icon(SIDE[side].icon, 'icon-sm')}${SIDE[side].label}</span>
                <span class="duel-reveal-stance"><span class="side-${side}-text">${icon(STANCES[m.stance].icon)}</span>${STANCES[m.stance].label}</span>
                <span class="small muted">${m.card ? `+ ${esc(CARDS[m.card].title)}` : 'kart yok'}</span>
            </div>`;
        };
        const notes = [...report.notes];
        if (report.gamble) notes.unshift(report.gamble.won ? 'Olağanüstü hal kumarı tuttu: ordu direnişi dağıttı.' : 'Olağanüstü hal kumarı tutmadı: ordu halka ateş açmayı reddetti.');
        if (report.typeChange) notes.push(`Ülke ${TYPES[report.typeChange.to].short} bölgeye geçti.`);
        el.innerHTML = `<section class="card duel-reveal" aria-live="polite">
            <span class="eyebrow">Tur ${report.round} · ${report.yearFrom}–${report.year - 1}</span>
            <div class="duel-reveal-moves">${move('state')}<span class="duel-vs serif">karşı</span>${move('society')}</div>
            <p class="duel-reveal-text serif">${esc(report.text)}</p>
            <div class="row" style="gap:6px;flex-wrap:wrap">
                <span class="effect ${report.dy >= 0 ? 'up' : 'down'}">Devletin gücü <b>${signed(report.dy)}</b></span>
                <span class="effect ${report.dx >= 0 ? 'up' : 'down'}">Toplumun gücü <b>${signed(report.dx)}</b></span>
                ${balanceChip(dB)}
                ${Math.abs(report.legit) >= 0.5 ? `<span class="effect ${report.legit > 0 ? 'up' : 'down'}">Meşruiyet <b>${report.legit > 0 ? '+' : '−'}${num(Math.abs(report.legit), 1)}</b></span>` : ''}
                ${report.redQueen ? '<span class="effect up">Kızıl Kraliçe koşusu</span>' : ''}
            </div>
            ${shiftText ? `<p class="tiny muted">${esc(shiftText)}</p>` : ''}
            ${notes.length ? `<ul class="gp-notes">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
            <div class="duel-reveal-score">
                <span class="small">Bu tur refah <b class="mono">${num(report.R, 1)}</b> ${report.R >= 3 ? '(koridorda)' : '(koridor dışında)'}</span>
                <span class="small side-state-text">Devlet +${num(report.gain.state, 1)}</span>
                <span class="small side-society-text">Toplum +${num(report.gain.society, 1)}</span>
            </div>
            <div class="gp-actions"><span class="grow"></span><button class="btn btn-primary" type="button" data-act="next">${g.status === 'playing' ? `Sonraki tur${icon('arrowR')}` : `Sonucu gör${icon('arrowR')}`}</button></div>
        </section>`;
        this.phase = 'reveal';
    }

    // ================================================================ sonuç
    renderReport() {
        const g = this.g;
        const res = D.duelResult(g);
        save('duel.last', { id: g.id, year: g.startYear, winner: res.winner, score: res.score });
        this.destroyChart();
        const winnerText = {
            state: 'Devlet kazandı',
            society: 'Toplum kazandı',
            draw: 'Berabere',
            none: 'Devlet çöktü: iki taraf da kaybetti',
        }[res.winner];
        const youText = g.mode === 'ai' && ['state', 'society'].includes(res.winner) ? (res.winner === g.human ? 'Tebrikler, yapay zekâyı yendiniz.' : 'Yapay zekâ bu kez kazandı.') : '';
        const ideal = idealRun(g);
        const lesson =
            ideal !== null
                ? `İki taraf her tur birlikte koşsaydı (İnşa ve Örgütlen) toplam refah yaklaşık ${num(ideal, 1)} olurdu; siz ${num(res.prosperity, 1)} ürettiniz. ${res.prosperity >= ideal * 0.95 ? 'Rekabetiniz ülkeyi büyüttü: Kızıl Kraliçe böyle işler.' : 'Aradaki fark, çatışmanın ülkeye bedeli.'}`
                : '';
        const text = [
            `ATLAS İnteraktif · Kızıl Kraliçe`,
            `${countryName(g.id)} ${g.startYear}–${g.year} · ${g.round} tur${g.mode === 'ai' ? ` · yapay zekâ (${AI_LEVELS[g.aiLevel].label})` : ''}`,
            `${winnerText} · Devlet ${num(res.score.state, 1)} – Toplum ${num(res.score.society, 1)}`,
            `Refah ${num(res.prosperity, 1)} · koridorda ${res.corridorRounds}/${res.rounds} tur`,
            appURL('#/oyun/kizil-kralice'),
        ].join('\n');
        const usage = (side) =>
            D.stancesFor(side)
                .map((s) => `<div class="duel-usage-row"><span class="small">${STANCES[s].label}</span><span class="meter grow" style="--m:var(--side-${side})"><span style="width:${res.stances[side][s] * 100}%"></span></span><span class="mono tiny">${pct(res.stances[side][s])}</span></div>`)
                .join('');
        this.root.innerHTML = `
            <div class="container gp-report duel-report">
                <section class="card report-hero">
                    <div class="duel-crown ${res.winner === 'state' || res.winner === 'society' ? `side-${res.winner}-text` : 'faint'}">${icon('crown')}</div>
                    <div class="stack grow" style="gap:8px">
                        <span class="eyebrow">Kızıl Kraliçe · ${esc(countryName(g.id))} · ${g.startYear}–${g.year}</span>
                        <h1 class="display-2">${winnerText}</h1>
                        <p class="lede" style="max-width:640px">${esc(youText)} ${esc(lesson)}</p>
                    </div>
                    <div class="duel-final">
                        <span class="side-state-text"><span class="tiny">Devlet</span><span class="serif">${num(res.score.state, 1)}</span></span>
                        <span class="side-society-text"><span class="tiny">Toplum</span><span class="serif">${num(res.score.society, 1)}</span></span>
                    </div>
                </section>
                <div class="report-stats">
                    ${stat('Toplam refah', num(res.prosperity, 1), `en fazla ~${res.maxProsperity}`)}
                    ${stat('Koridorda', `${res.corridorRounds} / ${res.rounds}`, 'tur')}
                    ${stat('Birlikte koşulan tur', `${res.redQueenRounds}`, 'İnşa + Örgütlen')}
                    ${stat('Son denge', `${signed(D.balance(g))}`, D.balance(g) >= 0 ? 'Devlet lehine' : 'Toplum lehine')}
                    ${stat('Başlangıç', TYPES[res.startType].short, g.startYear)}
                    ${stat('Bitiş', TYPES[res.endType].short, g.year)}
                </div>
                <div class="report-grid">
                    <section class="card card-pad stack" style="gap:10px">
                        <div class="card-title"><span>Ülkenin rotası</span><span class="hint">her nokta bir tur</span></div>
                        <div class="report-chart" data-report-chart></div>
                    </section>
                    <div class="stack" style="gap:16px;min-width:0">
                        <section class="card card-pad stack" style="gap:10px">
                            <div class="card-title"><span>Duruşlar</span></div>
                            <div class="duel-usage"><span class="duel-side-badge side-state">${icon('flag', 'icon-sm')}Devlet</span>${usage('state')}<span class="duel-side-badge side-society">${icon('people', 'icon-sm')}Toplum</span>${usage('society')}</div>
                        </section>
                        <section class="card card-pad stack report-share" style="gap:10px">
                            <div class="card-title"><span class="row" style="gap:8px">${icon('share', 'icon-sm')}Paylaş</span></div>
                            <pre class="share-text">${esc(text)}</pre>
                            <div><button class="btn btn-secondary btn-sm" type="button" data-copy>${icon('copy', 'icon-sm')}Sonucu kopyala</button></div>
                        </section>
                    </div>
                </div>
                <section class="card card-pad stack" style="gap:8px">
                    <div class="card-title"><span>Tur tur</span></div>
                    <div class="duel-table-wrap"><table class="duel-table">
                        <thead><tr><th>Tur</th><th>Dönem olayı</th><th>Devlet</th><th>Toplum</th><th>Denge</th><th>Refah</th><th>Puan</th></tr></thead>
                        <tbody>${[...g.log]
                            .reverse()
                            .map((l) => {
                                const dB = l.dy - l.dx;
                                return `<tr><td class="mono">${l.round}</td><td>${esc(EVENT_BY_ID[l.event]?.title || '')}</td><td class="side-state-text">${STANCES[l.moves.state.stance].label}${l.moves.state.card ? `<span class="tiny faint"> + ${esc(CARDS[l.moves.state.card].title)}</span>` : ''}</td><td class="side-society-text">${STANCES[l.moves.society.stance].label}${l.moves.society.card ? `<span class="tiny faint"> + ${esc(CARDS[l.moves.society.card].title)}</span>` : ''}</td><td class="mono">${Math.abs(dB) < 0.015 ? '≈' : `${dB > 0 ? 'D' : 'T'} ${num(Math.abs(dB))}`}</td><td class="mono">${num(l.R, 1)}</td><td class="mono"><span class="side-state-text">${num(l.gain.state, 1)}</span> · <span class="side-society-text">${num(l.gain.society, 1)}</span></td></tr>`;
                            })
                            .join('')}</tbody>
                    </table></div>
                </section>
                <div class="row report-actions">
                    <button class="btn btn-primary" type="button" data-rematch>${icon('rotate')}${g.mode === 'ai' ? 'Rövanş: taraf değiştir' : 'Rövanş: yerlerinizi değiştirin'}</button>
                    <button class="btn btn-secondary" type="button" data-setup>${icon('settings')}Yeni düello</button>
                    <a class="btn btn-ghost" href="#/oyun">${icon('flag')}Oyunlara dön</a>
                </div>
            </div>`;
        const chart = new CorridorChart(this.root.querySelector('[data-report-chart]'), { variant: 'mini', pointRadius: 2.2, baseOpacity: 0.22, interactive: false });
        this.chart = chart;
        chart.setPoints([...corridorYear(Math.min(g.startYear, db.lastYear)).filter((p) => p.id !== g.id), { id: g.id, x: g.x, y: g.y, type: g.type, year: g.year }], { duration: 0 });
        chart.setEmphasis([g.id]);
        chart.setTrails([{ id: 'duel', points: g.history.map((h) => ({ year: h.year, x: h.x, y: h.y, type: h.type })), colorDots: true }]);
        this.root.querySelector('[data-copy]').addEventListener('click', () => copyText(text, 'Sonuç panoya kopyalandı.'));
        this.root.querySelector('[data-setup]').addEventListener('click', () => {
            save('duel.current', null);
            navigate('/oyun/kizil-kralice', {});
        });
        this.root.querySelector('[data-rematch]').addEventListener('click', () => {
            if (this.config.opponent === 'ai') this.config.human = other(this.config.human);
            const idx = DUEL_SCENARIOS.findIndex((s) => s.id === g.id && s.year === g.startYear);
            if (idx !== -1) this.config.scenario = idx;
            this.config.rounds = g.rounds;
            this.newDuel();
        });
    }

    destroyChart() {
        this.chart?.destroy();
        this.chart = null;
    }

    unmount() {
        this.destroyChart();
        this.root.classList.remove('duel-page');
    }
}

function stat(label, value, sub = '') {
    return `<div class="card report-stat"><span class="tiny faint">${label}</span><span class="serif report-val">${value}</span>${sub ? `<span class="tiny faint">${sub}</span>` : ''}</div>`;
}

function corridorProgressOf(g) {
    const [px, py] = db.corridor.centroids.Paper;
    const [sx, sy] = db.corridor.centroids.Shackled;
    const dx = sx - px;
    const dy = sy - py;
    return ((g.x - px) * dx + (g.y - py) * dy) / (dx * dx + dy * dy);
}

/** Aynı senaryo ve aynı olaylarla, iki taraf da her tur İnşa + Örgütlen oynasaydı üretilecek refah */
function idealRun(g) {
    try {
        const h = D.createDuel({ id: g.id, name: g.name, startYear: g.startYear, start: g.start, rounds: g.round, seed: g.seed });
        while (h.status === 'playing') {
            D.submit(h, 'state', { stance: 'insa' });
            D.submit(h, 'society', { stance: 'orgutlen' });
            D.resolve(h);
        }
        return h.prosperity;
    } catch {
        return null;
    }
}

/** Kurulumdaki temel sonuç tablosu (konumdan bağımsız, taban değerler) */
function matrixTable() {
    const S = D.stancesFor('state');
    const T = D.stancesFor('society');
    return `<div class="duel-matrix">
        <table class="duel-grid-table">
            <thead><tr><th><span class="tiny faint">Devlet ↓ · Toplum →</span></th>${T.map((t) => `<th class="side-society-text">${STANCES[t].label}</th>`).join('')}</tr></thead>
            <tbody>${S.map(
                (s) => `<tr><th class="side-state-text">${STANCES[s].label}</th>${T.map((t) => {
                    const [ay, ax] = D.RULES.actS[s];
                    const [by, bx] = D.RULES.actT[t];
                    const [iy, ix] = D.RULES.inter[`${s}|${t}`];
                    const dy = ay + by + iy;
                    const dx = ax + bx + ix;
                    const dB = dy - dx;
                    return `<td class="${Math.abs(dB) < 0.015 ? '' : dB > 0 ? 'side-state-bg' : 'side-society-bg'}"><span class="mono tiny">D ${stanceArrows(dy)}</span><span class="mono tiny">T ${stanceArrows(dx)}</span></td>`;
                }).join('')}</tr>`,
            ).join('')}</tbody>
        </table>
        <p class="tiny faint">D: devletin gücü, T: toplumun gücü. Mavi hücre dengeyi Devlet’e, pembe hücre Toplum’a kaydırır. İnşa ile Örgütlen’in buluştuğu hücre Kızıl Kraliçe koşusudur: ikisi de büyür.</p>
    </div>`;
}
