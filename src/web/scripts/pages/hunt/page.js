/**
 * Leviathan Avı — günlük bulmaca sayfası
 *
 * Adı gizli bir ülkenin koridor rotası gösterilir; oyuncu altı tahminde ülkeyi
 * bulmaya çalışır. Rota grafiğinde etkileşim ve etiket kapalıdır, böylece
 * grafik ülkenin adını ele vermez.
 */

import { icon } from '../../core/icons.js';
import { esc, debounce } from '../../core/dom.js';
import { db, loadCore, loadWorld, corridorSeries, countryName, flagHTML, searchCountries } from '../../core/data.js';
import { TYPES, TYPE_ORDER, typeChip } from '../../core/theory.js';
import { int, pct } from '../../core/format.js';
import { href, navigate } from '../../core/router.js';
import { countryStory } from '../../core/narrative.js';
import { CorridorChart } from '../../components/corridor-chart.js';
import { toast } from '../../components/toast.js';
import { copyText, appURL } from '../../components/share.js';
import { dayKey, dayLabel } from '../game/daily.js';
import { HuntMap } from './map.js';
import { MAX_GUESSES, NEAR_KM, huntPuzzle, practicePuzzle, evaluateGuess, hints, huntProgress, saveHunt, huntResults, huntStreak, shareHunt, compassWord } from './logic.js';

export async function mount(root, params) {
    await loadCore();
    const page = new HuntPage(root, params);
    page.init();
    return page;
}

class HuntPage {
    constructor(root, params) {
        this.root = root;
        this.practice = params.pratik !== undefined;
        const seed = Number(params.pratik) || 0;
        const today = huntPuzzle(dayKey());
        // Pratik, günün ülkesini ele vermesin
        this.puzzle = this.practice ? practicePuzzle(seed || 1, today.id) : today;
        const saved = this.practice ? null : huntProgress(this.puzzle.key);
        this.guesses = saved?.guesses || [];
        this.chart = null;
        this.map = null;
        this.world = null;
    }

    get evals() {
        return this.guesses.map((id) => evaluateGuess(id, this.puzzle.id));
    }

    get solved() {
        return this.guesses.includes(this.puzzle.id);
    }

    get done() {
        return this.solved || this.guesses.length >= MAX_GUESSES;
    }

    persist() {
        if (this.practice) return;
        saveHunt(this.puzzle.key, { id: this.puzzle.id, guesses: this.guesses, solved: this.solved, done: this.done });
    }

    init() {
        const p = this.puzzle;
        const series = corridorSeries(p.id);
        const first = series[0];
        const last = series[series.length - 1];
        const shares = Object.fromEntries(TYPE_ORDER.map((t) => [t, series.filter((s) => s.type === t).length / series.length]));
        const dominant = TYPE_ORDER.reduce((a, t) => (shares[t] > shares[a] ? t : a), TYPE_ORDER[0]);
        this.root.innerHTML = `
            <div class="container hunt">
                <header class="stack" style="gap:10px">
                    <a class="gs-back small" href="#/oyun">${icon('chevronL', 'icon-sm')}Oyunlar</a>
                    <div class="row" style="gap:8px;flex-wrap:wrap"><span class="eyebrow">${this.practice ? 'Pratik' : `Günlük bulmaca #${p.number} · ${dayLabel(p.key)}`}</span></div>
                    <h1 class="display-2">Leviathan Avı</h1>
                    <p class="lede" style="max-width:720px">Aşağıda adı gizlenmiş bir ülkenin ${first.year}–${last.year} arasındaki dar koridor rotası var. Her nokta bir dönemi, rengi o dönemdeki Leviathan tipini gösterir. ${MAX_GUESSES} tahminde ülkeyi bulun: her yanlış tahmin, başkentler arası uzaklığı, yönü ve iki rotanın benzerliğini söyler; yeni bir ipucu açar.</p>
                </header>
                <div class="hunt-grid">
                    <section class="card card-pad stack hunt-route-card" style="gap:12px" aria-labelledby="hunt-route">
                        <div class="card-title"><span id="hunt-route">Gizli ülkenin rotası</span><span class="hint">${first.year}–${last.year} · ${series.length} yıllık veri</span></div>
                        <div class="hunt-chart" data-chart></div>
                        <div class="stack" style="gap:6px">
                            <div class="type-strip" role="img" aria-label="Yıllara göre Leviathan tipi">${series.map((s) => `<span class="t-${s.type}" title="${s.year}: ${TYPES[s.type].short}"></span>`).join('')}</div>
                            <div class="row tiny faint" style="justify-content:space-between"><span>${first.year}</span><span>${last.year}</span></div>
                        </div>
                        <div class="row hunt-facts">
                            <span class="small muted">En uzun süre: ${typeChip(dominant, { small: true, label: `${TYPES[dominant].short} ${pct(shares[dominant])}` })}</span>
                            <span class="small muted">Son durum: ${typeChip(last.type, { small: true, label: `${TYPES[last.type].short} · ${last.year}` })}</span>
                        </div>
                    </section>
                    <section class="card card-pad stack hunt-map-card" style="gap:12px" aria-labelledby="hunt-map">
                        <div class="card-title"><span id="hunt-map" class="row" style="gap:8px">${icon('map', 'icon-sm')}Tahmin haritası</span><span class="hint">sürükleyin, yakınlaştırın; ülkeye dokunup seçin</span></div>
                        <div class="hunt-map" data-map></div>
                        <div class="hunt-map-legend tiny faint">
                            <span class="row" style="gap:6px"><svg width="22" height="8" aria-hidden="true"><path d="M1 4h20" class="hm-legend-ring"/></svg>Gizli ülkenin başkenti bu uzaklıkta</span>
                            <span class="row" style="gap:6px"><svg width="22" height="8" aria-hidden="true"><path d="M1 4h20" class="hm-legend-arc"/></svg>Yön ipucunun kapsadığı 45°'lik dilim</span>
                        </div>
                    </section>
                    <aside class="stack hunt-side" style="gap:14px;min-width:0">
                        <section class="card card-pad stack" style="gap:12px" aria-labelledby="hunt-guess">
                            <div class="card-title"><span id="hunt-guess">Tahminler</span><span class="hint mono" data-count></span></div>
                            <form class="hunt-form" data-form autocomplete="off">
                                <label class="field"><span class="sr-only">Ülke tahmini</span>${icon('search', 'icon-sm')}<input type="text" placeholder="Bir ülke yazın…" data-input aria-autocomplete="list" aria-controls="hunt-suggest" role="combobox" aria-expanded="false" spellcheck="false"></label>
                                <ul class="hunt-suggest" id="hunt-suggest" role="listbox" data-suggest hidden></ul>
                            </form>
                            <ol class="hunt-guesses" data-guesses></ol>
                        </section>
                        <section class="card card-pad stack" style="gap:10px" aria-labelledby="hunt-hints">
                            <div class="card-title"><span id="hunt-hints" class="row" style="gap:8px">${icon('bulb', 'icon-sm')}İpuçları</span><span class="hint">her yanlış tahminde bir tane</span></div>
                            <div class="stack" style="gap:8px" data-hints></div>
                        </section>
                        <div data-result></div>
                    </aside>
                </div>
            </div>`;

        this.chart = new CorridorChart(this.root.querySelector('[data-chart]'), { variant: 'full', pointRadius: 5, interactive: false, ariaLabel: 'Gizli ülkenin koridor rotası' });
        this.chart.setPoints([{ id: '__gizli', x: last.x, y: last.y, type: last.type, year: last.year }]);
        this.chart.setTrails([{ id: 'gizli', points: series, colorDots: true }]);

        const input = this.root.querySelector('[data-input]');
        const list = this.root.querySelector('[data-suggest]');
        input.addEventListener(
            'input',
            debounce(() => this.suggest(input.value), 60),
        );
        input.addEventListener('keydown', (e) => {
            const items = [...list.querySelectorAll('[data-id]')];
            if (!items.length) return;
            const i = items.findIndex((x) => x.getAttribute('aria-selected') === 'true');
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const next = e.key === 'ArrowDown' ? Math.min(items.length - 1, i + 1) : Math.max(0, i - 1);
                items.forEach((x, j) => x.setAttribute('aria-selected', String(j === next)));
            } else if (e.key === 'Escape') this.closeSuggest();
        });
        this.root.querySelector('[data-form]').addEventListener('submit', (e) => {
            e.preventDefault();
            const sel = list.querySelector('[aria-selected="true"]') || list.querySelector('[data-id]');
            if (sel) this.guess(sel.dataset.id);
            else if (input.value.trim()) toast('Bu adla eşleşen bir ülke bulunamadı.');
        });
        list.addEventListener('mousedown', (e) => {
            const b = e.target.closest('[data-id]');
            if (!b) return;
            e.preventDefault();
            this.guess(b.dataset.id);
        });
        input.addEventListener('blur', () => setTimeout(() => this.closeSuggest(), 120));
        this.map = new HuntMap(this.root.querySelector('[data-map]'), { onPick: (id) => this.guess(id, { fromMap: true }) });
        this.render();
        this.map.init();
    }

    suggest(query) {
        const list = this.root.querySelector('[data-suggest]');
        const input = this.root.querySelector('[data-input]');
        if (!query.trim() || this.done) return this.closeSuggest();
        const ids = searchCountries(query, { limit: 7, filter: (id) => Boolean(db.countries[id]?.corridor) && !this.guesses.includes(id) });
        list.innerHTML = ids.map((id, i) => `<li role="option" data-id="${id}" aria-selected="${i === 0}">${flagHTML(id)}<span>${esc(countryName(id))}</span></li>`).join('') || '<li class="tiny faint hunt-empty">Eşleşen ülke yok</li>';
        list.hidden = false;
        input.setAttribute('aria-expanded', 'true');
    }

    closeSuggest() {
        const list = this.root.querySelector('[data-suggest]');
        if (!list) return;
        list.hidden = true;
        list.innerHTML = '';
        this.root.querySelector('[data-input]')?.setAttribute('aria-expanded', 'false');
    }

    guess(id, { fromMap = false } = {}) {
        if (this.done || this.guesses.includes(id)) return;
        this.guesses.push(id);
        this.persist();
        const input = this.root.querySelector('[data-input]');
        input.value = '';
        this.closeSuggest();
        this.render();
        // Haritadan tahminde odağı arama kutusuna taşıma: mobilde klavye açılıp haritayı kapatır
        if (!this.done && !fromMap) input.focus();
    }

    render() {
        const evals = this.evals;
        const wrong = evals.filter((e) => !e.correct).length;
        this.root.querySelector('[data-count]').textContent = `${this.guesses.length} / ${MAX_GUESSES}`;
        const input = this.root.querySelector('[data-input]');
        input.disabled = this.done;
        input.placeholder = this.done ? (this.solved ? 'Bulundu' : 'Tahmin hakkınız bitti') : `Bir ülke yazın… (${MAX_GUESSES - this.guesses.length} hak)`;

        this.root.querySelector('[data-guesses]').innerHTML =
            evals
                .map((e, i) => {
                    const near = e.km !== null && e.km < NEAR_KM;
                    return `<li class="hunt-row${e.correct ? ' correct' : ''}">
                    <span class="mono tiny faint">${i + 1}</span>
                    <span class="row" style="gap:8px;min-width:0">${flagHTML(e.id)}<span class="hunt-name">${esc(countryName(e.id))}</span></span>
                    ${
                        e.correct
                            ? `<span class="hunt-ok pos">${icon('check', 'icon-sm')}Bulundu</span>`
                            : `<span class="mono small ${near ? 'pos' : 'faint'}" title="Başkentler arası uzaklık">${e.km === null ? '—' : `${int(e.km)} km`}</span>
                        <span class="hunt-dir" title="Gizli ülke ${e.bearing === null ? '' : `${compassWord(e.bearing)} yönünde`}">${e.bearing === null ? '' : `<span style="transform:rotate(${Math.round(e.bearing - 90)}deg)">${icon('arrowR', 'icon-sm')}</span>`}</span>
                        <span class="hunt-sim" title="Koridor rotalarının benzerliği"><span class="meter" style="--m:var(--accent)"><span style="width:${(e.similarity ?? 0) * 100}%"></span></span><span class="mono tiny">${e.similarity === null ? '—' : pct(e.similarity)}</span></span>`
                    }
                </li>`;
                })
                .join('') || `<li class="tiny faint hunt-empty">Henüz tahmin yok. Rotaya bakın: ülke hangi dönemlerde koridora girmiş, ne zaman dışarı savrulmuş?</li>`;

        const hs = hints(this.puzzle.id, this.done ? 5 : wrong);
        this.root.querySelector('[data-hints]').innerHTML = hs.length
            ? hs
                  .map((h) =>
                      h.key === 'shape'
                          ? `<div class="hunt-hint"><span class="tiny faint">${h.label}</span><div class="hunt-shape" data-shape></div></div>`
                          : `<div class="hunt-hint"><span class="tiny faint">${h.label}</span><span class="small">${esc(h.value)}</span></div>`,
                  )
                  .join('')
            : '<p class="tiny faint">İlk yanlış tahminden sonra kıta açılır; sonra bölge, başkentin baş harfi, ülkenin adının baş harfi ve son olarak sınırlar.</p>';
        if (hs.some((h) => h.key === 'shape')) this.drawShape();

        this.map?.update(evals, { target: this.puzzle.id, done: this.done });
        this.renderResult(evals);
    }

    async drawShape() {
        const el = this.root.querySelector('[data-shape]');
        if (!el || !window.d3) return;
        try {
            this.world = this.world || (await loadWorld());
        } catch {
            el.innerHTML = '<span class="tiny faint">Sınırlar yüklenemedi.</span>';
            return;
        }
        const f = this.world.features.find((x) => x.properties.id === this.puzzle.id);
        if (!f) {
            el.innerHTML = '<span class="tiny faint">Bu ülkenin sınırları haritada yok.</span>';
            return;
        }
        const d3 = window.d3;
        const w = 220;
        const h = 150;
        const projection = d3.geoMercator().fitExtent(
            [
                [8, 8],
                [w - 8, h - 8],
            ],
            f,
        );
        const path = d3.geoPath(projection);
        el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Gizli ülkenin sınırları"><path d="${path(f)}" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
    }

    renderResult(evals) {
        const el = this.root.querySelector('[data-result]');
        if (!this.done) {
            el.innerHTML = '';
            return;
        }
        const p = this.puzzle;
        const story = countryStory(p.id, db.lastYear).sentences.slice(0, 2).join(' ');
        const results = huntResults();
        const finished = Object.values(results).filter((r) => r.done);
        const won = finished.filter((r) => r.solved);
        const dist = Array.from({ length: MAX_GUESSES }, (_, i) => won.filter((r) => r.guesses.length === i + 1).length);
        const maxD = Math.max(1, ...dist);
        const link = appURL('#/oyun/leviathan-avi');
        const text = this.practice ? '' : shareHunt({ number: p.number, key: p.key, evals, solved: this.solved }, link);
        el.innerHTML = `<section class="card card-pad stack hunt-result ${this.solved ? 'won' : 'lost'}" style="gap:12px" aria-live="polite">
            <span class="eyebrow">${this.solved ? `${evals.length}. tahminde buldunuz` : 'Bu kez bulunamadı'}</span>
            <div class="row" style="gap:12px">${flagHTML(p.id, 'flag-lg')}<h2 class="title-1">${esc(countryName(p.id))}</h2></div>
            <p class="small muted">${esc(story)}</p>
            <div class="row" style="gap:8px;flex-wrap:wrap">
                <a class="btn btn-secondary btn-sm" href="${href('/atlas', { c: p.id })}">${icon('globe', 'icon-sm')}Atlas’ta aç</a>
                <a class="btn btn-ghost btn-sm" href="${href('/koridor', { c: p.id })}">${icon('corridor', 'icon-sm')}Gözlemevi’nde incele</a>
            </div>
            ${
                this.practice
                    ? ''
                    : `<div class="hunt-stats">
                <div><span class="serif">${finished.length}</span><span class="tiny faint">oynandı</span></div>
                <div><span class="serif">${finished.length ? pct(won.length / finished.length) : '—'}</span><span class="tiny faint">bulundu</span></div>
                <div><span class="serif">${huntStreak()}</span><span class="tiny faint">seri</span></div>
            </div>
            <div class="hunt-dist">${dist.map((n, i) => `<div class="row" style="gap:8px"><span class="mono tiny faint" style="width:10px">${i + 1}</span><span class="hunt-dist-bar" style="width:${Math.max(6, (n / maxD) * 100)}%">${n}</span></div>`).join('')}</div>
            <pre class="share-text">${esc(text)}</pre>
            <button class="btn btn-primary btn-sm" type="button" data-copy>${icon('copy', 'icon-sm')}Sonucu kopyala</button>`
            }
            <button class="btn btn-ghost btn-sm" type="button" data-practice>${icon('shuffle', 'icon-sm')}Rastgele bir ülkeyle pratik yap</button>
        </section>`;
        el.querySelector('[data-copy]')?.addEventListener('click', () => copyText(text, 'Sonuç panoya kopyalandı.'));
        el.querySelector('[data-practice]').addEventListener('click', () => navigate('/oyun/leviathan-avi', { pratik: Math.floor(Math.random() * 1e6) + 1 }));
        // Bulunduktan sonra rotanın sonuna adı yaz
        this.chart.setPoints([{ id: p.id, x: corridorSeries(p.id).at(-1).x, y: corridorSeries(p.id).at(-1).y, type: corridorSeries(p.id).at(-1).type, year: db.lastYear }]);
        this.chart.setEmphasis([p.id]);
    }

    unmount() {
        this.chart?.destroy();
        this.map?.destroy();
    }
}
