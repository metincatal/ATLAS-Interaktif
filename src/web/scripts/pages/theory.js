/**
 * Kuram sayfası
 */

import { icon } from '../core/icons.js';
import { esc } from '../core/dom.js';
import { db, loadCore, corridorYear, countryName, flagHTML } from '../core/data.js';
import { TYPES, TYPE_ORDER } from '../core/theory.js';
import { href } from '../core/router.js';
import { suffix } from '../core/format.js';

/** Her tipin küme merkezine en yakın ülkeler: tipin "tipik" örnekleri */
function examples(type, year, n = 4) {
    const [cx, cy] = db.corridor.centroids[type];
    return corridorYear(year)
        .filter((p) => p.type === type && p.exact)
        .map((p) => ({ ...p, d: Math.hypot(p.x - cx, p.y - cy) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, n);
}

export async function mount(root) {
    await loadCore();
    const year = db.lastYear;

    root.innerHTML = `
    <article class="theory container">
        <header class="th-hero">
            <span class="eyebrow">Kuram · yaklaşık 8 dakikalık okuma</span>
            <h1 class="display-1">Uluslar neden başarısız olur, özgürlük nasıl korunur?</h1>
            <p class="lede">Daron Acemoğlu ve James A. Robinson, refahın ve özgürlüğün kaynağını coğrafyada ya da kültürde değil, <strong>kurumlarda</strong> ve devlet ile toplum arasındaki güç dengesinde arar. 2024 Nobel Ekonomi Ödülü, kurumların nasıl oluştuğunu ve refahı nasıl etkilediğini inceleyen çalışmaları nedeniyle Simon Johnson’la birlikte onlara verildi.</p>
            <div class="th-books">
                ${book('Ulusların Düşüşü', 'Why Nations Fail', 2012, 'Güç, refah ve yoksulluğun kökenleri. Neden bazı ülkeler zengin, bazıları yoksul?')}
                ${book('Dar Koridor', 'The Narrow Corridor', 2019, 'Devletler, toplumlar ve özgürlüğün kaderi. Özgürlük nerede ve neden filizlenir?')}
            </div>
            <nav class="th-toc" aria-label="İçindekiler">
                <a href="#th-1">01 · Kurumlar</a><a href="#th-2">02 · Dar koridor</a><a href="#th-3">Kızıl Kraliçe</a><a href="#th-4">03 · Yöntem</a>
            </nav>
        </header>

        <section class="th-section" id="th-1" aria-labelledby="th-1-title">
            ${sectionHead('01', 'Ulusların Düşüşü', 'Kapsayıcı ve sömürücü kurumlar', 'th-1-title')}
            <p class="th-p">Kitabın merkezindeki soru basittir: Aynı coğrafyayı, benzer kültürleri paylaşan toplumlar neden bu kadar farklı refah düzeylerine ulaşır? Yazarların yanıtı, oyunun kurallarını belirleyen <em>kurumlardır</em>. Ekonomik kurumlar kimin neyi üretip neyi elinde tutabileceğini, siyasi kurumlar ise bu kuralları kimin koyduğunu belirler.</p>
            <div class="th-compare">
                ${colCard('Shackled', 'Kapsayıcı kurumlar', 'Toplumun büyük kesimini ekonomik ve siyasi hayata katar; yenilik ve yatırım için güvence verir.', ['Güvenceli mülkiyet hakları ve herkese eşit işleyen hukuk', 'Serbest giriş ve rekabet; yeteneğin karşılık bulduğu piyasalar', 'Geniş katılımlı, çoğulcu ve denetlenebilir siyasi güç'])}
                ${colCard('Despotic', 'Sömürücü kurumlar', 'Çoğunluğun ürettiğini azınlığa aktarır; elit, konumunu tehdit eden değişimi engeller.', ['Kaynakların dar bir elitin denetiminde toplanması', 'Tekeller, keyfî el koyma ve güvencesiz sözleşmeler', 'Hesap vermeyen, dar bir kesime dayanan siyasi güç'])}
            </div>
            <div class="th-concepts">
                ${concept('bolt', 'Yaratıcı yıkım', 'Yeni teknolojiler ve firmalar eskisinin yerini alır. Kapsayıcı kurumlar bunu mümkün kılar; sömürücü elitler kaybedecekleri için direnir.')}
                ${concept('history', 'Kritik kavşaklar', 'Salgın, savaş ya da ticaret şoku gibi büyük kırılmalar; küçük kurumsal farkların büyük tarihsel ayrışmalara dönüştüğü anlar.')}
                ${concept('shuffle', 'Erdemli ve kısır döngü', 'Kurumlar kendini yeniden üretme eğilimindedir: kapsayıcılık kapsayıcılığı, sömürü sömürüyü besler. Döngüyü kırmak zordur ama imkânsız değildir.')}
            </div>
        </section>

        <section class="th-section" id="th-2" aria-labelledby="th-2-title">
            ${sectionHead('02', 'Dar Koridor', 'Dar koridor ve dört Leviathan', 'th-2-title')}
            <p class="th-p">İkinci kitap, Hobbes’un devlet için kullandığı <em>Leviathan</em> imgesini ele alır. Özgürlük için hem güçlü bir devlete hem de onu dizginleyebilecek güçlü bir topluma ihtiyaç vardır. İkisinin birlikte güçlendiği alan dardır; yazarlar buna <strong>dar koridor</strong> der.</p>
            <div class="th-corridor">
                <figure class="th-diagram">
                    ${diagram()}
                    <figcaption class="tiny faint">Kavramsal şema, kitaptaki diyagramdan uyarlanmıştır. Veriye dayalı sürüm için <a href="#/koridor">Gözlemevi</a>’ne bakın.</figcaption>
                </figure>
                <div class="th-types" role="list">
                    ${TYPE_ORDER.map((t) => typeRow(t, year)).join('')}
                </div>
            </div>
        </section>

        <section class="th-section" id="th-3" aria-labelledby="th-3-title">
            <div class="card th-redqueen">
                <span class="rq-icon">${icon('corridor', 'icon-lg')}</span>
                <div class="stack" style="gap:10px">
                    <h2 class="title-1" id="th-3-title">Kızıl Kraliçe etkisi</h2>
                    <p class="th-p" style="margin:0"><em>Alice Aynanın İçinde</em>’ki Kızıl Kraliçe’nin dediği gibi: “Olduğun yerde kalabilmek için olabildiğince hızlı koşman gerekir.” Koridordaki devlet ve toplum yerinde kalabilmek için durmadan koşar. Devlet kapasitesini artırdıkça toplum da örgütlenip denetimini güçlendirir; toplum güçlendikçe devlet yeni görevler üstlenir.</p>
                    <p class="th-p" style="margin:0">Biri geride kalırsa ülke koridordan çıkar: toplum yetişemezse despotizme, devlet yetişemezse düzensizliğe kayılır. <a href="#/oyun/denge">Özgürlük Dengesi</a> oyunu bu dinamiğin üzerine kuruludur; <a href="#/oyun/kizil-kralice">Kızıl Kraliçe</a> düellosunda ise yarışın iki tarafını iki oyuncu oynar.</p>
                </div>
            </div>
        </section>

        <section class="th-section" id="th-4" aria-labelledby="th-4-title">
            ${sectionHead('03', 'Yöntem', 'Veriyi nasıl okuyoruz?', 'th-4-title')}
            <p class="th-p">Uygulamadaki her konum aynı dört adımlı yöntemle hesaplanır. Böylece 1850’deki Osmanlı İmparatorluğu ile ${suffix(year, 'de')}ki Türkiye aynı düzlemde okunabilir.</p>
            <ol class="th-steps">
                ${step('1', 'Göstergeler', '1996 sonrası: Dünya Bankası WGI’dan 5 yönetişim göstergesi (hukukun üstünlüğü, hükümet etkinliği, yolsuzluk kontrolü, düzenleyici kalite, siyasi istikrar) ve V-Dem’den 5 sivil alan göstergesi. 1789–1995: V-Dem’in 17 tarihî göstergesi.')}
                ${step('2', 'Yıllık standartlaştırma', 'Her gösterge her yıl kendi içinde z-puanına çevrilir. Konumlar, o yılın dünya ortalamasına göre görelidir.')}
                ${step('3', 'Faktör analizi', 'Varimax rotasyonlu iki faktör çıkarılır: yönetişim göstergelerinden “devletin gücü”, sivil alan göstergelerinden “toplumun gücü”.')}
                ${step('4', 'Kümeleme', 'Tüm ülke-yıllar üzerinde K-ortalamalar (k = 4). Kümeler merkezlerine göre dört Leviathan tipine eşlenir; grafikteki bölgeler bu kümelerin sınırlarıdır.')}
            </ol>
            <div class="th-caveat">
                ${icon('warning')}
                <p class="small muted"><strong>Göreli ölçek ve yorum uyarısı.</strong> Bir ülke hiçbir şey değiştirmeden de, başkaları ilerlediği için geriye düşmüş görünebilir. Leviathan tipleri kitabın kavramlarının veriye dayalı bir yorumudur; yazarların kendi ülke sınıflandırması değildir. Veri hattı ve analiz defterleri projenin <a href="https://github.com/metincatal/ATLAS-Interaktif" target="_blank" rel="noopener">kaynak kodunda</a> açıktır.</p>
            </div>
        </section>

        <section class="th-section th-cta">
            <h2 class="display-2">Kuramdan veriye</h2>
            <div class="th-cta-grid">
                <a class="home-entry card" href="#/atlas"><span class="entry-icon">${icon('globe')}</span><span class="title-2">Atlas’ı aç</span><span class="small muted">Ülkeleri harita üzerinde yıl yıl inceleyin.</span></a>
                <a class="home-entry card" href="#/koridor"><span class="entry-icon">${icon('corridor')}</span><span class="title-2">Gözlemevi</span><span class="small muted">Zamanı oynatıp ülkelerin rotasını izleyin.</span></a>
                <a class="home-entry card" href="#/oyun"><span class="entry-icon">${icon('scale')}</span><span class="title-2">Oyunlar</span><span class="small muted">Kızıl Kraliçe’yi kendiniz deneyimleyin: tek başınıza, bir arkadaşınıza karşı ya da günlük bulmacada.</span></a>
            </div>
        </section>

        <section class="th-section th-sources" aria-labelledby="th-src">
            <span class="eyebrow" id="th-src">Kaynaklar</span>
            <ol>
                <li>Acemoglu, D. &amp; Robinson, J. A. (2012). <em>Why Nations Fail: The Origins of Power, Prosperity, and Poverty.</em> Crown. Türkçe baskısı: <em>Ulusların Düşüşü</em>.</li>
                <li>Acemoglu, D. &amp; Robinson, J. A. (2019). <em>The Narrow Corridor: States, Societies, and the Fate of Liberty.</em> Penguin Press. Türkçe baskısı: <em>Dar Koridor</em>.</li>
                <li>Coppedge, M. vd. (2025). <em>V-Dem Country-Year Dataset v15.</em> Varieties of Democracy Project.</li>
                <li>Kaufmann, D. &amp; Kraay, A. <em>Worldwide Governance Indicators.</em> Dünya Bankası.</li>
            </ol>
        </section>
    </article>`;

    // Tip satırları ile şema arasında karşılıklı vurgu
    const diagramEl = root.querySelector('.th-diagram svg');
    const setActive = (t) => {
        diagramEl.dataset.active = t || '';
        root.querySelectorAll('.th-type').forEach((row) => row.classList.toggle('active', row.dataset.type === t));
    };
    root.querySelectorAll('.th-type').forEach((row) => {
        row.addEventListener('mouseenter', () => setActive(row.dataset.type));
        row.addEventListener('focusin', () => setActive(row.dataset.type));
        row.addEventListener('mouseleave', () => setActive(null));
    });
    root.querySelectorAll('[data-region]').forEach((g) => {
        g.addEventListener('mouseenter', () => setActive(g.dataset.region));
        g.addEventListener('mouseleave', () => setActive(null));
    });
    // İçindekiler bağlantıları hash yönlendiricisini tetiklemesin
    root.querySelectorAll('.th-toc a, .th-section a[href^="#th-"]').forEach((a) =>
        a.addEventListener('click', (e) => {
            e.preventDefault();
            root.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }),
    );

    return { unmount() {} };
}

function sectionHead(num, kicker, title, id) {
    return `<div class="th-head"><div class="row" style="gap:12px"><span class="mono tiny faint">${num}</span><span class="th-rule"></span><span class="eyebrow">${kicker}</span></div><h2 class="display-2" id="${id}">${title}</h2></div>`;
}

function book(title, en, year, desc) {
    return `<div class="th-book card"><div class="th-cover serif">${title}</div><div class="stack" style="gap:4px"><span class="title-2">${title}</span><span class="tiny faint"><em>${en}</em> · ${year}</span><span class="small muted">${desc}</span></div></div>`;
}

function colCard(t, title, lede, items) {
    return `<div class="card th-col t-${t}">
        <div class="row"><span class="swatch" style="border-radius:50%"></span><h3 class="title-2">${title}</h3></div>
        <p class="small muted">${lede}</p>
        <ul>${items.map((i) => `<li>${icon('check', 'icon-sm')}<span>${i}</span></li>`).join('')}</ul>
    </div>`;
}

function concept(ic, title, text) {
    return `<div class="th-concept"><span class="th-concept-icon">${icon(ic)}</span><h3 class="title-2">${title}</h3><p class="small muted">${text}</p></div>`;
}

function step(n, title, text) {
    return `<li class="th-step card"><span class="th-step-num mono">${n}</span><h3>${title}</h3><p class="small muted">${text}</p></li>`;
}

function typeRow(t, year) {
    const T = TYPES[t];
    const ex = examples(t, year);
    return `<div class="th-type t-${t}" data-type="${t}" role="listitem" tabindex="0">
        <span class="th-type-bar"></span>
        <div class="stack" style="gap:6px">
            <div class="row" style="gap:10px;flex-wrap:wrap"><span class="title-2" style="color:var(--t-text)">${T.long}</span><span class="tiny faint"><em>${T.en}</em> · ${T.formula}</span></div>
            <p class="small muted">${T.desc}</p>
            <div class="th-examples"><span class="tiny faint">${year} verisinde tipik örnekler:</span>${ex
                .map((p) => `<a class="th-ex" href="${href('/atlas', { c: p.id, y: year })}">${flagHTML(p.id)}${esc(countryName(p.id, { short: true }))}</a>`)
                .join('')}</div>
            <span class="tiny faint">${T.example}</span>
        </div>
    </div>`;
}

function diagram() {
    const T = TYPES;
    return `<svg viewBox="0 0 560 460" role="img" aria-label="Dar koridor kavramsal şeması: dikey eksende devletin gücü, yatay eksende toplumun gücü; köşegen boyunca uzanan dar koridor ve dört Leviathan bölgesi" data-active="">
        <rect width="560" height="460" rx="14" fill="#10141B"/>
        <g data-region="Despotic" class="dg-region"><path d="M62 398 L62 40 L500 40 L500 44 C460 58 420 80 380 110 C330 150 280 190 230 245 C190 290 150 330 62 398 Z" fill="${T.Despotic.color}" fill-opacity="0.07"/></g>
        <g data-region="Absent" class="dg-region"><path d="M62 398 C170 380 225 345 270 290 C310 240 350 200 400 162 C440 130 480 108 530 88 L530 398 Z" fill="${T.Absent.color}" fill-opacity="0.07"/></g>
        <g data-region="Paper" class="dg-region"><ellipse cx="118" cy="362" rx="70" ry="40" fill="${T.Paper.color}" fill-opacity="0.12"/></g>
        <g data-region="Shackled" class="dg-region"><path d="M62 398 C150 330 190 290 230 245 C280 190 330 150 380 110 C420 80 460 58 500 44 L520 92 C480 108 440 130 400 162 C350 200 310 240 270 290 C225 345 170 380 62 398 Z" fill="${T.Shackled.color}" fill-opacity="0.2"/>
            <path d="M62 398 C150 330 190 290 230 245 C280 190 330 150 380 110 C420 80 460 58 500 44" fill="none" stroke="${T.Shackled.color}" stroke-width="1.6"/>
            <path d="M62 398 C170 380 225 345 270 290 C310 240 350 200 400 162 C440 130 480 108 520 92" fill="none" stroke="${T.Shackled.color}" stroke-width="1.6"/></g>
        <path d="M60 400 L60 36" stroke="#B4AEA4" stroke-width="1.4"/><path d="M60 400 L534 400" stroke="#B4AEA4" stroke-width="1.4"/>
        <path d="M54 48 L60 36 L66 48" fill="none" stroke="#B4AEA4" stroke-width="1.4"/><path d="M522 394 L534 400 L522 406" fill="none" stroke="#B4AEA4" stroke-width="1.4"/>
        <path d="M150 300 C180 260 210 225 240 205" fill="none" stroke="#B4AEA4" stroke-width="1.3" stroke-dasharray="4 5"/><path d="M233 202 L243 203 L238 212" fill="none" stroke="#B4AEA4" stroke-width="1.3"/>
        <path d="M300 340 C340 350 380 350 420 340" fill="none" stroke="#B4AEA4" stroke-width="1.3" stroke-dasharray="4 5"/><path d="M411 334 L421 340 L412 347" fill="none" stroke="#B4AEA4" stroke-width="1.3"/>
        <path d="M296 208 C326 173 356 153 396 133" fill="none" stroke="#EDE8DF" stroke-width="1.5"/><path d="M387 129 L398 132 L392 142" fill="none" stroke="#EDE8DF" stroke-width="1.5"/>
        <text x="306" y="238" fill="#EDE8DF" font-size="12" transform="rotate(-37 306 238)">Kızıl Kraliçe: birlikte koşmak</text>
        <g class="dg-label"><text x="92" y="108" fill="${T.Despotic.text}" font-family="Newsreader, serif" font-size="22" font-style="italic">Despotik</text><text x="92" y="127" fill="#8A847A" font-size="12">devlet ≫ toplum</text></g>
        <g class="dg-label"><text x="444" y="74" fill="${T.Shackled.text}" font-family="Newsreader, serif" font-size="22" font-style="italic" text-anchor="end">Zincirlenmiş</text></g>
        <g class="dg-label"><text x="500" y="318" fill="${T.Absent.text}" font-family="Newsreader, serif" font-size="22" font-style="italic" text-anchor="end">Namevcut</text><text x="500" y="337" fill="#8A847A" font-size="12" text-anchor="end">toplum ≫ devlet</text></g>
        <g class="dg-label"><text x="76" y="352" fill="${T.Paper.text}" font-family="Newsreader, serif" font-size="22" font-style="italic">Kâğıttan</text><text x="76" y="371" fill="#8A847A" font-size="12">ikisi de zayıf</text></g>
        <text x="534" y="430" fill="#B4AEA4" font-size="13" text-anchor="end">Toplumun gücü →</text>
        <text transform="translate(38 40) rotate(-90)" fill="#B4AEA4" font-size="13" text-anchor="end">Devletin gücü →</text>
    </svg>`;
}
