/**
 * Özgürlük Dengesi — kurulum ekranı
 */

import { icon } from '../../core/icons.js';
import { esc, debounce } from '../../core/dom.js';
import { db, loadCore, loadGameCountry, corridorAt, corridorYear, typeChanges, countryName, flagHTML, searchCountries } from '../../core/data.js';
import { TYPES, typeChip, STAKEHOLDERS } from '../../core/theory.js';
import { replaceParams } from '../../core/router.js';
import { load } from '../../core/store.js';
import { CorridorChart } from '../../components/corridor-chart.js';
import { toast } from '../../components/toast.js';
import { suffix, num } from '../../core/format.js';
import { DIFFICULTY, GROUPS, buildHistory } from './engine.js';
import { startGame } from './start.js';

const DURATIONS = [10, 20, 30];

export async function mount(root, params) {
    await loadCore();
    const page = new SetupPage(root, params);
    await page.init();
    return page;
}

class SetupPage {
    constructor(root, params) {
        this.root = root;
        // Eski bağlantılar ülke adını taşıyabilir (ör. ?country=Turkey)
        const byName = params.c && !db.countries[params.c] ? searchCountries(params.c, { limit: 1, filter: (id) => Boolean(db.countries[id]?.game) })[0] : null;
        const wanted = byName || params.c;
        this.id = wanted && db.countries[wanted]?.game ? wanted : 'TUR';
        this.wantedYear = Number(params.y) || null;
        this.turns = 20;
        this.difficulty = 'dengeli';
        this.query = '';
        this.gameData = null;
    }

    async init() {
        const saved = load('game.current');
        this.root.innerHTML = `
            <div class="container game-setup">
                <section class="gs-left">
                    <div class="stack" style="gap:12px">
                        <a class="gs-back small" href="#/oyun">${icon('chevronL', 'icon-sm')}Oyunlar</a>
                        <span class="eyebrow">Tek oyunculu strateji</span>
                        <h1 class="display-2">Özgürlük Dengesi</h1>
                        <p class="lede" style="max-width:600px">Bir ülkenin yönetimini gerçek bir yıldan devralın. Her yıl sınırlı siyasi sermayeyle politikalar seçin, krizlere yanıt verin; ülkeyi dar koridora taşıyın ve orada tutun. Aynı yıllarda gerçekte olanı geçebilecek misiniz?</p>
                    </div>
                    ${saved && saved.v === 2 && saved.status === 'playing' ? `<div class="card gs-resume"><span class="faint">${icon('history')}</span><div class="grow"><div style="font-weight:600">Yarım kalan oyun</div><div class="small muted">${esc(countryName(saved.id))} · ${saved.year} · Tur ${saved.turn + 1} / ${saved.turns}</div></div><a class="btn btn-secondary btn-sm" href="#/oyun/oyna">Devam et${icon('arrowR', 'icon-sm')}</a></div>` : ''}
                    <div class="gs-step">
                        <div class="gs-label"><span class="gs-num mono">1</span>Ülke</div>
                        <label class="field"><span class="sr-only">Ülke ara</span>${icon('search', 'icon-sm')}<input type="search" placeholder="${Object.values(db.countries).filter((c) => c.game).length} ülke arasında ara…" data-q autocomplete="off"></label>
                        <div class="gs-list" role="listbox" aria-label="Ülkeler" data-list></div>
                    </div>
                    <div class="gs-step">
                        <div class="gs-label"><span class="gs-num mono">2</span>Başlangıç yılı <span class="grow"></span><span class="tiny faint" data-year-range></span></div>
                        <div class="gs-years" data-years></div>
                        <div class="row" style="gap:14px">
                            <label class="sr-only" for="gs-year">Başlangıç yılı</label>
                            <input id="gs-year" class="range grow" type="range" step="1" data-year-slider>
                            <span class="mono gs-year-val" data-year-val></span>
                        </div>
                    </div>
                    <div class="gs-row2">
                        <div class="gs-step">
                            <div class="gs-label"><span class="gs-num mono">3</span>Süre</div>
                            <div class="segmented" role="group" aria-label="Süre" data-turns>${DURATIONS.map((d) => `<button type="button" data-v="${d}" aria-pressed="${d === this.turns}">${d} yıl</button>`).join('')}</div>
                        </div>
                        <div class="gs-step">
                            <div class="gs-label"><span class="gs-num mono">4</span>Zorluk</div>
                            <div class="segmented" role="group" aria-label="Zorluk" data-diff>${Object.entries(DIFFICULTY)
                                .map(([k, d]) => `<button type="button" data-v="${k}" aria-pressed="${k === this.difficulty}">${d.label}</button>`)
                                .join('')}</div>
                        </div>
                    </div>
                </section>
                <aside class="card gs-brief" aria-label="Görev özeti">
                    <div class="row" style="justify-content:space-between;align-items:flex-start">
                        <div class="stack" style="gap:6px"><span class="eyebrow">Görev özeti</span><h2 class="title-1" data-brief-title></h2></div>
                        <span data-brief-type></span>
                    </div>
                    <div class="gs-chart" data-chart></div>
                    <div class="stack" style="gap:10px">
                        <div class="row" style="justify-content:space-between"><span class="eyebrow">Güç odakları · memnuniyet</span><span class="tiny faint">V-Dem’den türetildi</span></div>
                        <div class="stack" style="gap:9px" data-stake></div>
                    </div>
                    <div class="gs-goal">${icon('target')}<p class="small muted" data-goal></p></div>
                    <div class="gs-history" data-history></div>
                    <button class="btn btn-primary btn-lg btn-block" type="button" data-start>Göreve başla${icon('arrowR')}</button>
                    <details class="gs-rules">
                        <summary>Nasıl oynanır?</summary>
                        <ul class="small muted">
                            <li>Her tur bir yıldır. Elinize gelen beş karttan en fazla üçünü seçip siyasi sermayenizle uygulayın.</li>
                            <li>Kartlar devletin ve toplumun gücünü değiştirir; güç odaklarını memnun eder ya da kızdırır.</li>
                            <li>Aynı yıl hem devleti hem toplumu güçlendirirseniz <strong>Kızıl Kraliçe primi</strong> kazanırsınız.</li>
                            <li><strong>Koridorda yerinde saymak geriye düşmektir:</strong> o yıl güçlendirmediğiniz taraf aşınır, puanınız düşer.</li>
                            <li>Aynı yıl çok sayıda reform yapmak, kaybeden güç odaklarının <strong>tepkisini</strong> büyütür.</li>
                            <li>Memnuniyetsiz ve etkili güç odakları her yıl belli bir olasılıkla kriz çıkarır: darbe, ayaklanma, sermaye kaçışı… Olasılıkları güç odakları panelinde görürsünüz.</li>
                            <li>Bazı kararların etkisi yıllara yayılır ya da ileride yeni bir olay doğurur.</li>
                            <li>Puanınız, aynı yıllarda ülkenin <strong>gerçek tarihinin</strong> aynı formülle aldığı puanla karşılaştırılır.</li>
                        </ul>
                    </details>
                </aside>
            </div>`;

        this.chart = new CorridorChart(this.root.querySelector('[data-chart]'), { variant: 'mini', pointRadius: 2.4, baseOpacity: 0.3, interactive: false });

        const q = this.root.querySelector('[data-q]');
        q.addEventListener(
            'input',
            debounce(() => {
                this.query = q.value;
                this.renderList();
            }, 80),
        );
        this.root.querySelector('[data-list]').addEventListener('click', (e) => {
            const b = e.target.closest('[data-id]');
            if (b) this.selectCountry(b.dataset.id);
        });
        this.root.querySelector('[data-years]').addEventListener('click', (e) => {
            const b = e.target.closest('[data-year]');
            if (b) this.setYear(Number(b.dataset.year));
        });
        this.root.querySelector('[data-year-slider]').addEventListener('input', (e) => this.setYear(this.years[Number(e.target.value)], { fromSlider: true }));
        this.bindSegment('[data-turns]', (v) => (this.turns = Number(v)));
        this.bindSegment('[data-diff]', (v) => (this.difficulty = v));
        this.root.querySelector('[data-start]').addEventListener('click', () => this.start());

        await this.selectCountry(this.id, this.wantedYear);
    }

    bindSegment(sel, set) {
        const el = this.root.querySelector(sel);
        el.addEventListener('click', (e) => {
            const b = e.target.closest('[data-v]');
            if (!b) return;
            set(b.dataset.v);
            el.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
            this.renderBrief();
        });
    }

    renderList() {
        const ids = searchCountries(this.query, { limit: 300, filter: (id) => Boolean(db.countries[id]?.game) });
        const list = this.root.querySelector('[data-list]');
        list.innerHTML = ids
            .map((id) => {
                const rows = db.corridor.series[id];
                const last = corridorAt(id, rows[rows.length - 1][0]);
                const sel = id === this.id;
                return `<button type="button" role="option" aria-selected="${sel}" class="gs-item${sel ? ' selected' : ''}" data-id="${id}">
                    ${flagHTML(id)}<span class="grow">${esc(countryName(id))}</span>
                    <span class="mono tiny faint">${rows[0][0]}–${rows[rows.length - 1][0]}</span>
                    ${typeChip(last.type, { small: true, label: TYPES[last.type].short })}
                </button>`;
            })
            .join('') || '<div class="empty">Sonuç yok</div>';
        list.querySelector('.selected')?.scrollIntoView({ block: 'nearest' });
    }

    async selectCountry(id, wantedYear = null) {
        this.id = id;
        this.renderList();
        try {
            this.gameData = await loadGameCountry(id);
        } catch (error) {
            toast(`Oyun verisi yüklenemedi: ${error.message}`, { type: 'error' });
            return;
        }
        if (this.id !== id) return;
        this.years = Object.keys(this.gameData.years)
            .map(Number)
            .filter((y) => corridorAt(id, y, 0))
            .sort((a, b) => a - b);
        const slider = this.root.querySelector('[data-year-slider]');
        slider.min = 0;
        slider.max = this.years.length - 1;
        this.root.querySelector('[data-year-range]').textContent = `${this.years[0]}–${this.years[this.years.length - 1]}`;
        const target = wantedYear && this.years.includes(wantedYear) ? wantedYear : this.years[this.years.length - 1];
        this.renderYearChips();
        this.setYear(target);
    }

    renderYearChips() {
        const changes = typeChanges(this.id)
            .filter((c) => this.years.includes(c.year))
            .slice(-4)
            .reverse();
        const latest = this.years[this.years.length - 1];
        const chips = [{ year: latest, label: 'En güncel' }, ...changes.map((c) => ({ year: c.year, label: `${suffix(TYPES[c.to].short, 'e')} geçiş` }))];
        const seen = new Set();
        this.root.querySelector('[data-years]').innerHTML = chips
            .filter((c) => (seen.has(c.year) ? false : seen.add(c.year)))
            .map((c) => `<button type="button" class="gs-year" data-year="${c.year}"><span class="mono">${c.year}</span><span class="tiny faint">${c.label}</span></button>`)
            .join('');
    }

    setYear(year, { fromSlider = false } = {}) {
        this.year = year;
        if (!fromSlider) this.root.querySelector('[data-year-slider]').value = this.years.indexOf(year);
        this.root.querySelector('[data-year-val]').textContent = year;
        this.root.querySelectorAll('[data-year]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.year) === year)));
        replaceParams({ c: this.id, y: year });
        this.renderBrief();
    }

    renderBrief() {
        if (!this.gameData || !this.year) return;
        const p = corridorAt(this.id, this.year, 0);
        const T = TYPES[p.type];
        this.root.querySelector('[data-brief-title]').textContent = `${countryName(this.id)} · ${this.year}`;
        this.root.querySelector('[data-brief-type]').innerHTML = typeChip(p.type);

        this.chart.setPoints(corridorYear(this.year), { duration: 0 });
        this.chart.setEmphasis([this.id]);

        const s = this.gameData.years[String(this.year)]?.s;
        this.root.querySelector('[data-stake]').innerHTML = GROUPS.map((g, i) => {
            const [inf, sat] = s?.[i] || [0.5, 0.5];
            const color = sat < 0.3 ? 'var(--despotic)' : sat < 0.5 ? 'var(--paper)' : 'var(--shackled)';
            return `<div class="stake-row">
                <span class="stake-icon">${icon(STAKEHOLDERS[g].icon, 'icon-sm')}</span>
                <span class="stake-name">${STAKEHOLDERS[g].label}</span>
                <span class="meter grow" style="--m:${color}"><span style="width:${Math.round(sat * 100)}%"></span></span>
                <span class="mono tiny" style="width:36px;text-align:right">%${Math.round(sat * 100)}</span>
                <span class="mono tiny faint" title="Etki gücü" style="width:52px;text-align:right">etki ${Math.round(inf * 100)}</span>
            </div>`;
        }).join('');

        const goal =
            p.type === 'Shackled'
                ? `Ülke zaten Zincirlenmiş bölgede. Asıl sınav orada kalmak: ${this.turns} yıl boyunca devleti ve toplumu birlikte büyütün, güç odaklarını yönetin.`
                : `${this.turns} yıl içinde Zincirlenmiş bölgeye ulaşın ve orada kalın. Koridorda geçen her yıl puan kazandırır; darbe, devlet çöküşü ya da halk ayaklanması oyunu erken bitirir.`;
        this.root.querySelector('[data-goal]').innerHTML = `<strong>Hedef:</strong> ${esc(goal)} <span class="faint">${T.long}: ${T.formula}.</span>`;

        // Gerçek tarih: oyuncunun geçmeye çalışacağı ölçüt
        const hist = buildHistory(this.id, this.year, this.turns, this.gameData);
        const el = this.root.querySelector('[data-history]');
        if (!hist.length) {
            el.innerHTML = `<p class="tiny faint">${this.year} sonrası için gerçek veri yok; puanınız tarihle karşılaştırılmayacak.</p>`;
            return;
        }
        const total = hist.reduce((a, h) => a + h.pts, 0);
        const inC = hist.filter((h) => h.type === 'Shackled').length;
        el.innerHTML = `<div class="row" style="justify-content:space-between"><span class="eyebrow">Geçmeniz gereken tarih</span><span class="tiny faint">${hist[0].year}–${hist[hist.length - 1].year}</span></div>
            <div class="type-strip" role="img" aria-label="Gerçekte yıllara göre Leviathan tipi">${hist.map((h) => `<span class="t-${h.type}" title="${h.year}: ${TYPES[h.type].short}"></span>`).join('')}</div>
            <p class="small muted">Gerçekte ${countryName(this.id)} bu ${hist.length} yılın ${inC === 0 ? 'hiçbirinde koridorda değildi' : inC === hist.length ? 'tamamında koridordaydı' : `${inC} yılında koridordaydı`} ve aynı formülle <strong>${Math.round(total)} puan</strong> (yılda ${num(total / hist.length, 1)}) aldı.${hist.length < this.turns ? ` Veri ${hist[hist.length - 1].year}’te bittiği için yalnızca bu yıllar karşılaştırılır.` : ''}</p>`;
    }

    start() {
        startGame({ id: this.id, year: this.year, turns: this.turns, difficulty: this.difficulty });
    }

    unmount() {
        this.chart?.destroy();
    }
}
