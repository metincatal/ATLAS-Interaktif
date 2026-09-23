/**
 * Özgürlük Dengesi — olay destesi
 *
 * Olaylar genel senaryolardır; gerçek bir ülkenin belirli bir tarihî olayını
 * anlatmazlar. Her seçeneğin etkisi (effects) sabit ya da duruma bağlı olabilir.
 * risk: başarı olasılığı olan seçenekler; başarısızlık oyunu bitirebilir.
 */

const S = (s) => s.stake;

export const EVENTS = [
    {
        id: 'finans',
        title: 'Küresel finans krizi',
        text: 'Dış piyasalardaki çöküş ihracatı ve istihdamı vuruyor. İş dünyası kurtarma paketi, sendikalar sosyal koruma istiyor.',
        weight: () => 1,
        choices: [
            { label: 'Bankaları kurtar, bütçeyi sıkılaştır', effects: { dState: 0.04, stake: { elite: 0.08, civil: -0.08 }, capital: -5 }, result: 'Bankacılık sistemi ayakta kaldı, ancak işsizlik ve öfke arttı.' },
            { label: 'Sosyal koruma paketi açıkla', effects: { dSociety: 0.05, stake: { civil: 0.08, elite: -0.05 }, capital: -18 }, result: 'Hanehalkları korundu; bütçe açığı ve iş dünyasının kaygısı büyüdü.' },
        ],
    },
    {
        id: 'protesto',
        title: 'Kitlesel protestolar',
        text: 'Başkentte on binler hükümeti daha fazla hesap vermeye çağırıyor. Gösteriler her gün büyüyor.',
        weight: (s) => (S(s).civil.sat < 0.45 || s.y - s.x > 0.8 ? 2.2 : 0.5),
        choices: [
            { label: 'Müzakere masası kur', effects: { dSociety: 0.1, stake: { military: -0.04, civil: 0.08 }, capital: -10 }, result: 'Protesto liderleriyle bir reform takvimi üzerinde anlaşıldı.' },
            { label: 'Gösterileri yasakla', effects: { dSociety: -0.15, dState: 0.03, stake: { military: 0.04, civil: -0.12, international: -0.06 } }, result: 'Meydanlar boşaltıldı; öfke ise yeraltına çekildi.' },
        ],
    },
    {
        id: 'uyari',
        title: 'Ordudan sert uyarı',
        text: 'Genelkurmay, son reformların güvenliği zayıflattığını açıklayarak hükümete geri adım atma çağrısı yaptı.',
        cond: (s) => S(s).military.inf > 0.38,
        weight: (s) => (S(s).military.sat < 0.4 ? 2.4 : 0.4),
        choices: [
            { label: 'Sivil otoriteyi savun', effects: { dSociety: 0.1, stake: { military: -0.12, international: 0.06, civil: 0.05 } }, result: 'Hükümet geri adım atmadı; sivil denetim güçlendi ama kışlada gerginlik yükseldi.' },
            { label: 'Uzlaş, reformları yavaşlat', effects: { dSociety: -0.08, stake: { military: 0.12 }, capital: -8 }, result: 'Ordu yatıştı; reform gündemi ise askıya alındı.' },
        ],
    },
    {
        id: 'deprem',
        title: 'Büyük deprem',
        text: 'Yoğun nüfuslu bir bölgede yıkıcı bir deprem oldu. Kurtarma ve barınma için hızlı karar gerekiyor.',
        once: true,
        weight: () => 0.7,
        choices: [
            {
                label: 'Merkezî kriz yönetimi',
                effects: (s) => (s.y > 0 ? { dState: 0.08, stake: { civil: 0.04 }, capital: -15 } : { dState: -0.05, stake: { civil: -0.08 }, capital: -15 }),
                result: (s) => (s.y > 0 ? 'Devlet kurumları hızla sahaya indi; güven arttı.' : 'Zayıf kurumlar yavaş kaldı; devlete güven sarsıldı.'),
            },
            { label: 'Yerel dayanışma ağlarını destekle', effects: { dSociety: 0.08, dState: -0.02, stake: { civil: 0.06 }, capital: -8 }, result: 'Yerel örgütler ve gönüllüler yükü sırtladı; toplum güçlendi.' },
        ],
    },
    {
        id: 'emtia',
        title: 'Emtia fiyatlarında patlama',
        text: 'İhraç ettiğiniz hammaddelerin fiyatı iki katına çıktı. Hazineye beklenmedik bir gelir akıyor.',
        weight: () => 0.9,
        choices: [
            { label: 'Varlık fonu kur, kurallara bağla', effects: { dState: 0.06, stake: { international: 0.04, elite: -0.03 } }, result: 'Gelir şeffaf bir fonda biriktirildi.' },
            { label: 'Gelirleri seçmenlere dağıt', effects: { dState: -0.04, stake: { elite: 0.04, civil: 0.03 }, capital: 20 }, result: 'Kısa vadeli bir refah dalgası yaşandı; kurumlar ise ihmal edildi.' },
        ],
    },
    {
        id: 'skandal',
        title: 'Yolsuzluk skandalı',
        text: 'Bakanlıklardan birinde büyük bir ihale yolsuzluğu ortaya çıktı. Belgeler basına sızdı.',
        cond: (s) => s.y < 1,
        weight: () => 1.1,
        choices: [
            { label: 'Bağımsız soruşturma başlat', effects: { dState: 0.06, dSociety: 0.05, stake: { elite: -0.1, civil: 0.04 }, capital: -12 }, result: 'Soruşturma üst düzey isimlere uzandı; hukuk devletine güven arttı.' },
            { label: 'Örtbas et', effects: { dSociety: -0.07, stake: { elite: 0.06, international: -0.05 }, capital: 6 }, result: 'Skandal kapatıldı; ama herkes ne olduğunu biliyor.' },
        ],
    },
    {
        id: 'secim',
        title: 'Seçim takvimi',
        text: 'Görev süreniz doluyor. Seçimi zamanında ve bağımsız gözlemcilerle yapmak ister misiniz?',
        cond: (s) => s.turn >= 3 && s.turn - (s.lastElection ?? -10) >= 4 && s.x > -1.8,
        weight: () => 2.5,
        onChoose: (s) => {
            s.lastElection = s.turn;
        },
        choices: [
            {
                label: 'Serbest ve adil seçim',
                effects: (s) => ({ dSociety: 0.1, stake: { international: 0.05 }, capital: S(s).civil.sat < 0.4 ? -20 : 10 }),
                result: (s) => (S(s).civil.sat < 0.4 ? 'Seçim temiz geçti ama sandıktan zayıf çıktınız; koalisyon kurmak pahalıya patladı.' : 'Seçim temiz geçti ve güçlü bir yetkiyle döndünüz.'),
            },
            { label: 'Seçimi ertele', effects: { dSociety: -0.2, dState: 0.02, stake: { international: -0.1, civil: -0.1 }, capital: 15 }, result: 'Seçim “istikrar” gerekçesiyle ertelendi; meşruiyetiniz aşındı.' },
        ],
    },
    {
        id: 'salgin',
        title: 'Salgın hastalık',
        text: 'Hızla yayılan bir salgın hastaneleri zorluyor. Bilim kurulu sert önlemler öneriyor.',
        once: true,
        weight: () => 0.6,
        choices: [
            { label: 'Sıkı karantina uygula', effects: { dState: 0.06, dSociety: -0.05, stake: { elite: -0.05 }, capital: -10 }, result: 'Salgın kontrol altına alındı; ekonomik ve toplumsal bedeli ağır oldu.' },
            { label: 'Gönüllü önlemlere güven', effects: { dSociety: 0.03, dState: -0.05, stake: { religious: 0.03, elite: 0.03 } }, result: 'Hayat devam etti ama kayıplar yüksek oldu.' },
        ],
    },
    {
        id: 'sinir',
        title: 'Sınır çatışması',
        text: 'Komşu ülkeyle tartışmalı bir sınır bölgesinde çatışma çıktı.',
        weight: () => 0.8,
        choices: [
            { label: 'Diplomasi ve arabuluculuk', effects: { stake: { international: 0.08, military: -0.06 } }, result: 'Uluslararası arabuluculukla ateşkes sağlandı.' },
            { label: 'Seferberlik ilan et', effects: { dState: 0.05, dSociety: -0.06, stake: { military: 0.12 }, capital: -10 }, result: 'Ordu sınıra yığıldı; olağanüstü önlemler gündelik hayata sızdı.' },
        ],
    },
    {
        id: 'borc',
        title: 'Dış borç krizi',
        text: 'Hazine borçlarını çeviremiyor. Uluslararası kuruluşlar sıkı koşullarla kredi öneriyor.',
        cond: (s) => s.capital.current < 35 || s.y < -0.5,
        weight: () => 1.6,
        choices: [
            { label: 'Kredi koşullarını kabul et', effects: { dState: 0.07, stake: { international: 0.12, civil: -0.08 }, capital: 20 }, result: 'Kemer sıkma başladı; kamu maliyesi disipline girdi.' },
            { label: 'Reddet, kendi yolunu çiz', effects: { stake: { international: -0.08, elite: -0.04 }, capital: -5 }, result: 'Bağımsızlık korundu ama finansman kaynakları kurudu.' },
        ],
    },
    {
        id: 'grev',
        title: 'Genel grev çağrısı',
        text: 'Sendikalar ücretler ve çalışma koşulları için ülke çapında greve gidiyor.',
        cond: (s) => S(s).civil.inf > 0.42,
        weight: () => 1,
        choices: [
            { label: 'Toplu sözleşme masası kur', effects: { dSociety: 0.06, stake: { civil: 0.1, elite: -0.06 }, capital: -8 }, result: 'İşçi ve işveren örgütleri ortak bir protokole imza attı.' },
            { label: 'Grevi yasakla', effects: { dSociety: -0.12, stake: { civil: -0.14, elite: 0.06 } }, result: 'Üretim sürdü; örgütlü emek ise geriletildi.' },
        ],
    },
    {
        id: 'dintalep',
        title: 'Dinî liderlerden anayasa talebi',
        text: 'Etkili dinî liderler, anayasada daha fazla dinî referans istiyor.',
        cond: (s) => S(s).religious.inf > 0.42,
        weight: () => 0.8,
        choices: [
            { label: 'Ortak zemin ara', effects: { dSociety: 0.02, stake: { religious: 0.08, international: -0.02 } }, result: 'Uzun bir istişare sürecinden uzlaşmacı bir metin çıktı.' },
            { label: 'Mevcut çizgide ısrar et', effects: { stake: { religious: -0.12, international: 0.04 } }, result: 'Talep reddedildi; dinî çevrelerde hoşnutsuzluk büyüdü.' },
        ],
    },
    {
        id: 'medyayukselis',
        title: 'Bağımsız medyanın yükselişi',
        text: 'Yeni bağımsız yayın organları hükümeti sert biçimde eleştiriyor ve büyük ilgi görüyor.',
        cond: (s) => s.x > -0.9,
        weight: () => 0.9,
        choices: [
            { label: 'Eleştiriyi kabullen', effects: { dSociety: 0.1, stake: { military: -0.03, elite: -0.02 } }, result: 'Basın özgürlüğü kökleşti; hükümet daha dikkatli davranmaya başladı.' },
            { label: 'Yayın lisanslarını kısıtla', effects: { dSociety: -0.12, stake: { civil: -0.05 }, capital: 8 }, result: 'Eleştirel yayınların çoğu kapandı.' },
        ],
    },
    {
        id: 'ayaklanma',
        title: 'Taşrada silahlı ayaklanma',
        text: 'Merkezî otoritenin zayıf olduğu bir bölgede silahlı gruplar kontrolü ele geçirdi.',
        cond: (s) => s.y < -0.3,
        weight: () => 1.4,
        choices: [
            { label: 'Güvenlik operasyonu', effects: { dState: 0.1, dSociety: -0.06, stake: { military: 0.06 }, capital: -10 }, result: 'Devlet otoritesi bölgede yeniden kuruldu.' },
            { label: 'Özerklik müzakeresi', effects: { dSociety: 0.08, dState: -0.06, stake: { military: -0.05 } }, result: 'Bölgeye geniş özerklik tanındı; merkez ise zayıfladı.' },
        ],
    },
    {
        id: 'teknoloji',
        title: 'Teknoloji ve girişim dalgası',
        text: 'Genç girişimciler yeni teknolojilerle köklü şirketlere meydan okuyor.',
        cond: (s) => s.x > -0.6 && s.y > -0.6,
        weight: () => 0.9,
        choices: [
            { label: 'Rekabete aç', effects: { dSociety: 0.06, dState: 0.04, stake: { elite: -0.06, international: 0.03 } }, result: 'Yaratıcı yıkım başladı: yeni firmalar büyüdü, eski tekeller geriledi.' },
            { label: 'Yerli tekelleri koru', effects: { dSociety: -0.04, dState: -0.02, stake: { elite: 0.1 } }, result: 'Köklü şirketler rahatladı; yenilik yavaşladı.' },
        ],
    },
    {
        id: 'yaptirim',
        title: 'Dış yaptırım tehdidi',
        text: 'Başlıca ticaret ortaklarınız insan hakları sicilinizi gerekçe göstererek yaptırım hazırlığında.',
        cond: (s) => S(s).international.sat < 0.35,
        weight: () => 1.8,
        choices: [
            { label: 'Uyum reformları', effects: { dSociety: 0.06, stake: { international: 0.12, military: -0.04 }, capital: -8 }, result: 'Yaptırımlar askıya alındı.' },
            { label: 'Direnç göster', effects: { dState: -0.04, stake: { military: 0.06, international: -0.1 }, capital: -8 }, result: 'Yaptırımlar yürürlüğe girdi; ekonomi daraldı.' },
        ],
    },
    {
        id: 'goc',
        title: 'Mülteci akını',
        text: 'Komşu ülkedeki savaştan kaçan yüz binlerce insan sınıra dayandı.',
        weight: () => 0.8,
        choices: [
            { label: 'Kapıları aç, destek iste', effects: { dState: 0.02, stake: { international: 0.1, civil: 0.03, religious: -0.02 }, capital: -10 }, result: 'Uluslararası destekle kamplar kuruldu.' },
            { label: 'Sınırları kapat', effects: { dSociety: -0.03, stake: { international: -0.06, military: 0.04 } }, result: 'Sınır kapatıldı; insani kriz sınırın öte yanında büyüdü.' },
        ],
    },
    {
        id: 'universite',
        title: 'Üniversite özerkliği tartışması',
        text: 'Akademisyenler, rektör atamalarında söz hakkı ve bilimsel özerklik talep ediyor.',
        cond: (s) => s.x > -1.3,
        weight: () => 0.7,
        choices: [
            { label: 'Özerkliği genişlet', effects: { dSociety: 0.07, stake: { civil: 0.04, religious: -0.03 } }, result: 'Üniversiteler kendi yöneticilerini seçmeye başladı.' },
            { label: 'Rektörleri atamayla belirle', effects: { dSociety: -0.08, dState: 0.02, capital: 5 }, result: 'Kampüslerde denetim sıkılaştı.' },
        ],
    },
];

/** Güç odaklarının öfkesinden doğan zorunlu krizler */
export const CRISES = {
    military: {
        id: 'darbe',
        title: 'Darbe girişimi',
        text: 'Tanklar başkentin sokaklarında. Bir grup subay yönetime el koyduğunu açıkladı.',
        crisis: true,
        choices: [
            {
                label: 'Halkı ve kurumları direnişe çağır',
                risk: {
                    chance: (s) => Math.min(0.92, 0.3 + 0.45 * S(s).civil.sat + (s.x > 0 ? 0.15 : 0) + 0.1 * S(s).international.sat),
                    success: { effects: { dSociety: 0.1, stake: { military: 0.12, civil: 0.08 } }, influence: { military: -0.15 }, result: 'Darbe girişimi halkın ve kurumların direnişiyle püskürtüldü.' },
                    fail: { gameOver: 'coup', result: 'Direniş kırıldı; ordu yönetime el koydu.' },
                },
            },
            { label: 'Ordunun taleplerine boyun eğ', effects: { dSociety: -0.18, dState: 0.04, stake: { military: 0.3 }, capital: -20 }, influence: { military: 0.05 }, result: 'Hükümet ayakta kaldı ama sivil denetim ağır yara aldı.' },
        ],
    },
    civil: {
        id: 'isyan',
        title: 'Halk ayaklanması',
        text: 'Ülkenin dört bir yanında milyonlar sokakta. Hükümet binaları kuşatılmış durumda.',
        crisis: true,
        choices: [
            { label: 'Yapısal reform sözü ver', effects: { dSociety: 0.15, dState: -0.08, stake: { civil: 0.25, elite: -0.1 }, capital: -25 }, result: 'Kapsamlı bir reform paketi açıklandı; kalabalıklar dağıldı.' },
            {
                label: 'Sert müdahale',
                risk: {
                    chance: (s) => Math.max(0.15, 0.45 + 0.3 * S(s).military.sat - (s.x > 0.5 ? 0.25 : 0)),
                    success: { effects: { dSociety: -0.25, dState: 0.04, stake: { civil: 0.05, international: -0.12 } }, influence: { civil: -0.15 }, result: 'Ayaklanma bastırıldı; bedeli uzun yıllar ödenecek.' },
                    fail: { gameOver: 'revolution', result: 'Güvenlik güçleri halka ateş açmayı reddetti; hükümet devrildi.' },
                },
            },
        ],
    },
    elite: {
        id: 'sermaye',
        title: 'Sermaye kaçışı',
        text: 'Büyük şirketler yatırımları durdurdu, sermaye hızla yurt dışına çıkıyor.',
        crisis: true,
        choices: [
            { label: 'Güven paketi açıkla', effects: { dSociety: -0.03, stake: { elite: 0.2 }, capital: -15 }, result: 'Vergi indirimleri ve güvencelerle kaçış durduruldu.' },
            { label: 'Sermaye denetimi getir', effects: { dState: -0.08, stake: { elite: -0.05, international: -0.06 } }, penalty: { regen: 0.6, turns: 2 }, result: 'Kaçış yavaşladı ama ekonomi iki yıl boyunca daraldı.' },
        ],
    },
    international: {
        id: 'izolasyon',
        title: 'Uluslararası yaptırımlar',
        text: 'Ticaret ortaklarınız kapsamlı yaptırımlar uyguluyor; dış finansmana erişim kesildi.',
        crisis: true,
        choices: [
            { label: 'Uyum reformları', effects: { dSociety: 0.06, stake: { international: 0.2, military: -0.04 }, capital: -10 }, result: 'Yaptırımların bir kısmı kaldırıldı.' },
            { label: 'Kapalı ekonomiye geç', effects: { dState: -0.1, stake: { military: 0.05, international: -0.05 }, capital: -10 }, result: 'Ülke içine kapandı; kurumlar dış baskı altında aşındı.' },
        ],
    },
    religious: {
        id: 'dinitepki',
        title: 'Dinî kurumlardan toplu tepki',
        text: 'Dinî liderler hükümete karşı ortak bir bildiri yayımladı; cuma vaazları siyasileşti.',
        crisis: true,
        choices: [
            { label: 'İstişareye aç', effects: { dSociety: -0.03, stake: { religious: 0.2 } }, result: 'Gerilim düştü; bazı reformlar yumuşatıldı.' },
            { label: 'Laik çizgide ısrar et', effects: { dState: -0.04, stake: { religious: -0.05, international: 0.03, civil: -0.04 } }, result: 'Gerilim uzun süre gündemde kaldı.' },
        ],
    },
};

export const EVENT_BY_ID = Object.fromEntries([...EVENTS, ...Object.values(CRISES)].map((e) => [e.id, e]));
