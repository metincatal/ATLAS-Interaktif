/**
 * Oyunlar — üç oyunun giriş sayfası ve günün senaryosu
 */

import { icon } from '../../core/icons.js';
import { esc } from '../../core/dom.js';
import { db, loadCore, loadGameCountry, corridorAt, corridorYear, countryName, flagHTML } from '../../core/data.js';
import { TYPES, typeChip } from '../../core/theory.js';
import { num } from '../../core/format.js';
import { navigate, href, parseHash } from '../../core/router.js';
import { load } from '../../core/store.js';
import { CorridorChart } from '../../components/corridor-chart.js';
import { copyText, appURL } from '../../components/share.js';
import { toast } from '../../components/toast.js';
import { buildHistory } from './engine.js';
import { dailyScenario, dailyResult, dailyStreak, dayKey, dayLabel, signedInt } from './daily.js';
import { startDaily } from './start.js';
import { huntPuzzle, huntResult, huntStreak } from '../hunt/logic.js';

export async function mount(root, params) {
    // Eski bağlantılar (#/oyun?c=TUR&y=2002) kurulum ekranına gider
    if (params.c || params.y || params.country) {
        navigate('/oyun/denge', { c: params.c || params.country, y: params.y || params.year });
        return { unmount() {} };
    }
    await loadCore();
    const key = dayKey();
    const sc = dailyScenario(key, db.lastYear);
    const saved = load('game.current');
    const resume = saved && saved.v === 2 && saved.status === 'playing' ? saved : null;
    const duel = load('duel.current');
    const hunt = huntPuzzle(key);
    const huntDone = huntResult(hunt.key);

    root.innerHTML = `
        <div class="container hub">
            <header class="hub-head stack" style="gap:10px">
                <span class="eyebrow">Oyunlar</span>
                <h1 class="display-2">Dar koridoru oynayarak keşfedin</h1>
                <p class="lede" style="max-width:720px">Bir ülkeyi tek başınıza yönetin, bir arkadaşınıza karşı devleti ya da toplumu oynayın, ya da bir ülkeyi koridordaki rotasından tanıyın. Üç oyun da ${Object.keys(db.corridor.series).length} ülkenin ${db.firstYear}–${db.lastYear} verisini kullanır.</p>
            </header>

            <section class="card hub-daily" aria-labelledby="hub-daily-title" data-daily>
                <div class="hub-daily-copy stack" style="gap:12px">
                    <div class="row" style="gap:8px;flex-wrap:wrap"><span class="chip chip-sm hub-chip">${icon('calendar', 'icon-sm')}Günün senaryosu #${sc.number}</span><span class="tiny faint">${dayLabel(key)}</span></div>
                    <h2 class="display-2" id="hub-daily-title"><span class="row" style="gap:12px">${flagHTML(sc.id, 'flag-lg')}<span>${esc(countryName(sc.id))}, ${sc.year}</span></span></h2>
                    <p class="muted">${sc.turns} yıl · Dengeli · ${typeChip(corridorAt(sc.id, sc.year, 0)?.type, { small: true, label: `Başlangıç: ${TYPES[corridorAt(sc.id, sc.year, 0)?.type]?.short ?? '—'}` })}</p>
                    <p class="small muted" style="max-width:560px">Bugün herkes aynı ülke, aynı yıl ve aynı zarlarla oynuyor. Puanınız bu yılların gerçek tarihiyle karşılaştırılır; ilk denemeniz resmî sonucunuzdur.</p>
                    <div class="hub-history" data-history><span class="tiny faint">Gerçek tarih yükleniyor…</span></div>
                    <div class="hub-daily-actions" data-daily-actions></div>
                </div>
                <div class="hub-daily-chart" data-chart></div>
            </section>

            <div class="hub-grid">
                ${gameCard({
                    icon: 'scale',
                    kicker: 'Tek oyunculu strateji',
                    title: 'Özgürlük Dengesi',
                    text: 'Gerçek bir ülkenin başına gerçek bir yılda geçin. Sınırlı siyasi sermayeyle reformları sıralayın, güç odaklarını yatıştırın, krizleri yönetin; ülkeyi koridora taşıyıp orada tutun ve tarihi geçmeye çalışın.',
                    meta: ['197 ülke', '10–30 yıl', 'tarihe karşı puan'],
                    actions: `<a class="btn btn-primary btn-sm" href="#/oyun/denge">Ülke ve yıl seç${icon('arrowR', 'icon-sm')}</a>${resume ? `<a class="btn btn-ghost btn-sm" href="#/oyun/oyna">${icon('history', 'icon-sm')}Devam: ${esc(countryName(resume.id))} ${resume.year}</a>` : ''}`,
                })}
                ${gameCard({
                    icon: 'crown',
                    kicker: 'İki oyunculu düello',
                    title: 'Kızıl Kraliçe',
                    text: 'Biriniz Devlet, biriniz Toplum. Her tur gizlice hamle seçip aynı anda açıyorsunuz. Dengeyi kendi lehinize koridorun kenarına kadar zorlayın ama ülkeyi koridordan düşürmeyin: refah yalnızca koridorda birikir.',
                    meta: ['aynı cihazda iki kişi', 'yapay zekâya karşı', '15–25 dakika'],
                    actions: `<a class="btn btn-primary btn-sm" href="#/oyun/kizil-kralice">Düelloya başla${icon('arrowR', 'icon-sm')}</a>${duel && duel.status === 'playing' ? `<a class="btn btn-ghost btn-sm" href="#/oyun/kizil-kralice?devam=1">${icon('history', 'icon-sm')}Yarım kalan düello</a>` : ''}`,
                })}
                ${gameCard({
                    icon: 'compass',
                    kicker: 'Günlük bulmaca',
                    title: 'Leviathan Avı',
                    text: 'Adı gizlenmiş bir ülkenin iki yüzyıllık koridor rotası önünüzde. Her yanlış tahminde uzaklık, yön ve rotanın benzerliği ipucu olur. Altı tahminde ülkeyi bulun.',
                    meta: [`#${hunt.number}`, huntDone ? (huntDone.solved ? `bugün ${huntDone.guesses.length}/6` : 'bugün bulunamadı') : 'bugün oynanmadı', `seri ${huntStreak()}`],
                    actions: `<a class="btn btn-primary btn-sm" href="#/oyun/leviathan-avi">${huntDone ? 'Sonucu gör' : 'Bugünün ülkesini bul'}${icon('arrowR', 'icon-sm')}</a>`,
                })}
            </div>

            <section class="card card-pad hub-code" aria-labelledby="hub-code-title">
                <div class="stack" style="gap:4px">
                    <span class="card-title" id="hub-code-title"><span class="row" style="gap:8px">${icon('link', 'icon-sm')}Tekrar kodu</span></span>
                    <span class="small muted">Bir arkadaşınızın paylaştığı Özgürlük Dengesi bağlantısını ya da kodunu yapıştırın; oyun baştan oynatılır ve puan doğrulanır.</span>
                </div>
                <form class="row hub-code-form" data-code-form>
                    <label class="field grow"><span class="sr-only">Tekrar kodu ya da bağlantısı</span>${icon('link', 'icon-sm')}<input type="text" placeholder="2-TUR-2002-20-d-… ya da bağlantı" data-code autocomplete="off" spellcheck="false"></label>
                    <button class="btn btn-secondary" type="submit">Aç</button>
                </form>
            </section>
        </div>`;

    const chart = new CorridorChart(root.querySelector('[data-chart]'), { variant: 'mini', pointRadius: 2.4, baseOpacity: 0.28, interactive: false, ariaLabel: `${countryName(sc.id)} ${sc.year} konumu` });
    chart.setPoints(corridorYear(sc.year), { duration: 0 });
    chart.setEmphasis([sc.id]);

    renderDailyActions(root, sc);
    loadGameCountry(sc.id)
        .then((gd) => {
            const hist = buildHistory(sc.id, sc.year, sc.turns, gd);
            const total = hist.reduce((a, h) => a + h.pts, 0);
            const inC = hist.filter((h) => h.type === 'Shackled').length;
            root.querySelector('[data-history]').innerHTML = `<div class="type-strip" role="img" aria-label="Gerçekte yıllara göre Leviathan tipi">${hist.map((h) => `<span class="t-${h.type}" title="${h.year}: ${TYPES[h.type].short}"></span>`).join('')}</div>
                <p class="tiny faint">Gerçekte ${hist.length} yılın ${inC === 0 ? 'hiçbirinde koridorda değildi' : inC === hist.length ? 'tamamında koridordaydı' : `${inC} yılında koridordaydı`} · ${Math.round(total)} puan (yılda ${num(total / Math.max(1, hist.length), 1)}). Geçmeniz gereken ölçüt bu.</p>`;
        })
        .catch(() => {
            root.querySelector('[data-history]').innerHTML = '';
        });

    root.querySelector('[data-code-form]').addEventListener('submit', (e) => {
        e.preventDefault();
        const raw = root.querySelector('[data-code]').value.trim();
        if (!raw) return;
        let code = raw;
        let claimed = null;
        const hashAt = raw.indexOf('#');
        if (hashAt !== -1) {
            const { params } = parseHash(raw.slice(hashAt));
            code = params.k || '';
            claimed = params.p || null;
        }
        if (!code) {
            toast('Bağlantıda tekrar kodu bulunamadı.');
            return;
        }
        navigate('/oyun/tekrar', { k: code, p: claimed });
    });

    return {
        unmount() {
            chart.destroy();
        },
    };
}

function renderDailyActions(root, sc) {
    const el = root.querySelector('[data-daily-actions]');
    const result = dailyResult(sc.key);
    const streak = dailyStreak();
    if (!result) {
        el.innerHTML = `<div class="row" style="gap:10px;flex-wrap:wrap"><button class="btn btn-primary" type="button" data-play>${icon('play')}Günün senaryosunu oyna</button>${streak ? `<span class="small muted">${icon('award', 'icon-sm')} Seri: ${streak} gün</span>` : ''}</div>`;
    } else {
        const link = appURL(href('/oyun/tekrar', { k: result.code, p: result.score }));
        el.innerHTML = `<div class="hub-result">
                <div class="stack" style="gap:2px"><span class="tiny faint">Resmî sonucunuz</span><span class="serif hub-result-val ${result.margin === null ? '' : result.margin >= 0 ? 'pos' : 'neg'}">${result.margin === null ? result.score : `${signedInt(result.margin)}`}</span><span class="tiny faint">${result.margin === null ? 'puan' : 'tarihe karşı'} · not ${result.grade} · koridorda ${result.corridorYears} yıl</span></div>
                <div class="stack" style="gap:2px"><span class="tiny faint">Seri</span><span class="serif hub-result-val">${streak}</span><span class="tiny faint">gün</span></div>
            </div>
            <div class="row" style="gap:8px;flex-wrap:wrap">
                <a class="btn btn-secondary btn-sm" href="${href('/oyun/tekrar', { k: result.code, p: result.score })}">${icon('eye', 'icon-sm')}Tekrarını izle</a>
                <button class="btn btn-ghost btn-sm" type="button" data-copy>${icon('link', 'icon-sm')}Bağlantıyı kopyala</button>
                <button class="btn btn-ghost btn-sm" type="button" data-play>${icon('rotate', 'icon-sm')}Yeniden oyna (sayılmaz)</button>
            </div>`;
        el.querySelector('[data-copy]').addEventListener('click', () => copyText(link, 'Tekrar bağlantısı panoya kopyalandı.'));
    }
    el.querySelector('[data-play]').addEventListener('click', () => startDaily(sc.key));
}

function gameCard({ icon: ic, kicker, title, text, meta, actions }) {
    return `<article class="card hub-card">
        <div class="row" style="justify-content:space-between"><span class="entry-icon">${icon(ic)}</span><span class="eyebrow">${kicker}</span></div>
        <h2 class="title-1">${title}</h2>
        <p class="small muted">${text}</p>
        <div class="row hub-meta">${meta.map((m) => `<span>${esc(m)}</span>`).join('')}</div>
        <div class="row hub-actions">${actions}</div>
    </article>`;
}
