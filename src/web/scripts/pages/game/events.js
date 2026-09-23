/**
 * Özgürlük Dengesi — olay destesi
 *
 * Olaylar genel senaryolardır; gerçek bir ülkenin belirli bir tarihî olayını
 * anlatmazlar. Her seçeneğin etkisi (effects) sabit ya da duruma bağlı olabilir.
 *
 * risk:     başarı olasılığı olan seçenekler; başarısızlık oyunu bitirebilir.
 * later:    etkisi sonraki yıllara yayılan seçenekler ({ turns, label, effects }).
 * followUp: birkaç yıl sonra yeni bir olay doğuran seçenekler ({ id, in: [en az, en çok] }).
 * flag:     sonraki olayların hatırlayacağı karar.
 * followOnly: yalnızca bir önceki kararın sonucu olarak gelen olaylar.
 */

const S = (s) => s.stake;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const EVENTS = [
    {
        id: 'finans',
        title: 'Küresel finans krizi',
        text: 'Dış piyasalardaki çöküş ihracatı ve istihdamı vuruyor. İş dünyası kurtarma paketi, sendikalar sosyal koruma istiyor.',
        weight: () => 1,
        choices: [
            {
                label: 'Bankaları kurtar, bütçeyi sıkılaştır',
                effects: { dState: 0.04, stake: { elite: 0.08, civil: -0.08 }, capital: -5 },
                result: 'Bankacılık sistemi ayakta kaldı, ancak işsizlik ve öfke arttı.',
                later: { turns: 3, label: 'Kemer sıkma toplumu yoruyor', effects: { dSociety: -0.02, stake: { civil: -0.02 } } },
            },
            {
                label: 'Sosyal koruma paketi açıkla',
                effects: { dSociety: 0.05, stake: { civil: 0.08, elite: -0.05 }, capital: -12 },
                result: 'Hanehalkları korundu; bütçe açığı ve iş dünyasının kaygısı büyüdü.',
                later: { turns: 2, label: 'Bütçe açığı', effects: { capital: -7 } },
            },
        ],
    },
    {
        id: 'protesto',
        title: 'Kitlesel protestolar',
        text: 'Başkentte on binler hükümeti daha fazla hesap vermeye çağırıyor. Gösteriler her gün büyüyor.',
        weight: (s) => (S(s).civil.sat < 0.45 || s.y - s.x > 0.8 ? 2.2 : 0.5),
        choices: [
            {
                label: 'Müzakere masası kur',
                risk: {
                    chance: (s) => clamp(0.35 + 0.4 * S(s).civil.sat + (s.x > 0 ? 0.15 : 0), 0.2, 0.9),
                    success: { effects: { dSociety: 0.1, stake: { military: -0.04, civil: 0.08 }, capital: -10 }, result: 'Protesto liderleriyle bir reform takvimi üzerinde anlaşıldı.' },
                    fail: { effects: { dSociety: 0.05, dState: -0.04, stake: { military: -0.06, civil: -0.03 }, capital: -14 }, result: 'Müzakere dağıldı; hükümet zayıf göründü ve gösteriler büyüdü.' },
                },
            },
            {
                label: 'Gösterileri yasakla',
                effects: { dSociety: -0.15, dState: 0.03, stake: { military: 0.04, civil: -0.12, international: -0.06 } },
                result: 'Meydanlar boşaltıldı; öfke ise yeraltına çekildi.',
                followUp: { id: 'radikal', in: [2, 4] },
            },
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
            {
                label: 'Yerel dayanışma ağlarını destekle',
                effects: (s) => (s.x > -0.5 ? { dSociety: 0.08, dState: -0.02, stake: { civil: 0.06 }, capital: -8 } : { dSociety: 0.02, dState: -0.04, stake: { civil: -0.04 }, capital: -8 }),
                result: (s) => (s.x > -0.5 ? 'Yerel örgütler ve gönüllüler yükü sırtladı; toplum güçlendi.' : 'Örgütsüz bir toplumda yardım dağınık kaldı; kayıplar büyüdü.'),
            },
        ],
    },
    {
        id: 'emtia',
        title: 'Emtia fiyatlarında patlama',
        text: 'İhraç ettiğiniz hammaddelerin fiyatı iki katına çıktı. Hazineye beklenmedik bir gelir akıyor.',
        weight: () => 0.9,
        choices: [
            {
                label: 'Varlık fonu kur, kurallara bağla',
                effects: { dState: 0.04, stake: { international: 0.04, elite: -0.03 } },
                result: 'Gelir şeffaf bir fonda biriktirildi.',
                flag: 'fon',
                later: { turns: 3, label: 'Varlık fonunun getirisi', effects: { dState: 0.02, capital: 4 } },
            },
            {
                label: 'Gelirleri seçmenlere dağıt',
                effects: { dState: -0.04, stake: { elite: 0.04, civil: 0.03 }, capital: 22 },
                result: 'Kısa vadeli bir refah dalgası yaşandı; kurumlar ise ihmal edildi.',
                followUp: { id: 'cokus', in: [3, 5] },
            },
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
            {
                label: 'Örtbas et',
                effects: { dSociety: -0.05, stake: { elite: 0.06, international: -0.04 }, capital: 8 },
                result: 'Skandal kapatıldı; ama herkes ne olduğunu biliyor.',
                followUp: { id: 'skandal2', in: [2, 4] },
            },
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
                risk: {
                    chance: (s) => clamp(0.25 + 0.55 * (S(s).civil.sat * 0.6 + S(s).elite.sat * 0.4) + (s.liberty > 0.5 ? 0.1 : 0), 0.2, 0.9),
                    success: { effects: { dSociety: 0.1, stake: { international: 0.05, civil: 0.04 }, capital: 12 }, result: 'Seçim temiz geçti ve güçlü bir yetkiyle döndünüz.' },
                    fail: { effects: { dSociety: 0.1, stake: { international: 0.05, elite: -0.04 }, capital: -20 }, result: 'Seçim temiz geçti ama sandıktan zayıf çıktınız; koalisyon kurmak pahalıya patladı.' },
                },
            },
            {
                label: 'Seçimi ertele',
                effects: { dSociety: -0.2, dState: 0.02, stake: { international: -0.1, civil: -0.1 }, capital: 15 },
                result: 'Seçim “istikrar” gerekçesiyle ertelendi; meşruiyetiniz aşındı.',
                followUp: { id: 'mesruiyet', in: [1, 3] },
            },
        ],
    },
    {
        id: 'salgin',
        title: 'Salgın hastalık',
        text: 'Hızla yayılan bir salgın hastaneleri zorluyor. Bilim kurulu sert önlemler öneriyor.',
        once: true,
        weight: () => 0.6,
        choices: [
            {
                label: 'Sıkı karantina uygula',
                effects: (s) => (s.y > 0.3 ? { dState: 0.06, dSociety: -0.03, stake: { elite: -0.05 }, capital: -10 } : { dState: 0.02, dSociety: -0.06, stake: { elite: -0.05, civil: -0.05 }, capital: -10 }),
                result: (s) => (s.y > 0.3 ? 'Güçlü kurumlar salgını kontrol altına aldı; bedeli ağır ama yönetilebilir oldu.' : 'Zayıf bir devlet karantinayı uygulayamadı; kısıtlamalar yalnızca öfke üretti.'),
            },
            {
                label: 'Gönüllü önlemlere güven',
                effects: (s) => (s.x > 0.3 ? { dSociety: 0.04, stake: { civil: 0.03, elite: 0.03 } } : { dState: -0.05, stake: { civil: -0.04 }, capital: -8 }),
                result: (s) => (s.x > 0.3 ? 'Örgütlü toplum dayanışma ağlarıyla salgını yavaşlattı.' : 'Hayat devam etti ama kayıplar yüksek oldu; devlete güven sarsıldı.'),
            },
        ],
    },
    {
        id: 'sinir',
        title: 'Sınır çatışması',
        text: 'Komşu ülkeyle tartışmalı bir sınır bölgesinde çatışma çıktı.',
        weight: () => 0.8,
        choices: [
            { label: 'Diplomasi ve arabuluculuk', effects: { stake: { international: 0.08, military: -0.06 } }, result: 'Uluslararası arabuluculukla ateşkes sağlandı.' },
            {
                label: 'Seferberlik ilan et',
                effects: { dState: 0.05, dSociety: -0.04, stake: { military: 0.12 }, capital: -10 },
                result: 'Ordu sınıra yığıldı; olağanüstü önlemler gündelik hayata sızdı.',
                later: { turns: 2, label: 'Olağanüstü önlemler kalıcılaşıyor', effects: { dSociety: -0.02 } },
            },
        ],
    },
    {
        id: 'borc',
        title: 'Dış borç krizi',
        text: 'Hazine borçlarını çeviremiyor. Uluslararası kuruluşlar sıkı koşullarla kredi öneriyor.',
        cond: (s) => s.capital.current < 35 || s.y < -0.5,
        weight: () => 1.6,
        choices: [
            {
                label: 'Kredi koşullarını kabul et',
                effects: { dState: 0.07, stake: { international: 0.12, civil: -0.08 }, capital: 20 },
                result: 'Kemer sıkma başladı; kamu maliyesi disipline girdi.',
                later: { turns: 2, label: 'Kemer sıkmanın toplumsal bedeli', effects: { stake: { civil: -0.03 } } },
            },
            { label: 'Reddet, kendi yolunu çiz', effects: { stake: { international: -0.08, elite: -0.04 }, capital: -5 }, result: 'Bağımsızlık korundu ama finansman kaynakları kurudu.', later: { turns: 2, label: 'Finansman sıkıntısı', effects: { capital: -6 } } },
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
            {
                label: 'Eleştiriyi kabullen',
                effects: { dSociety: 0.1, stake: { military: -0.03, elite: -0.02 } },
                result: 'Basın özgürlüğü kökleşti; hükümet daha dikkatli davranmaya başladı.',
                later: { turns: 2, label: 'Eleştiri siyasi sermayeyi aşındırıyor', effects: { capital: -5 } },
            },
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
            {
                label: 'Güvenlik operasyonu',
                risk: {
                    chance: (s) => clamp(0.35 + 0.15 * (s.y + 1) + 0.25 * S(s).military.sat, 0.15, 0.85),
                    success: { effects: { dState: 0.1, dSociety: -0.05, stake: { military: 0.06 }, capital: -10 }, result: 'Devlet otoritesi bölgede yeniden kuruldu.' },
                    fail: { effects: { dState: -0.05, dSociety: -0.05, stake: { military: -0.06 }, capital: -18 }, result: 'Operasyon bataklığa döndü; kayıplar ordu içinde öfke yarattı.' },
                },
            },
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
            { label: 'Rekabete aç', effects: { dSociety: 0.06, dState: 0.04, stake: { elite: -0.07, international: 0.03 } }, result: 'Yaratıcı yıkım başladı: yeni firmalar büyüdü, eski tekeller geriledi.' },
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
    {
        id: 'tepki',
        title: 'Reformlara karşı direniş',
        text: 'Reformlardan zarar gören iş çevreleri ve üst bürokrasi, yeni düzenlemeleri uygulamada yavaşlatıyor.',
        cond: (s) => s.lastPace > 1.01 || S(s).elite.sat < 0.33,
        weight: (s) => (s.lastPace > 1.2 ? 2.4 : 1.2),
        choices: [
            {
                label: 'Reform takvimini sürdür',
                effects: { dState: 0.03, stake: { elite: -0.08 }, capital: -10 },
                result: 'Kararlılık reformları kalıcılaştırdı; kaybedenlerin öfkesi ise büyüdü.',
            },
            {
                label: 'Tempoyu düşür, kaybedenleri tazmin et',
                effects: { stake: { elite: 0.08, military: 0.03 }, capital: -6 },
                result: 'Gerilim düştü ama reformların ivmesi kayboldu.',
                later: { turns: 2, label: 'Reform ivmesi kayboldu', effects: { dState: -0.02, dSociety: -0.02 } },
            },
        ],
    },
    {
        id: 'populizm',
        title: 'Popülist dalga',
        text: 'Kurumları “halkın düşmanı” ilan eden bir hareket hızla yükseliyor. Kalabalık mitingler meclisi ve yargıyı hedef alıyor.',
        cond: (s) => s.turn >= 4,
        weight: (s) => (S(s).civil.sat < 0.4 || s.liberty < s.startLiberty ? 1.6 : 0.6),
        once: true,
        choices: [
            {
                label: 'Kurumları savun',
                risk: {
                    chance: (s) => clamp(0.3 + 0.45 * S(s).civil.sat + (s.type === 'Shackled' ? 0.15 : 0), 0.2, 0.9),
                    success: { effects: { dSociety: 0.05, stake: { international: 0.05, civil: 0.03 } }, result: 'Yargı ve meclis baskıya direndi; hareket kısa sürede dağıldı.' },
                    fail: { effects: { stake: { civil: -0.08, elite: -0.03 }, capital: -15 }, result: 'Kurumları savunmak sizi seçkinlerin tarafında gösterdi; öfke hükümete yöneldi.' },
                },
            },
            {
                label: 'Söylemini benimse',
                effects: { dSociety: -0.06, stake: { civil: 0.06, international: -0.06 }, capital: 15 },
                result: 'Anketlerde yükseldiniz; kurumlara güven ise hızla eridi.',
                later: { turns: 3, label: 'Kurumlar içten aşınıyor', effects: { dState: -0.02, dSociety: -0.01 } },
            },
        ],
    },
    {
        id: 'kavsak',
        title: 'Kritik kavşak: yeni anayasa',
        text: 'Eski düzen tıkandı. Bütün taraflar yeni bir anayasa yapılması gerektiğinde uzlaşıyor ama nasıl bir anayasa olacağında değil. Bu tür anlar kurumların yönünü onlarca yıl belirleyebilir.',
        cond: (s) => s.turn >= 4 && s.type !== 'Shackled',
        weight: () => 0.9,
        once: true,
        choices: [
            {
                label: 'Geniş katılımlı bir anayasa süreci',
                risk: {
                    chance: (s) => clamp(0.3 + 0.25 * (S(s).civil.sat + S(s).elite.sat) + (Math.abs(s.x - s.y) < 1 ? 0.1 : 0), 0.2, 0.85),
                    success: { effects: { dSociety: 0.14, dState: 0.1, stake: { civil: 0.08, international: 0.06, military: -0.04 }, capital: -12 }, result: 'Toplumun her kesiminin katıldığı bir metin çıktı; devlet de toplum da güçlendi.' },
                    fail: { effects: { dSociety: 0.03, stake: { elite: -0.06, military: -0.04 }, capital: -20 }, result: 'Süreç kutuplaşmaya takıldı; aylar süren tartışmadan sonuç çıkmadı.' },
                },
            },
            {
                label: 'Güçlü yürütme modeli',
                effects: { dState: 0.12, dSociety: -0.14, stake: { military: 0.06, elite: 0.04, civil: -0.08, international: -0.05 }, capital: 10 },
                result: 'Yetkiler yürütmede toplandı; denetim mekanizmaları zayıfladı.',
            },
        ],
    },

    // ----------------------------------------------------------- sonuç olayları
    {
        id: 'skandal2',
        followOnly: true,
        title: 'Örtbas edilen skandal patladı',
        text: 'Yıllar önce kapatılan yolsuzluk dosyası, yeni belgelerle yeniden gündemde. Bu kez örtbas girişimi de soruşturmanın konusu.',
        choices: [
            { label: 'İstifaları kabul et, soruşturmayı aç', effects: { dState: 0.03, stake: { elite: -0.08, civil: 0.05 }, capital: -18 }, result: 'Bedelini ağır ödediniz; ama hukuk işledi.' },
            { label: 'Basını ve muhalefeti suçla', effects: { dSociety: -0.1, stake: { civil: -0.08, international: -0.06 } }, result: 'Kutuplaşma derinleşti; güven kaybı kalıcı hâle geldi.' },
        ],
    },
    {
        id: 'radikal',
        followOnly: true,
        title: 'Radikalleşen muhalefet',
        text: 'Meydanlardan sürülen gençler gizli örgütlenmelere yöneldi. Şiddet olayları artıyor.',
        cond: (s) => S(s).civil.sat < 0.55,
        choices: [
            { label: 'Siyasi kanalları yeniden aç', effects: { dSociety: 0.06, stake: { civil: 0.06, military: -0.04 }, capital: -10 }, result: 'Muhalefetin bir kısmı yeniden sandığa döndü.' },
            { label: 'Terörle mücadele yasası çıkar', effects: { dState: 0.03, dSociety: -0.1, stake: { military: 0.05, civil: -0.08, international: -0.05 } }, result: 'Şiddet azaldı ama yasa, eleştirenlere karşı da kullanılmaya başlandı.' },
        ],
    },
    {
        id: 'mesruiyet',
        followOnly: true,
        title: 'Meşruiyet krizi',
        text: 'Ertelenen seçimden sonra muhalefet hükümeti tanımadığını ilan etti. Uluslararası gözlemciler de endişeli.',
        choices: [
            { label: 'Erken seçim takvimi açıkla', effects: { dSociety: 0.08, stake: { international: 0.08, civil: 0.06 }, capital: -15 }, result: 'Gerilim düştü; seçim takvimi güveni kısmen onardı.' },
            { label: 'Olağanüstü tedbirlerle yönet', effects: { dState: 0.04, dSociety: -0.12, stake: { military: 0.06, civil: -0.1, international: -0.08 } }, result: 'Düzen sağlandı; meşruiyet ise büsbütün aşındı.' },
        ],
    },
    {
        id: 'cokus',
        followOnly: true,
        title: 'Emtia fiyatları çöktü',
        text: 'Birkaç yıl önce rekor kıran hammadde fiyatları yarı yarıya düştü. Hazine gelirleri eriyor.',
        choices: [
            {
                label: 'Harcamaları kıs',
                effects: (s) => (s.flags.fon ? { stake: { civil: -0.03 }, capital: -5 } : { dState: -0.05, stake: { civil: -0.08, elite: -0.03 }, capital: -12 }),
                result: (s) => (s.flags.fon ? 'Varlık fonu şoku yumuşattı; kesintiler sınırlı kaldı.' : 'Fon kurulmadığı için kesintiler ağır oldu; kamu hizmetleri aksadı.'),
            },
            {
                label: 'Borçlanarak harcamayı sürdür',
                effects: { stake: { international: -0.05 }, capital: 10 },
                result: 'Bugünü kurtardınız; faiz yükü ise yıllarca sürecek.',
                later: { turns: 3, label: 'Faiz yükü', effects: { capital: -8, dState: -0.01 } },
            },
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
