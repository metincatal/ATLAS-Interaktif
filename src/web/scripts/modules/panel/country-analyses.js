/**
 * Ülke Analizleri - ATLAS İnteraktif
 * Sabit ülke analiz metinleri
 */

// Panelde gösterilecek sabit analiz metinleri
export const COUNTRY_ANALYSES = {
    'Turkey': {
        nationsFail: 'Türkiye\'de 1980 sonrası açılan piyasa alanı girişimciliği desteklese de hukukun üstünlüğü ve hesap verebilirlik eksikleri kapsayıcı kurumların derinleşmesini engelliyor. Devlet kaynaklarının seçkinler arasında yeniden dağıtılması üretken yatırımların ve uzun vadeli büyümenin önünde bariyer oluşturuyor.',
        corridor: 'Türkiye güçlü devlet kapasitesine rağmen toplumsal denetimi kurumsallaştırmakta zorlanan bir Zincirlenmiş Leviathan adayını temsil ediyor. Şeffaflık, yargı bağımsızlığı ve yerel örgütlenmeyi güçlendiren reformlar ülkeyi dar koridorda tutmak için kritik.'
    },
    'United States of America': {
        nationsFail: 'Amerika Birleşik Devletleri\'nde kapsayıcı ekonomik kurumlar inovasyon ve girişimciliği teşvik ederek uzun vadeli büyüme yarattı. Buna karşın siyasi sistemdeki çıkar gruplarının ağırlığı kapsayıcılığın tüm toplumsal kesimlere eşit yansımasını zorlaştırıyor.',
        corridor: 'ABD, güçlü devlet kapasitesi ile örgütlü toplumsal denetim arasında süregelen rekabet sayesinde Zincirlenmiş Leviathan örneklerinden biri kabul ediliyor. Artan kutuplaşma ve temsil sorunları bu dengeyi dar koridorun dışına itebilecek riskler barındırıyor.'
    }
    // ... Daha fazla ülke buraya eklenebilir (orijinal script.js'de 20+ ülke var)
};

/**
 * Ülke analiz metnini döndürür
 */
export function getCountryAnalysesText(countryName) {
    const analysis = COUNTRY_ANALYSES[countryName];
    if (analysis) {
        return analysis;
    }
    return {
        nationsFail: `${countryName} için ayrıntılı veri sınırlı olsa da kapsayıcı kurumların güçlenmesi mülkiyet hakları, hukukun üstünlüğü ve rekabetçi piyasa düzenine bağlı. Sömürücü pratiklerin azaltılması uzun vadeli büyümenin temel koşulu olarak öne çıkıyor.`,
        corridor: `${countryName} devlet ile toplum kapasitesi arasında sürdürülebilir bir denge arıyor. Katılımcı ve hesap verebilir kurumların güçlenmesi ülkeyi Zincirlenmiş Leviathan'a yaklaştırarak dar koridorda kalmasını sağlayabilir.`
    };
}

