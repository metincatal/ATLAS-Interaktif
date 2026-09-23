/**
 * Özgürlük Dengesi — politika destesi
 *
 * dState / dSociety: devletin ve toplumun gücüne temel etki (faktör puanı)
 * stake: güç odaklarının memnuniyetine etki (0–1 ölçeğinde)
 * cost: siyasi sermaye (negatif = sermaye kazandırır)
 */

export const CATEGORIES = {
    devlet: { label: 'Devlet kapasitesi', hint: 'Devleti güçlendirir' },
    toplum: { label: 'Toplumun gücü', hint: 'Toplumu güçlendirir' },
    denetim: { label: 'Denetim ve denge', hint: 'İkisini birlikte büyütür' },
    ekonomi: { label: 'Ekonomi', hint: 'Kurumsal çerçeve' },
    baski: { label: 'Güç tekeli', hint: 'Kısa vadede sermaye, uzun vadede bedel' },
    uzlasi: { label: 'Uzlaşı', hint: 'Güç odaklarını yatıştırır' },
    dis: { label: 'Dış politika', hint: 'Uluslararası ilişkiler' },
};

export const POLICIES = [
    // Devlet kapasitesi
    { id: 'vergi', cat: 'devlet', title: 'Vergi İdaresi Reformu', desc: 'Kayıt dışını daraltır; kamu gelirini ve bürokratik kapasiteyi artırır.', cost: 25, dState: 0.18, dSociety: 0, stake: { elite: -0.06, international: 0.03 } },
    { id: 'liyakat', cat: 'devlet', title: 'Liyakatli Kamu Hizmeti', desc: 'Kamu atamalarını sınava bağlar, kayırmacılığı azaltır.', cost: 22, dState: 0.14, dSociety: 0.03, stake: { elite: -0.04, civil: 0.03 } },
    { id: 'altyapi', cat: 'devlet', title: 'Ulusal Altyapı Seferberliği', desc: 'Yol, enerji ve iletişim ağlarını ülkenin her köşesine taşır.', cost: 30, dState: 0.12, dSociety: 0.03, stake: { elite: 0.06, military: 0.02 } },
    { id: 'kayit', cat: 'devlet', title: 'Nüfus ve Tapu Kaydı', desc: 'Vatandaşları ve mülkleri kayıt altına alır; devlet toplumu “görmeye” başlar.', cost: 15, dState: 0.1, dSociety: 0, stake: { religious: -0.02 } },
    { id: 'kolluk', cat: 'devlet', title: 'Hesap Veren Kolluk', desc: 'Polisi eğitir ve bağımsız şikâyet mekanizması kurar.', cost: 24, dState: 0.09, dSociety: 0.06, stake: { military: -0.03, civil: 0.04 } },
    { id: 'merkez', cat: 'devlet', title: 'Bağımsız Merkez Bankası', desc: 'Para politikasını günlük siyasetten ayırır.', cost: 18, dState: 0.08, dSociety: 0, stake: { international: 0.08, elite: 0.04 } },
    { id: 'egitim', cat: 'devlet', title: 'Ulusal Eğitim Hamlesi', desc: 'Okullaşmayı yaygınlaştırır; nitelikli bürokrasi ve bilinçli vatandaş yetişir.', cost: 28, dState: 0.07, dSociety: 0.07, stake: { religious: -0.03, civil: 0.04 } },

    // Toplumun gücü
    { id: 'dernek', cat: 'toplum', title: 'Dernek ve Sendika Özgürlüğü', desc: 'Örgütlenmenin önündeki izin ve kayıt engellerini kaldırır.', cost: 20, dState: 0, dSociety: 0.2, stake: { elite: -0.06, civil: 0.12, military: -0.02 } },
    { id: 'basin', cat: 'toplum', title: 'Basın Özgürlüğü Paketi', desc: 'Gazetecilik suçlamalarını kaldırır, yayın lisanslarını bağımsız kurula devreder.', cost: 22, dState: 0, dSociety: 0.18, stake: { military: -0.05, civil: 0.08, international: 0.06 } },
    { id: 'yerel', cat: 'toplum', title: 'Yerel Yönetimlere Yetki Devri', desc: 'Belediyelere bütçe ve karar yetkisi aktarır.', cost: 20, dState: -0.04, dSociety: 0.14, stake: { civil: 0.06, elite: 0.02 } },
    { id: 'katilimci', cat: 'toplum', title: 'Katılımcı Bütçe', desc: 'Mahalle meclisleri yerel harcamalara birlikte karar verir.', cost: 14, dState: 0, dSociety: 0.1, stake: { civil: 0.06 } },
    { id: 'bilgi', cat: 'toplum', title: 'Bilgi Edinme Hakkı', desc: 'Kamu kayıtlarını vatandaşların incelemesine açar.', cost: 15, dState: 0.04, dSociety: 0.09, stake: { elite: -0.03, international: 0.03 } },
    { id: 'kadin', cat: 'toplum', title: 'Kadınların Siyasi Katılımı', desc: 'Aday kotası ve eşitlik birimleriyle kadınların siyasette temsilini artırır.', cost: 20, dState: 0, dSociety: 0.11, stake: { religious: -0.05, international: 0.05, civil: 0.05 } },
    { id: 'internet', cat: 'toplum', title: 'Özgür İnternet', desc: 'Erişim engellerini kaldırır, veri gizliliğini güvenceye alır.', cost: 16, dState: 0, dSociety: 0.12, stake: { military: -0.03, civil: 0.05 } },

    // Denetim ve denge
    { id: 'yargi', cat: 'denetim', title: 'Bağımsız Yargı Kurulu', desc: 'Hâkim atamalarını yürütmeden ayırır, anayasa yargısını güçlendirir.', cost: 30, dState: 0.1, dSociety: 0.1, stake: { military: -0.05, elite: -0.02, international: 0.08 } },
    { id: 'anayasa', cat: 'denetim', title: 'Bireysel Başvuru Hakkı', desc: 'Vatandaşlara hak ihlalleri için anayasa mahkemesine başvuru yolu açar.', cost: 26, dState: 0.07, dSociety: 0.1, stake: { international: 0.05, military: -0.03 } },
    { id: 'meclis', cat: 'denetim', title: 'Meclis Denetimini Güçlendir', desc: 'Bütçe denetimi, soru önergesi ve komisyon yetkilerini genişletir.', cost: 24, dState: 0.05, dSociety: 0.11, stake: { elite: -0.02 } },
    { id: 'secim', cat: 'denetim', title: 'Bağımsız Seçim Kurulu', desc: 'Seçim güvenliğini partilerüstü bir kurula devreder.', cost: 24, dState: 0.05, dSociety: 0.12, stake: { international: 0.06, military: -0.02 } },
    { id: 'yolsuzluk', cat: 'denetim', title: 'Yolsuzlukla Mücadele Ajansı', desc: 'Bağımsız soruşturma yetkisi ve mal beyanı denetimi getirir.', cost: 30, dState: 0.12, dSociety: 0.06, stake: { elite: -0.1, civil: 0.05, international: 0.05 } },
    { id: 'ombudsman', cat: 'denetim', title: 'Kamu Denetçiliği', desc: 'Vatandaş şikâyetlerini bağımsız bir kurum inceler.', cost: 14, dState: 0.04, dSociety: 0.07, stake: { civil: 0.03 } },

    // Ekonomi
    { id: 'rekabet', cat: 'ekonomi', title: 'Serbest Giriş ve Rekabet', desc: 'Tekel ayrıcalıklarını kaldırır; yeni firmalar pazara girebilir. Yaratıcı yıkımın kapısı açılır.', cost: 25, dState: 0.05, dSociety: 0.09, stake: { elite: -0.09, international: 0.05 } },
    { id: 'mulkiyet', cat: 'ekonomi', title: 'Mülkiyet Hakları Güvencesi', desc: 'Kamulaştırmayı yargı denetimine bağlar, tapuları güvenceye alır.', cost: 20, dState: 0.1, dSociety: 0.03, stake: { elite: 0.06, international: 0.04 } },
    { id: 'sosyal', cat: 'ekonomi', title: 'Sosyal Güvenlik Ağı', desc: 'İşsizlik sigortası ve temel sağlık güvencesi sağlar.', cost: 30, dState: 0.05, dSociety: 0.08, stake: { civil: 0.08, elite: -0.04 } },
    { id: 'toprak', cat: 'ekonomi', title: 'Toprak Reformu', desc: 'Büyük toprak mülkiyetini küçük üreticiler arasında paylaştırır.', cost: 32, dState: 0.03, dSociety: 0.12, stake: { elite: -0.14, civil: 0.1 } },

    // Güç tekeli (cazip ama zararlı)
    { id: 'ohal', cat: 'baski', title: 'Olağanüstü Hal Yetkileri', desc: 'Hükümete kararnameyle yönetme yetkisi verir.', cost: -15, dState: 0.08, dSociety: -0.22, stake: { military: 0.1, civil: -0.15, international: -0.08 } },
    { id: 'medya', cat: 'baski', title: 'Medyayı Denetim Altına Al', desc: 'Yayın kuruluşlarını hükümete yakın ellere devreder.', cost: -10, dState: 0.03, dSociety: -0.18, stake: { civil: -0.1, international: -0.06, elite: 0.04 } },
    { id: 'muhalefet', cat: 'baski', title: 'Muhalefete Soruşturma', desc: 'Önde gelen muhalifler hakkında davalar açılır.', cost: -12, dState: -0.02, dSociety: -0.16, stake: { military: 0.04, civil: -0.12, international: -0.08 } },
    { id: 'ordubutce', cat: 'baski', title: 'Askerî Bütçeyi Artır', desc: 'Orduya yeni kaynaklar ve ayrıcalıklar tanır.', cost: 18, dState: 0.05, dSociety: 0, stake: { military: 0.12, elite: -0.02, civil: -0.02 } },
    { id: 'patronaj', cat: 'baski', title: 'Patronaj Ağları', desc: 'Kamu kaynaklarını sadık iş çevrelerine dağıtır: klasik bir sömürücü kurum.', cost: -15, dState: -0.08, dSociety: -0.04, stake: { elite: 0.1, international: -0.04 } },

    // Uzlaşı
    { id: 'orduuzlasi', cat: 'uzlasi', title: 'Ordu ile Uzlaşma Protokolü', desc: 'Savunma sanayiine destek karşılığında siyasete müdahale etmeme sözü alınır.', cost: 14, dState: 0, dSociety: -0.03, stake: { military: 0.13 } },
    { id: 'isdunyasi', cat: 'uzlasi', title: 'İş Dünyası Danışma Konseyi', desc: 'Büyük şirketlere politika yapımında söz hakkı verir.', cost: 12, dState: 0, dSociety: -0.02, stake: { elite: 0.12 } },
    { id: 'diyalog', cat: 'uzlasi', title: 'Dinî Kurumlarla İstişare', desc: 'Dinî liderlerle düzenli ve açık bir danışma mekanizması kurar.', cost: 12, dState: 0, dSociety: 0.03, stake: { religious: 0.11 } },
    { id: 'af', cat: 'uzlasi', title: 'Toplumsal Barış ve Af', desc: 'Siyasi mahkûmlara af, silah bırakanlara yeniden katılım yolu.', cost: 20, dState: -0.02, dSociety: 0.08, stake: { civil: 0.08, military: -0.06 } },

    // Dış politika
    { id: 'uyum', cat: 'dis', title: 'Uluslararası Uyum Paketi', desc: 'İnsan hakları sözleşmelerini onaylar, ticaret ortaklıklarına uyum sağlar.', cost: 22, dState: 0.05, dSociety: 0.07, stake: { international: 0.14, religious: -0.03, military: -0.02 } },
    { id: 'yardim', cat: 'dis', title: 'Kalkınma Yardımı Anlaşması', desc: 'Dış finansman karşılığında kamu yönetimi reformu taahhüt edilir.', cost: 10, dState: 0.07, dSociety: 0, stake: { international: 0.1, military: -0.02 } },
];

export const POLICY_BY_ID = Object.fromEntries(POLICIES.map((p) => [p.id, p]));
