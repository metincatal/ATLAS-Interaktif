/**
 * Kızıl Kraliçe — seçkin senaryolar. Kısa notlar yalnızca dönemi tanıtır.
 *
 * balance: iki "orta" yapay zekânın birbirine karşı oynadığı 60 düellodaki
 * kazanma oranları (kalanı berabere). Kurallar değişince
 * `node scripts/duel_balance.mjs` ile yeniden üretilmelidir.
 */

export const DUEL_SCENARIOS = [
    { id: 'TUR', year: 2002, note: 'Devletin de toplumun da zayıf olduğu, koridorun eşiğinde bir başlangıç.', balance: { state: 0.57, society: 0.35 } },
    { id: 'TUR', year: 2016, note: 'Devletin toplumun belirgin biçimde önünde olduğu bir dönem.', balance: { state: 0.27, society: 0.53 } },
    { id: 'DEU', year: 1919, note: 'Weimar Cumhuriyeti kuruluyor: kitabın “kontrolden çıkan Kızıl Kraliçe” örneği.', balance: { state: 0.5, society: 0.47 } },
    { id: 'POL', year: 1989, note: 'Yuvarlak masa görüşmeleri ve yarı serbest seçimlerin yılı.', balance: { state: 0.5, society: 0.42 } },
    { id: 'ESP', year: 1975, note: 'Franco’nun ölümü; demokrasiye geçiş başlıyor.', balance: { state: 0.42, society: 0.5 } },
    { id: 'IND', year: 1977, note: 'Olağanüstü hal döneminin sona erdiği yıl.', balance: { state: 0.37, society: 0.58 } },
    { id: 'ZAF', year: 1994, note: 'Apartheid sonrası ilk genel seçimler.', balance: { state: 0.53, society: 0.4 } },
    { id: 'EGY', year: 2011, note: 'Arap Baharı: kitlesel protestolar yönetimi değiştiriyor.', balance: { state: 0.45, society: 0.42 } },
    { id: 'TUN', year: 2011, note: 'Arap Baharı’nın başladığı ülke; yeni bir anayasa arayışı.', balance: { state: 0.47, society: 0.48 } },
    { id: 'GRC', year: 1974, note: 'Askerî cuntanın çöküşü.', balance: { state: 0.35, society: 0.45 } },
    { id: 'CHL', year: 1988, note: 'Askerî yönetimin geleceğinin oylandığı plebisit yılı.', balance: { state: 0.35, society: 0.47 } },
    { id: 'TUR', year: 1980, note: 'Askerî darbe yılı.', balance: { state: 0.35, society: 0.47 } },
    { id: 'HUN', year: 2010, note: 'Parlamentoda anayasayı değiştirebilecek çoğunluğun doğduğu seçim yılı.', balance: { state: 0.43, society: 0.5 } },
];
