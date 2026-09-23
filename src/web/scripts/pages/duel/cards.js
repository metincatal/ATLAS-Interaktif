/**
 * Kızıl Kraliçe — duruşlar, sonuç matrisi, özel kartlar ve dönem olayları
 *
 * Kitaptaki Kızıl Kraliçe, devlet ile toplum arasındaki bir yarıştır: biri
 * güçlendikçe öteki de güçlenmek zorundadır. Burada iki oyuncu bu yarışın iki
 * tarafıdır. Her tur ikisi de gizlice bir duruş seçer; sonucu ikisinin
 * birleşimi belirler.
 */

export const SIDES = ['state', 'society'];

export const STANCES = {
    insa: { side: 'state', label: 'İnşa', verb: 'kapasite inşa etti', desc: 'Vergi, bürokrasi ve kamu hizmetlerine yatırım. Devleti büyütür.', cost: 0, icon: 'briefcase' },
    baski: { side: 'state', label: 'Baskı', verb: 'baskıya başvurdu', desc: 'Örgütlenmeyi zorla bastırır. Örgütlenen topluma karşı etkili, direnen topluma karşı geri teper. Meşruiyet kaybettirir.', cost: 3, icon: 'shield' },
    uzlasi: { side: 'state', label: 'Uzlaşı', verb: 'uzlaşma yolunu seçti', desc: 'Taviz verir, gücü paylaşır. Direnişi yatıştırır, meşruiyet kazandırır ama dengeyi topluma kaydırır.', cost: 1, icon: 'scale' },
    orgutlen: { side: 'society', label: 'Örgütlen', verb: 'örgütlendi', desc: 'Dernek, sendika ve ağlar kurar. Toplumu büyütür; baskıya karşı savunmasızdır.', cost: 0, icon: 'people' },
    direnc: { side: 'society', label: 'Direnç', verb: 'direndi', desc: 'Protesto, boykot, vergi direnişi. Baskıyı geri teptirir; inşa eden devlete karşı ise söner. Seferberlik harcar.', cost: 3, icon: 'bolt' },
    katil: { side: 'society', label: 'Katıl', verb: 'kurumlara katıldı', desc: 'Vergi öder, kurumları kullanır, hizmet talep eder. Devleti büyütür; karşılığında toplum o turun refahından fazladan pay ve seferberlik kaynağı alır.', cost: 0, icon: 'check' },
};

export const STATE_STANCES = ['insa', 'baski', 'uzlasi'];
export const SOCIETY_STANCES = ['orgutlen', 'direnc', 'katil'];

/**
 * Temel sonuç matrisi: [devletin gücündeki değişim, toplumun gücündeki değişim, meşruiyet].
 * Gerçek değişim konuma, güç odaklarına, kartlara ve olaylara göre ölçeklenir.
 */
export const MATRIX = {
    insa: {
        orgutlen: { dy: 0.11, dx: 0.1, legit: 0, text: 'Devlet büyürken toplum da örgütlendi: Kızıl Kraliçe koşusu. İkisi de güçlendi.' },
        direnc: { dy: 0.08, dx: 0.01, legit: 0, text: 'Devlet yatırımlarını sürdürdü; örgütsüz kalan direniş kısa sürede söndü.' },
        katil: { dy: 0.15, dx: 0.01, legit: 1, text: 'Toplum kurumlara katıldı, vergisini verdi; devlet hızla büyüdü.' },
    },
    baski: {
        orgutlen: { dy: 0.05, dx: -0.15, legit: -2, text: 'Yeni kurulan örgütler dağıtıldı; toplum ağır darbe aldı.' },
        direnc: { dy: -0.08, dx: -0.05, legit: -2, text: 'Baskı direnişle karşılaştı: Kızıl Kraliçe kontrolden çıktı, iki taraf da yıprandı.' },
        katil: { dy: 0.05, dx: -0.07, legit: -1, text: 'Uyum gösteren topluma karşı bile baskı uygulandı; sivil alan daraldı.' },
    },
    uzlasi: {
        orgutlen: { dy: -0.02, dx: 0.13, legit: 1, text: 'Devlet örgütlü topluma taviz verdi; denge topluma kaydı.' },
        direnc: { dy: -0.02, dx: 0.04, legit: 2, text: 'Uzlaşı direnişi yatıştırdı; gerilim düştü, toplum küçük bir kazanım elde etti.' },
        katil: { dy: 0.06, dx: 0.06, legit: 1, text: 'Uzlaşan devlet ile katılan toplum birlikte büyüdü.' },
    },
};

/**
 * Özel kartlar. Her kart bir duruşla (ya da her duruşla: 'any') oynanır.
 * apply(ctx): çözüm bağlamını değiştirir.
 *   ctx.mS / ctx.mT: duruşların etkisine çarpan (devlet / toplum hamlesi)
 *   ctx.dx, ctx.dy, ctx.legit, ctx.res.state / ctx.res.society, ctx.shift{merkez: ±}
 *   ctx.S / ctx.T: duruşlar, ctx.roll(): 0–1 (beklenen değerde 0.5)
 */
export const CARDS = {
    // ------------------------------------------------------------ Devlet
    vergi: { side: 'state', with: ['insa'], cost: 3, title: 'Vergi Reformu', desc: 'Bu tur İnşa’nın devlete etkisi 1,6 katına çıkar.', apply: (c) => (c.mSy *= 1.6) },
    liyakat: {
        side: 'state',
        with: ['insa'],
        cost: 2,
        title: 'Liyakatli Bürokrasi',
        desc: 'Devlet +0,05; meşruiyet +1.',
        apply: (c) => {
            c.dy += 0.05;
            c.legit += 1;
        },
    },
    hizmet: {
        side: 'state',
        with: ['insa'],
        cost: 3,
        title: 'Kamu Hizmeti Seferberliği',
        desc: 'Toplum Katıl’ı seçtiyse iki taraf da +0,05 ve meşruiyet +2; seçmediyse meşruiyet +1.',
        apply: (c) => {
            if (c.T === 'katil') {
                c.dy += 0.05;
                c.dx += 0.05;
                c.legit += 2;
            } else c.legit += 1;
        },
    },
    ohal: {
        side: 'state',
        with: ['baski'],
        cost: 3,
        title: 'Olağanüstü Hal',
        desc: 'Baskı 1,6 kat sert. Ordu devlete yaklaşır. Toplum direnirse kumar: ordu ya direnişi kırar ya da halka ateş açmayı reddeder.',
        apply: (c) => {
            c.mS *= 1.6;
            c.legit -= 1;
            c.shift.military = (c.shift.military || 0) + 1;
            if (c.T === 'direnc') {
                const p = c.centers.military >= 2 ? 0.65 : c.centers.military <= -2 ? 0.25 : 0.45;
                c.gamble = { p, win: { dx: -0.12 }, lose: { legit: -3, military: -2 } };
            }
        },
    },
    medya: {
        side: 'state',
        with: ['any'],
        cost: 2,
        title: 'Medya Denetimi',
        desc: 'Toplumun Örgütlen hamlesi bu tur yarı yarıya zayıflar. Uluslararası toplum topluma yaklaşır.',
        apply: (c) => {
            if (c.T === 'orgutlen') c.mTx *= 0.5;
            c.shift.international = (c.shift.international || 0) - 1;
        },
    },
    patronaj: {
        side: 'state',
        with: ['uzlasi'],
        cost: 3,
        title: 'Patronaj Ağları',
        desc: 'Ekonomik elit iki, dinî kurumlar bir adım devlete yaklaşır; toplum −0,04.',
        apply: (c) => {
            c.shift.elite = (c.shift.elite || 0) + 2;
            c.shift.religious = (c.shift.religious || 0) + 1;
            c.dx -= 0.04;
        },
    },
    taviz: {
        side: 'state',
        with: ['uzlasi'],
        cost: 2,
        title: 'Anayasal Taviz',
        desc: 'Meşruiyet +2; toplumun seferberliği −2 (taviz hareketi yatıştırır).',
        apply: (c) => {
            c.legit += 2;
            c.res.society -= 2;
        },
    },
    ordu: {
        side: 'state',
        with: ['any'],
        cost: 3,
        title: 'Orduya Ayrıcalık',
        desc: 'Ordu iki adım devlete yaklaşır.',
        apply: (c) => (c.shift.military = (c.shift.military || 0) + 2),
    },
    dis: {
        side: 'state',
        with: ['any'],
        cost: 3,
        title: 'Dış Destek',
        desc: 'Uluslararası toplum iki adım devlete yaklaşır; hazine +2.',
        apply: (c) => {
            c.shift.international = (c.shift.international || 0) + 2;
            c.res.state += 2;
        },
    },

    // ------------------------------------------------------------ Toplum
    sendika: {
        side: 'society',
        with: ['orgutlen'],
        cost: 3,
        title: 'Sendikal Örgütlenme',
        desc: 'Bu tur Örgütlen’in topluma etkisi 1,5 katına çıkar; sivil toplum topluma yaklaşır.',
        apply: (c) => {
            c.mTx *= 1.5;
            c.shift.civil = (c.shift.civil || 0) - 1;
        },
    },
    basin: {
        side: 'society',
        with: ['any'],
        cost: 2,
        title: 'Bağımsız Medya',
        desc: 'Devlet baskı yaparsa fazladan 1 meşruiyet kaybeder; yapmazsa toplum +0,02. Uluslararası toplum topluma yaklaşır.',
        apply: (c) => {
            if (c.S === 'baski') c.legit -= 1;
            else c.dx += 0.02;
            c.shift.international = (c.shift.international || 0) - 1;
        },
    },
    grev: {
        side: 'society',
        with: ['direnc'],
        cost: 4,
        title: 'Genel Grev',
        desc: 'Direniş 1,6 kat güçlü; ekonomik elit topluma yaklaşır. Baskıyla karşılaşırsa çatışma iki tarafı da fazladan yıpratır.',
        apply: (c) => {
            c.mT *= 1.6;
            c.shift.elite = (c.shift.elite || 0) - 1;
            if (c.S === 'baski') {
                c.dx -= 0.04;
                c.dy -= 0.04;
                c.legit -= 1;
            }
        },
    },
    itaatsizlik: {
        side: 'society',
        with: ['direnc'],
        cost: 2,
        title: 'Sivil İtaatsizlik',
        desc: 'Direnişin seferberlik bedeli geri gelir; devlet fazladan −0,03.',
        apply: (c) => {
            c.res.society += 2;
            c.dy -= 0.03;
        },
    },
    koalisyon: {
        side: 'society',
        with: ['katil'],
        cost: 3,
        title: 'Seçim Koalisyonu',
        desc: 'Toplum +0,05; sivil toplum topluma yaklaşır. Seçimler rejime de meşruiyet kazandırır (+1).',
        apply: (c) => {
            c.dx += 0.05;
            c.legit += 1;
            c.shift.civil = (c.shift.civil || 0) - 1;
        },
    },
    kampanya: {
        side: 'society',
        with: ['any'],
        cost: 3,
        title: 'Uluslararası Kampanya',
        desc: 'Uluslararası toplum iki adım topluma yaklaşır.',
        apply: (c) => (c.shift.international = (c.shift.international || 0) - 2),
    },
    cemaat: {
        side: 'society',
        with: ['orgutlen'],
        cost: 2,
        title: 'Dinî Cemaat Ağları',
        desc: 'Toplum +0,05, dinî kurumlar iki adım topluma yaklaşır; ama gelenekler devlet kapasitesini sınırlar (devlet −0,03): normlar kafesi.',
        apply: (c) => {
            c.dx += 0.05;
            c.dy -= 0.03;
            c.shift.religious = (c.shift.religious || 0) - 2;
        },
    },
    yerel: {
        side: 'society',
        with: ['katil', 'orgutlen'],
        cost: 3,
        title: 'Yerel Özyönetim',
        desc: 'Toplum +0,04, devlet −0,02: yetki yerele geçer.',
        apply: (c) => {
            c.dx += 0.04;
            c.dy -= 0.02;
        },
    },
    denetim: {
        side: 'society',
        with: ['katil'],
        cost: 2,
        title: 'Denetim Talebi',
        desc: 'Devlet İnşa ettiyse devlet +0,03 ve toplum +0,05 (zincirlenmiş büyüme); etmediyse toplum +0,02.',
        apply: (c) => {
            if (c.S === 'insa') {
                c.dy += 0.03;
                c.dx += 0.05;
            } else c.dx += 0.02;
        },
    },
};

export const STATE_DECK = Object.keys(CARDS).filter((k) => CARDS[k].side === 'state');
export const SOCIETY_DECK = Object.keys(CARDS).filter((k) => CARDS[k].side === 'society');

/**
 * Dönem olayları: her tur başında açılır, iki tarafı da etkiler.
 * mod(ctx) çözümden önce çalışır; start(g) tur başında bir kez uygulanır.
 */
export const EVENTS = [
    { id: 'sakin', title: 'Sakin bir dönem', text: 'Gündemde olağanüstü bir gelişme yok.', weight: 1.2 },
    {
        id: 'kriz',
        title: 'Küresel ekonomik kriz',
        text: 'İki tarafın da kaynakları daralır; İnşa bu tur %30 zayıf.',
        start: (g) => {
            g.res.state = Math.max(0, g.res.state - 2);
            g.res.society = Math.max(0, g.res.society - 1);
        },
        mod: (c) => {
            if (c.S === 'insa') c.mSy *= 0.7;
        },
    },
    {
        id: 'emtia',
        title: 'Emtia patlaması',
        text: 'Hazineye beklenmedik gelir akıyor (+3). Rant zengini devlet inşaya daha az istekli: İnşa %20 zayıf.',
        start: (g) => (g.res.state += 3),
        mod: (c) => {
            if (c.S === 'insa') c.mSy *= 0.8;
        },
    },
    {
        id: 'secim',
        title: 'Seçim yılı',
        text: 'Uzlaşı ve Katıl’ın etkisi 1,5 kat; baskı fazladan 1 meşruiyet kaybettirir.',
        mod: (c) => {
            if (c.S === 'uzlasi') c.mS *= 1.5;
            if (c.T === 'katil') c.mT *= 1.5;
            if (c.S === 'baski') c.legit -= 1;
        },
    },
    {
        id: 'dijital',
        title: 'Dijital dönüşüm',
        text: 'Sosyal ağlar örgütlenmeyi kolaylaştırır (Örgütlen %30 güçlü); gözetim teknolojileri baskıyı da güçlendirir (Baskı %20 sert).',
        mod: (c) => {
            if (c.T === 'orgutlen') c.mTx *= 1.3;
            if (c.S === 'baski') c.mS *= 1.2;
        },
    },
    {
        id: 'savas',
        title: 'Savaş tehdidi',
        text: 'Ordu devlete yaklaşır; savaş devlet inşa eder (İnşa %30 güçlü), bayrak etrafında kenetlenme direnişi zayıflatır (%30).',
        start: (g) => shiftCenter(g, 'military', 1),
        mod: (c) => {
            if (c.S === 'insa') c.mSy *= 1.3;
            if (c.T === 'direnc') c.mT *= 0.7;
        },
    },
    {
        id: 'afet',
        title: 'Büyük deprem',
        text: 'Güçlü bir devlet (devletin gücü 0’ın üstünde) kurtarmayla meşruiyet kazanır ve İnşa %30 güçlenir; zayıf devlette boşluğu toplum doldurur (Örgütlen %30 güçlü, meşruiyet −1).',
        mod: (c) => {
            if (c.y > 0) {
                if (c.S === 'insa') c.mSy *= 1.3;
                c.legit += 1;
            } else {
                if (c.T === 'orgutlen') c.mTx *= 1.3;
                c.legit -= 1;
            }
        },
    },
    {
        id: 'skandal',
        title: 'Yolsuzluk skandalı',
        text: 'Devlet 2 meşruiyet kaybeder; direniş %30 güçlü.',
        start: (g) => (g.legit = Math.max(0, g.legit - 2)),
        mod: (c) => {
            if (c.T === 'direnc') c.mT *= 1.3;
        },
    },
    {
        id: 'yardim',
        title: 'Dış yardım',
        text: 'Uluslararası toplumu yanında tutan taraf +3 kaynak alır; kimse tutmuyorsa iki taraf da +1.',
        start: (g) => {
            const lean = g.centers.international;
            if (lean >= 2) g.res.state += 3;
            else if (lean <= -2) g.res.society += 3;
            else {
                g.res.state += 1;
                g.res.society += 1;
            }
        },
    },
    {
        id: 'genclik',
        title: 'Gençlik hareketi',
        text: 'Yeni kuşak sokakta: toplum +2 seferberlik; Örgütlen %20 güçlü.',
        start: (g) => (g.res.society += 2),
        mod: (c) => {
            if (c.T === 'orgutlen') c.mTx *= 1.2;
        },
    },
    {
        id: 'salgin',
        title: 'Salgın',
        text: 'Kapasite önem kazanır: İnşa ve Katıl %30 güçlü, direniş %30 zayıf.',
        mod: (c) => {
            if (c.S === 'insa') c.mSy *= 1.3;
            if (c.T === 'katil') c.mT *= 1.3;
            if (c.T === 'direnc') c.mT *= 0.7;
        },
    },
    {
        id: 'anayasa',
        title: 'Anayasa tartışması',
        text: 'İki taraf aynı anda uzlaşır ya da birlikte koşarsa (Uzlaşı + Katıl ya da İnşa + Örgütlen) anayasal an: ikisi de fazladan +0,06.',
        mod: (c) => {
            if ((c.S === 'uzlasi' && c.T === 'katil') || (c.S === 'insa' && c.T === 'orgutlen')) {
                c.dx += 0.06;
                c.dy += 0.06;
            }
        },
    },
];

export const EVENT_BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

export const CENTERS = ['military', 'elite', 'civil', 'religious', 'international'];

export const CENTER_INFO = {
    military: { label: 'Ordu', icon: 'shield', state: 'Baskı %25 sert', society: 'Ordu halka ateş açmaz: baskı %40 zayıf' },
    elite: { label: 'Ekonomik elit', icon: 'briefcase', state: 'Hazine +2; İnşa %15 güçlü', society: 'Seferberlik +2; İnşa %10 zayıf' },
    civil: { label: 'Sivil toplum', icon: 'people', state: 'Örgütlen %20 zayıf (güdümlü sivil toplum)', society: 'Seferberlik +2; Örgütlen %20 güçlü' },
    religious: { label: 'Dinî kurumlar', icon: 'dome', state: 'Hazine +1; meşruiyet her tur +0,5', society: 'Seferberlik +1; ama devlet her tur −0,02 (normlar kafesi)' },
    international: { label: 'Uluslararası', icon: 'globe', state: 'Hazine +1', society: 'Seferberlik +1; baskı fazladan 1 meşruiyet kaybettirir' },
};

export function shiftCenter(g, key, by) {
    g.centers[key] = Math.max(-3, Math.min(3, g.centers[key] + by));
}

/** Güç odağını kim tutuyor: 'state' (≥ 2), 'society' (≤ −2) ya da null */
export function controller(lean) {
    if (lean >= 2) return 'state';
    if (lean <= -2) return 'society';
    return null;
}
