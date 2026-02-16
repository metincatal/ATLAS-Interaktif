/**
 * Sabitler ve Yapılandırma - ATLAS İnteraktif
 * Uygulama genelinde kullanılan sabit değerler
 */

// Ülke adı eşleme tablosu (GeoJSON -> Dar Koridor JSON)
export const COUNTRY_NAME_MAP = {
    'United States': 'United States of America',
    'United States of America': 'United States of America',
    'Turkey': 'Türkiye',
    'South Korea': 'Republic of Korea',
    'North Korea': 'Democratic People\'s Republic of Korea',
    'Venezuela': 'Bolivarian Republic of Venezuela',
    'Yemen': 'Republic of Yemen',
    'Congo': 'Republic of the Congo',
    'Democratic Republic of the Congo': 'Democratic Republic of the Congo',
    'Czech Republic': 'Czechia',
    'Ivory Coast': 'Côte d\'Ivoire',
    'Swaziland': 'Eswatini',
    'Macedonia': 'North Macedonia',
    'Burma': 'Myanmar',
    'Laos': 'Lao PDR',
    'Vietnam': 'Viet Nam',
    'East Timor': 'Timor-Leste',
    'São Tomé and Principe': 'São Tomé and Príncipe',
    'Syria': 'Syrian Arab Republic'
};

// Renk paleti - ülkeler için (şeffaf - historical maps için)
export const COUNTRY_COLOR = 'rgba(255, 255, 255, 0.1)';
export const HOVER_COLOR = 'rgba(255, 200, 50, 0.9)';
export const SELECTED_COLOR = 'rgba(255, 100, 100, 0.9)';

// WGI gösterge adları (TR)
export const WGI_INDICATORS = {
    va: 'Ses ve Hesap Verebilirlik',
    pv: 'Siyasal İstikrar ve Şiddetsizlik',
    ge: 'Hükümet Etkinliği',
    rq: 'Düzenleyici Kalite',
    rl: 'Hukukun Üstünlüğü',
    cc: 'Yolsuzluğun Kontrolü'
};

// Leviathan tipleri - Türkçe eşleme
export const LEVIATHAN_TYPES = {
    'Shackled': 'Zincirlenmiş Leviathan',
    'Despotic': 'Despotik Leviathan',
    'Absent': 'Mevcut Olmayan Leviathan',
    'Paper': 'Kağıt Leviathan'
};

// Leviathan tipleri - Kısa adlar (kompakt görünüm için)
export const LEVIATHAN_TYPES_SHORT = {
    'Shackled': 'Prangalanmış',
    'Despotic': 'Despotik',
    'Absent': 'Mevcut Olmayan',
    'Paper': 'Kağıttan'
};

// Leviathan tipleri - Renkler
export const LEVIATHAN_COLORS = {
    'Shackled': '#2ecc71',   // Yeşil
    'Despotic': '#e74c3c',   // Kırmızı
    'Paper': '#f39c12',      // Turuncu
    'Absent': '#9b59b6'      // Mor
};

// Filtre tipleri için etiketler
export const FILTER_LABELS = {
    all: 'Tümü',
    shackled: 'Prangalanmış',
    despotic: 'Despotik',
    paper: 'Kağıttan',
    absent: 'Mevcut Olmayan'
};

// API URLs
export const GEOJSON_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';
export const GLOBE_TEXTURE_URL = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
export const GLOBE_BUMP_URL = 'https://unpkg.com/three-globe/example/img/earth-topology.png';
export const GLOBE_BACKGROUND_URL = 'https://unpkg.com/three-globe/example/img/night-sky.png';

// GitHub Pages base path tespiti
// localhost'ta '' döner, GitHub Pages'de '/ATLAS-Interaktif' döner
function getBasePath() {
    const path = window.location.pathname;
    // GitHub Pages: /ATLAS-Interaktif/ veya /ATLAS-Interaktif/game.html gibi
    const match = path.match(/^(\/[^/]+)/);
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return '';
    }
    return match ? match[1] : '';
}

export const BASE_PATH = getBasePath();

// Veri dosyası yolları
export const DATA_PATHS = {
    darKoridorAllYears: `${BASE_PATH}/data/processed/wgi_vdem_modern/dar_koridor_all_years.json`,
    darKoridorByCountry: `${BASE_PATH}/data/processed/wgi_vdem_modern/dar_koridor_by_country.json`,
    darKoridorHistoricalAllYears: `${BASE_PATH}/data/processed/vdem_historical/dar_koridor_combined_all_years.json`,
    darKoridorHistoricalByCountry: `${BASE_PATH}/data/processed/vdem_historical/dar_koridor_by_country_all_years.json`,
    wgiDataset: `${BASE_PATH}/data/raw/wgidataset.csv`,
    vdemDataset: `${BASE_PATH}/data/processed/vdem_metadata/vdem_data.json`,
    vdemMindmap: `${BASE_PATH}/data/processed/vdem_metadata/vdem_mindmap_structure.json`,
    historicalMapsIndex: `${BASE_PATH}/data/historical_maps/index.json`,
    historicalNamesMapping: `${BASE_PATH}/data/historical_maps/historical_names.json`,
    historicalMapsBaseDir: `${BASE_PATH}/data/historical_maps/`,
    capitalCoordinates: `${BASE_PATH}/data/historical_maps/capital_coordinates.json`,
    unifiedHistoricalData: `${BASE_PATH}/data/historical_maps/unified_country_historical_data.json`
};

export const VDEM_COLOR_SCHEMES = [
    { id: 'Turbo', label: 'Turbo' },
    { id: 'Viridis', label: 'Viridis' },
    { id: 'Plasma', label: 'Plasma' },
    { id: 'Magma', label: 'Magma' },
    { id: 'Warm', label: 'Warm' },
    { id: 'Cool', label: 'Cool' },
    { id: 'Cividis', label: 'Cividis' }
];

// Globe ayarları
export const GLOBE_SETTINGS = {
    autoRotateSpeed: 0.5,
    polygonAltitude: 0.01,
    zoomSpeed: 1.0,
    enableZoom: true
};

// Animasyon süreleri (milisaniye)
export const ANIMATION_DURATIONS = {
    cameraMove: 1000,
    autoRotateDelay: 1200,
    panelTransition: 400,
    tooltipDelay: 300
};

// Z-index değerleri
export const Z_INDEX = {
    base: 1,
    dropdown: 10,
    sticky: 100,
    fixed: 500,
    modalBackdrop: 900,
    modal: 1000,
    popover: 1001,
    tooltip: 10000
};
