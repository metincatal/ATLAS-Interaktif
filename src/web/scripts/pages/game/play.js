/**
 * Özgürlük Dengesi — oynanış ekranı
 */

import { icon } from '../../core/icons.js';
import { esc } from '../../core/dom.js';
import { db, loadCore, corridorYear, corridorSeries, countryName, flagHTML } from '../../core/data.js';
import { TYPES, typeChip, STAKEHOLDERS } from '../../core/theory.js';
import { signed, num, pct } from '../../core/format.js';
import { navigate } from '../../core/router.js';
import { load, save, setContext } from '../../core/store.js';
import { CorridorChart } from '../../components/corridor-chart.js';
import { toast } from '../../components/toast.js';
import { POLICY_BY_ID, CATEGORIES } from './policies.js';
import { MAX_POLICIES, REDRAW_COST, GROUPS, toggleSelect, redraw, preview, currentEvent, chooseEvent, canEndYear, endYear, advisor, finalReport, crisisRisk, historyMargin } from './engine.js';
import { renderReport } from './report.js';
import { recordDaily, signedInt } from './daily.js';
import { encodeGame } from './replay-code.js';
import { restartSame } from './start.js';

export async function mount(root) {
    await loadCore();
    const game = load('game.current') || window.__atlasGame;
    if (!game || game.v !== 2) {
        if (game) toast('Kayıtlı oyun, oyunun eski bir sürümüne ait; yeni bir oyun başlatın.');
        navigate('/oyun/denge');
        return { unmount() {} };
    }
    const page = new PlayPage(root, game);
    page.init();
    return page;
}

const arrows = (v) => {
    const a = Math.abs(v);
    if (a < 0.025) return '';
    const n = a >= 0.17 ? 3 : a >= 0.1 ? 2 : 1;
    return (v > 0 ? '▲' : '▼').repeat(n);
};

function stakeText(stake = {}) {
    return Object.entries(stake)
        .filter(([, d]) => Math.abs(d) >= 0.02)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .map(([g, d]) => `<span class="${d > 0 ? 'pos' : 'neg'}">${STAKEHOLDERS[g].label} ${d > 0 ? (d >= 0.1 ? '++' : '+') : d <= -0.1 ? '−−' : '−'}</span>`)
        .join(' · ');
}

function effectChips(eff = {}) {
    const chips = [];
    if (eff.dState) chips.push(`<span class="effect ${eff.dState > 0 ? 'up' : 'down'}">Devlet <b>${arrows(eff.dState) || signed(eff.dState)}</b></span>`);
    if (eff.dSociety) chips.push(`<span class="effect ${eff.dSociety > 0 ? 'up' : 'down'}">Toplum <b>${arrows(eff.dSociety) || signed(eff.dSociety)}</b></span>`);
    if (eff.capital) chips.push(`<span class="effect ${eff.capital > 0 ? 'up' : 'down'}">Sermaye <b>${eff.capital > 0 ? '+' : '−'}${Math.abs(eff.capital)}</b></span>`);
    return chips.join('');
}

/** Gecikmeli etkinin yalnızca yönü gösterilir; büyüklüğü sürpriz kalır */
function laterChip(later) {
    const e = later.effects || {};
    const dirs = [];
    if (e.dState) dirs.push(`Devlet ${e.dState > 0 ? '▲' : '▼'}`);
    if (e.dSociety) dirs.push(`Toplum ${e.dSociety > 0 ? '▲' : '▼'}`);
    if (e.capital) dirs.push(`Sermaye ${e.capital > 0 ? '▲' : '▼'}`);
    if (!dirs.length && e.stake) dirs.push('Güç odakları');
    return `<span class="effect later">${icon('hourglass', 'icon-sm')}${later.turns} yıl: ${dirs.join(' · ')}</span>`;
}

/** Olaylardaki belirsiz seçenekler: kesin olasılık yerine nitel etiket */
function chanceLabel(p) {
    if (p >= 0.7) return 'yüksek';
    if (p >= 0.45) return 'orta';
    return 'düşük';
}

class PlayPage {
    constructor(root, game) {
        this.root = root;
        this.s = game;
        this.lastReport = null;
    }

    init() {
        this.root.classList.add('game-play');
        setContext({ country: this.s.id, year: Math.min(this.s.year, db.lastYear) });
        if (this.s.status === 'over') {
            this.renderReport();
            return;
        }
        this.renderShell();
        this.renderAll();
    }

    persist() {
        save('game.current', this.s);
        window.__atlasGame = this.s;
    }

    // ------------------------------------------------------------------ iskelet
    renderShell() {
        const s = this.s;
        const daily = s.mode === 'gunluk' && s.daily;
        this.root.innerHTML = `
            <header class="gp-bar">
                <a class="gp-exit" href="#/oyun">${icon('chevronL', 'icon-sm')}Çık</a>
                <span class="gp-sep"></span>
                <div class="row gp-title">${flagHTML(s.id)}<span class="serif">${esc(countryName(s.id))}</span><span class="serif faint" data-year></span>${daily ? `<span class="chip chip-sm gp-daily">${icon('calendar', 'icon-sm')}Günün senaryosu #${s.daily.number}</span>` : ''}</div>
                <div class="row gp-turn"><span class="tiny faint">Tur</span><span class="mono small" data-turn></span><span class="meter" style="width:110px;--m:var(--text-2)"><span data-turn-bar></span></span></div>
                <span class="grow"></span>
                <div class="gp-stat" title="Siyasi sermaye: politikaların bedelini öder, güç odaklarının memnuniyetine göre yenilenir">
                    <span style="color:var(--paper)">${icon('coins')}</span>
                    <span class="stack" style="gap:3px"><span class="tiny faint">Siyasi sermaye</span><span class="meter" style="width:140px;--m:var(--paper)"><span data-cap-bar></span></span></span>
                    <span class="mono small" data-cap></span>
                </div>
                <div class="gp-stat" title="Koridorda geçen yıl ve toplam puan">
                    <span style="color:var(--shackled)">${icon('target')}</span>
                    <span class="stack" style="gap:1px"><span class="tiny faint">Koridor yılı · puan</span><span class="mono small" data-score></span></span>
                </div>
                ${
                    s.hist.length
                        ? `<div class="gp-stat" title="Aynı yıllarda gerçek tarihin aynı formülle aldığı puana göre farkınız">
                    <span style="color:var(--accent)">${icon('history')}</span>
                    <span class="stack" style="gap:1px"><span class="tiny faint">Tarihe karşı</span><span class="mono small" data-margin></span></span>
                </div>`
                        : ''
                }
            </header>
            <div class="gp-grid">
                <aside class="gp-left">
                    <section class="card card-pad stack" style="gap:12px" aria-labelledby="gp-pos">
                        <div class="card-title"><span id="gp-pos">Konum</span><span data-type></span></div>
                        <div class="gp-chart" data-chart></div>
                        ${s.hist.length ? '<p class="tiny faint gp-ghost-note"><span class="ghost-line"></span>Kesikli çizgi: ülkenin gerçekte izlediği yol</p>' : ''}
                        <div class="gp-metrics" data-metrics></div>
                    </section>
                    <section class="card card-pad stack" style="gap:12px" aria-labelledby="gp-stake">
                        <div class="card-title"><span id="gp-stake">Güç odakları</span><span class="hint">memnuniyet · etki · kriz</span></div>
                        <div class="stack" style="gap:10px" data-stake></div>
                    </section>
                </aside>
                <main class="gp-center">
                    <div data-summary></div>
                    <div data-event></div>
                    <div class="row" style="justify-content:space-between;align-items:baseline">
                        <h2 class="gp-h2">Politika masası</h2>
                        <span class="tiny faint">Bu yıl en fazla ${MAX_POLICIES} politika · kartlar her yıl yenilenir</span>
                    </div>
                    <div class="gp-cards" data-cards></div>
                    <div class="gp-actions">
                        <button class="btn btn-ghost btn-sm" type="button" data-redraw>${icon('shuffle')}Kartları yenile · ${REDRAW_COST}</button>
                        <span class="grow"></span>
                        <span class="small muted" data-selection></span>
                        <button class="btn btn-primary" type="button" data-end>Yılı tamamla${icon('arrowR')}</button>
                    </div>
                </main>
                <aside class="gp-right">
                    <section class="card card-pad stack" style="gap:10px" aria-labelledby="gp-adv">
                        <div class="card-title"><span id="gp-adv" class="row" style="gap:8px"><span style="color:var(--accent)">${icon('bulb')}</span>Danışman notu</span></div>
                        <div class="stack small muted" style="gap:8px" data-advice></div>
                    </section>
                    <section class="card card-pad stack" style="gap:8px" aria-labelledby="gp-prev">
                        <div class="card-title"><span id="gp-prev">Bu yılın etkisi</span><span class="hint">tahmini</span></div>
                        <div data-preview></div>
                    </section>
                    <section class="card card-pad stack gp-chronicle-card" style="gap:6px" aria-labelledby="gp-log">
                        <div class="card-title"><span id="gp-log" class="row" style="gap:8px">${icon('news')}Kronik</span></div>
                        <ol class="gp-log" data-log></ol>
                    </section>
                </aside>
            </div>`;

        this.chart = new CorridorChart(this.root.querySelector('[data-chart]'), { variant: 'mini', pointRadius: 2.2, baseOpacity: 0.26, interactive: false });

        this.root.querySelector('[data-cards]').addEventListener('click', (e) => {
            const card = e.target.closest('[data-id]');
            if (!card) return;
            const res = toggleSelect(this.s, card.dataset.id);
            if (res.reason) toast(res.reason);
            this.persist();
            this.renderCards();
            this.renderPreview();
            this.renderAdvice();
        });
        this.root.querySelector('[data-redraw]').addEventListener('click', () => {
            const res = redraw(this.s);
            if (!res.ok) toast(res.reason);
            this.persist();
            this.renderAll();
        });
        this.root.querySelector('[data-end]').addEventListener('click', () => this.finishYear());
        this.root.querySelector('[data-event]').addEventListener('click', (e) => {
            const b = e.target.closest('[data-choice]');
            if (!b) return;
            const outcome = chooseEvent(this.s, Number(b.dataset.choice));
            this.persist();
            if (this.s.status === 'over') {
                setTimeout(() => this.renderReport(), 900);
            }
            if (outcome && outcome.chance !== undefined) toast(outcome.success ? 'Hamleniz başarılı oldu.' : 'Hamleniz başarısız oldu.', { type: outcome.success ? 'info' : 'error' });
            this.renderAll();
        });
    }

    renderAll() {
        this.renderBar();
        this.renderPosition();
        this.renderStake();
        this.renderSummary();
        this.renderEvent();
        this.renderCards();
        this.renderPreview();
        this.renderAdvice();
        this.renderLog();
    }

    renderBar() {
        const s = this.s;
        this.root.querySelector('[data-year]').textContent = s.year;
        this.root.querySelector('[data-turn]').textContent = `${Math.min(s.turn + 1, s.turns)} / ${s.turns}`;
        this.root.querySelector('[data-turn-bar]').style.width = `${(s.turn / s.turns) * 100}%`;
        this.root.querySelector('[data-cap]').innerHTML = `${Math.round(s.capital.current)}<span class="faint"> / ${s.capital.max}</span>`;
        this.root.querySelector('[data-cap-bar]').style.width = `${(s.capital.current / s.capital.max) * 100}%`;
        this.root.querySelector('[data-score]').textContent = `${s.corridorYears} · ${Math.round(s.score)}`;
        const m = this.root.querySelector('[data-margin]');
        if (m) {
            const { margin, years } = historyMargin(s);
            m.textContent = years ? signedInt(margin) : '0';
            m.className = `mono small ${years ? (margin >= 0 ? 'pos' : 'neg') : ''}`;
        }
    }

    renderPosition() {
        const s = this.s;
        const worldYear = Math.min(s.year, db.lastYear);
        const backdrop = corridorYear(worldYear).filter((p) => p.id !== s.id);
        const me = { id: s.id, x: s.x, y: s.y, type: s.type, year: s.year };
        this.chart.setPoints([...backdrop, me], { duration: 450 });
        this.chart.setEmphasis([s.id]);
        const trail = [...s.history.filter((h) => h.year < s.year).map((h) => ({ year: h.year, x: h.x, y: h.y, type: h.type })), me];
        const trails = trail.length > 1 ? [{ id: 'player', points: trail, colorDots: true }] : [];
        const real = corridorSeries(s.id).filter((p) => p.year >= s.startYear && p.year <= s.year);
        if (real.length > 1) trails.unshift({ id: 'real', points: real, color: '#86AEFF', opacity: 0.55, showStart: false });
        this.chart.setTrails(trails);
        this.chart.svg.selectAll('g.trail-g').filter((d) => d.id === 'real').select('path').attr('stroke-dasharray', '4 4');
        this.root.querySelector('[data-type]').innerHTML = typeChip(s.type, { small: true, label: TYPES[s.type].short });

        const prev = s.history.length > 1 ? s.history[s.history.length - 2] : s.history[0];
        const last = s.history[s.history.length - 1];
        const ref = last.year === s.year ? prev : last;
        const m = (label, v, d) =>
            `<div class="stack" style="gap:2px"><span class="tiny faint">${label}</span><span class="mono">${signed(v)} ${d !== null && Math.abs(d) >= 0.005 ? `<span class="tiny ${d > 0 ? 'pos' : 'neg'}">${d > 0 ? '▲' : '▼'} ${num(Math.abs(d))}</span>` : ''}</span></div>`;
        this.root.querySelector('[data-metrics]').innerHTML = `
            ${m('Devletin gücü', s.y, s.turn ? s.y - ref.y : null)}
            ${m('Toplumun gücü', s.x, s.turn ? s.x - ref.x : null)}
            <div class="stack" style="gap:4px;grid-column:1/-1">
                <div class="row" style="justify-content:space-between"><span class="tiny faint">Özgürlük endeksi</span><span class="mono tiny">${num(s.liberty)}</span></div>
                <span class="meter" style="--m:var(--shackled)"><span style="width:${s.liberty * 100}%"></span></span>
            </div>`;
    }

    renderStake() {
        const s = this.s;
        this.root.querySelector('[data-stake]').innerHTML = GROUPS.map((g) => {
            const { sat, inf } = s.stake[g];
            const color = sat < 0.3 ? 'var(--despotic)' : sat < 0.5 ? 'var(--paper)' : 'var(--shackled)';
            const risk = crisisRisk(s, g);
            const danger = risk >= 0.05;
            return `<div class="stake-row${danger ? ' danger' : ''}">
                <span class="stake-icon">${icon(STAKEHOLDERS[g].icon, 'icon-sm')}</span>
                <span class="stake-name">${STAKEHOLDERS[g].label}</span>
                <span class="meter grow" style="--m:${color}"><span style="width:${Math.round(sat * 100)}%"></span></span>
                <span class="mono tiny" style="width:34px;text-align:right">%${Math.round(sat * 100)}</span>
                <span class="stake-inf" title="Etki gücü ${Math.round(inf * 100)}" style="--inf:${inf}"></span>
                <span class="stake-risk mono tiny ${danger ? 'neg' : 'faint'}" title="Bu yıl kriz çıkarma olasılığı">${risk >= 0.01 ? pct(risk) : '—'}</span>
            </div>`;
        }).join('');
    }

    renderSummary() {
        const el = this.root.querySelector('[data-summary]');
        const r = this.lastReport;
        if (!r) {
            el.innerHTML = '';
            return;
        }
        const real = r.real;
        el.innerHTML = `<div class="gp-summary card">
            <div class="row" style="gap:10px;flex-wrap:wrap"><span class="serif" style="font-size:20px">${r.year} tamamlandı</span>
                <span class="effect ${r.dy >= 0 ? 'up' : 'down'}">Devlet <b>${signed(r.dy)}</b></span>
                <span class="effect ${r.dx >= 0 ? 'up' : 'down'}">Toplum <b>${signed(r.dx)}</b></span>
                <span class="effect">Sermaye <b>+${r.regen}</b></span>
                <span class="effect up">Puan <b>+${r.points}</b></span>
                ${r.typeChange ? typeChip(r.typeChange.to, { small: true, label: `Yeni bölge: ${TYPES[r.typeChange.to].short}` }) : ''}
            </div>
            ${real ? `<p class="tiny muted gp-real">${icon('history', 'icon-sm')}<span>Gerçekte ${real.year}: ${TYPES[real.type].short} bölge, ${Math.round(real.pts)} puan. Siz: ${r.points} puan.</span></p>` : ''}
            ${r.notes.length || r.later.length ? `<ul class="gp-notes">${r.notes.map((n) => `<li>${esc(n)}</li>`).join('')}${r.later.map((n) => `<li>Süren etki: ${esc(n)}</li>`).join('')}</ul>` : ''}
        </div>`;
    }

    renderEvent() {
        const s = this.s;
        const el = this.root.querySelector('[data-event]');
        const ev = currentEvent(s);
        if (!ev) {
            el.innerHTML = '';
            return;
        }
        const chosen = s.event.choice;
        el.innerHTML = `<section class="gp-event${ev.crisis ? ' crisis' : ''}" aria-live="polite">
            <div class="row" style="gap:8px">${icon(ev.crisis ? 'warning' : 'bolt')}<span class="eyebrow">${ev.crisis ? 'Kriz' : ev.followOnly ? 'Geçmişten gelen' : 'Gündem'} · ${s.year}</span></div>
            <h2 class="title-1">${esc(ev.title)}</h2>
            <p class="small muted">${esc(ev.text)}</p>
            <div class="gp-choices">
                ${ev.choices
                    .map((c, i) => {
                        const eff = typeof c.effects === 'function' ? c.effects(s) : c.effects;
                        const chance = c.risk ? c.risk.chance(s) : null;
                        const isChosen = chosen === i;
                        const risky = chance !== null ? (ev.crisis ? `<span class="effect ${chance >= 0.5 ? 'up' : 'down'}">Başarı olasılığı <b>${pct(chance)}</b></span>` : `<span class="effect ${chance >= 0.6 ? 'up' : 'down'}">Riskli · başarı şansı <b>${chanceLabel(chance)}</b></span>`) : '';
                        return `<button type="button" class="gp-choice${isChosen ? ' chosen' : ''}" data-choice="${i}" ${chosen !== null ? 'disabled' : ''}>
                            <span class="gp-choice-label">${esc(c.label)}</span>
                            <span class="row" style="gap:6px;flex-wrap:wrap">${chance !== null ? risky : effectChips(eff)}${c.later ? laterChip(c.later) : ''}</span>
                            ${chance === null && eff?.stake ? `<span class="tiny">${stakeText(eff.stake)}</span>` : ''}
                            ${c.followUp ? `<span class="tiny faint row" style="gap:6px">${icon('history', 'icon-sm')}Sonuçları ileride de görülebilir</span>` : ''}
                        </button>`;
                    })
                    .join('')}
            </div>
            ${chosen !== null ? `<div class="gp-outcome"><span>${icon(s.event.outcome?.success === false ? 'warning' : 'check', 'icon-sm')}</span><p class="small">${esc(s.event.outcome?.text || '')}</p></div>` : ''}
        </section>`;
    }

    renderCards() {
        const s = this.s;
        const cost = preview(s).cost;
        this.root.querySelector('[data-cards]').innerHTML = s.hand
            .map((id) => {
                const p = POLICY_BY_ID[id];
                const sel = s.selected.includes(id);
                const afford = sel || (s.selected.length < MAX_POLICIES && cost + p.cost <= s.capital.current);
                return `<button type="button" class="policy-card cat-${p.cat}${sel ? ' selected' : ''}" data-id="${id}" aria-pressed="${sel}" ${afford ? '' : 'aria-disabled="true"'}>
                    <span class="pc-top"><span class="pc-cat">${CATEGORIES[p.cat].label}</span><span class="row" style="gap:6px">${sel ? `<span class="pc-check">${icon('check', 'icon-sm')}</span>` : ''}<span class="pc-cost mono ${p.cost < 0 ? 'pos' : ''}">${icon('coins', 'icon-sm')}${p.cost < 0 ? `+${-p.cost}` : p.cost}</span></span></span>
                    <span class="pc-title">${esc(p.title)}</span>
                    <span class="pc-desc">${esc(p.desc)}</span>
                    <span class="row" style="gap:6px;flex-wrap:wrap">${effectChips({ dState: p.dState, dSociety: p.dSociety })}</span>
                    <span class="pc-stake tiny">${stakeText(p.stake)}</span>
                </button>`;
            })
            .join('');
        const redrawBtn = this.root.querySelector('[data-redraw]');
        redrawBtn.disabled = s.redrawn || s.capital.current < REDRAW_COST;
        this.renderSelection();
    }

    renderSelection() {
        const s = this.s;
        const pv = preview(s);
        this.root.querySelector('[data-selection]').innerHTML = s.selected.length
            ? `${s.selected.length} politika · <span class="mono" style="color:var(--text-1)">${pv.cost < 0 ? '+' + -pv.cost : pv.cost}</span> sermaye`
            : 'Politika seçmeden de yılı tamamlayabilirsiniz';
        const end = this.root.querySelector('[data-end]');
        const ok = canEndYear(s);
        end.disabled = !ok;
        end.innerHTML = ok ? `Yılı tamamla${icon('arrowR')}` : 'Önce gündemi yanıtlayın';
    }

    renderPreview() {
        const s = this.s;
        const pv = preview(s);
        const el = this.root.querySelector('[data-preview]');
        this.renderSelection();
        const ongoing = s.delayed.length
            ? `<div class="gp-ongoing">${s.delayed.map((d) => `<span class="effect later">${icon('hourglass', 'icon-sm')}${esc(d.label)} · ${d.turns} yıl</span>`).join('')}</div>`
            : '';
        const inCorridor = s.type === 'Shackled';
        if (!s.selected.length) {
            el.innerHTML = `<p class="tiny faint">Kart seçtikçe burada tahmini etkiyi göreceksiniz.${inCorridor ? ' Koridorda politika seçmezseniz devlet de toplum da aşınır.' : ''}</p>${ongoing}`;
            return;
        }
        const run = inCorridor ? (pv.dx >= 0.03 && pv.dy >= 0.03 ? '<p class="tiny pos" style="margin-top:6px">Kızıl Kraliçe: devlet ve toplum birlikte koşuyor; aşınma yok.</p>' : `<p class="tiny neg" style="margin-top:6px">Koridorda ${pv.dy < 0.03 && pv.dx < 0.03 ? 'iki taraf da' : pv.dy < 0.03 ? 'devlet' : 'toplum'} bu yıl güçlenmiyor; geride kalan taraf aşınır.</p>`) : '';
        el.innerHTML = `<div class="row" style="gap:6px;flex-wrap:wrap">
                <span class="effect ${pv.dy >= 0 ? 'up' : 'down'}">Devlet <b>${signed(pv.dy)}</b></span>
                <span class="effect ${pv.dx >= 0 ? 'up' : 'down'}">Toplum <b>${signed(pv.dx)}</b></span>
            </div>
            ${pv.synergy ? `<p class="tiny pos" style="margin-top:6px">Kızıl Kraliçe primi: devlet ve toplum birlikte güçleniyor (+%12).</p>` : ''}
            ${run}
            ${pv.pace > 1.01 ? `<p class="tiny neg" style="margin-top:6px">Hızlı reform: kaybeden güç odaklarının tepkisi ×${num(pv.pace, 1)}.</p>` : ''}
            <p class="tiny" style="margin-top:6px">${stakeText(pv.stake) || '<span class="faint">Güç odaklarına belirgin etki yok.</span>'}</p>
            ${ongoing}
            <p class="tiny faint" style="margin-top:6px">Rastlantısal olaylar, denge dinamiği ve kurumsal süreklilik sonucu değiştirebilir.</p>`;
    }

    renderAdvice() {
        this.root.querySelector('[data-advice]').innerHTML = advisor(this.s)
            .map((t) => `<p>${esc(t)}</p>`)
            .join('');
    }

    renderLog() {
        const kinds = { policy: 'scale', event: 'bolt', crisis: 'warning', type: 'corridor', info: 'flag' };
        this.root.querySelector('[data-log]').innerHTML = this.s.log
            .slice(0, 30)
            .map((l) => `<li class="log-${l.kind}"><span class="mono tiny faint">${l.year}</span><span class="log-icon">${icon(kinds[l.kind] || 'info', 'icon-sm')}</span><span class="stack" style="gap:2px"><span class="small">${esc(l.title)}</span>${l.detail ? `<span class="tiny faint">${esc(l.detail)}</span>` : ''}</span></li>`)
            .join('');
    }

    finishYear() {
        if (!canEndYear(this.s)) return;
        const report = endYear(this.s);
        this.lastReport = report;
        this.persist();
        if (this.s.status === 'over') {
            this.renderReport();
            return;
        }
        this.renderAll();
        setContext({ country: this.s.id, year: Math.min(this.s.year, db.lastYear) });
        this.root.querySelector('.gp-center')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }

    // ------------------------------------------------------------------ rapor
    renderReport() {
        const s = this.s;
        const r = finalReport(s);
        save('game.last', { id: s.id, year: s.startYear, grade: r.grade, score: r.score, margin: r.margin });
        let note = '';
        if (s.mode === 'gunluk' && s.daily) {
            const first = recordDaily(s.daily.key, { id: s.id, year: s.startYear, score: r.score, margin: r.margin, grade: r.grade, corridorYears: r.corridorYears, years: r.years, code: encodeGame(s) });
            note = first ? 'Bugünün resmî sonucu olarak kaydedildi. Günün senaryosunu yeniden oynayabilirsiniz ama resmî sonucunuz değişmez.' : 'Bugünün resmî sonucunuz daha önce kaydedilmişti; bu deneme sayılmaz.';
        }
        this.chart?.destroy();
        const out = renderReport(this.root, s, {
            note,
            actions: [
                { label: s.mode === 'gunluk' ? 'Günün senaryosunu yeniden oyna' : 'Aynı senaryoyu aynı zarlarla yeniden', icon: 'rotate', primary: true, onClick: () => restartSame(s) },
                { label: 'Başka ülke seç', icon: 'flag', onClick: () => navigate('/oyun/denge', { c: s.id, y: s.startYear }) },
                { label: 'Gerçek rotayı Gözlemevi’nde incele', icon: 'corridor', ghost: true, href: `#/koridor?c=${s.id}&y=${Math.min(s.startYear, db.lastYear)}` },
            ],
        });
        this.chart = out.chart;
    }

    unmount() {
        this.chart?.destroy();
        this.root.classList.remove('game-play');
    }
}
