/**
 * Ülke Kod Eşleştirmeleri - ATLAS İnteraktif
 * GeoJSON ülke adları -> ISO Alpha-2 kodları
 */

export const COUNTRY_ISO_MAP = {
    // Özel durumlar
    'United States of America': 'us',
    'United Kingdom': 'gb',
    'Turkey': 'tr',
    'Türkiye': 'tr',
    'South Korea': 'kr',
    'North Korea': 'kp',
    'Russia': 'ru',
    'China': 'cn',
    'Japan': 'jp',
    'India': 'in',
    'Germany': 'de',
    'France': 'fr',
    'Brazil': 'br',
    'Canada': 'ca',
    'Australia': 'au',
    'Mexico': 'mx',
    'Spain': 'es',
    'Italy': 'it',
    'Netherlands': 'nl',
    'Belgium': 'be',
    'Switzerland': 'ch',
    'Sweden': 'se',
    'Norway': 'no',
    'Denmark': 'dk',
    'Finland': 'fi',
    'Poland': 'pl',
    'Czech Republic': 'cz',
    'Czechia': 'cz',
    'Austria': 'at',
    'Greece': 'gr',
    'Portugal': 'pt',
    'Ireland': 'ie',
    'New Zealand': 'nz',
    'South Africa': 'za',
    'Egypt': 'eg',
    'Nigeria': 'ng',
    'Kenya': 'ke',
    'Ethiopia': 'et',
    'Argentina': 'ar',
    'Chile': 'cl',
    'Colombia': 'co',
    'Peru': 'pe',
    'Venezuela': 've',
    'Saudi Arabia': 'sa',
    'Iran': 'ir',
    'Iraq': 'iq',
    'Israel': 'il',
    'Pakistan': 'pk',
    'Bangladesh': 'bd',
    'Vietnam': 'vn',
    'Thailand': 'th',
    'Philippines': 'ph',
    'Malaysia': 'my',
    'Singapore': 'sg',
    'Indonesia': 'id',
    'Ukraine': 'ua',
    'Romania': 'ro',
    'Hungary': 'hu',
    'Bulgaria': 'bg',
    'Serbia': 'rs',
    'Croatia': 'hr',
    'Slovenia': 'si',
    'Slovakia': 'sk',
    'Lithuania': 'lt',
    'Latvia': 'lv',
    'Estonia': 'ee'
};

/**
 * Ülke adından ISO Alpha-2 kodu döndürür
 */
export function getCountryISOCode(countryName, isoA2FromGeoJSON) {
    // Önce GeoJSON'dan gelen kodu dene
    if (isoA2FromGeoJSON && isoA2FromGeoJSON !== '-99' && isoA2FromGeoJSON !== 'XX') {
        return isoA2FromGeoJSON.toLowerCase();
    }
    
    // Manuel mapping'den bul
    if (COUNTRY_ISO_MAP[countryName]) {
        return COUNTRY_ISO_MAP[countryName];
    }
    
    // Bulamazsa varsayılan
    console.warn(`ISO kodu bulunamadı: ${countryName}`);
    return null;
}

