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

// Renk paleti - ülkeler için
export const COUNTRY_COLOR = 'rgba(39, 187, 216, 0.8)';
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

// Veri dosyası yolları
export const DATA_PATHS = {
    darKoridorAllYears: '../../data/processed/v2_1/dar_koridor_all_years.json',
    darKoridorByCountry: '../../data/processed/v2_1/dar_koridor_by_country.json',
    wgiDataset: '../../data/raw/wgidataset.csv',
    vdemDataset: '../../data/processed/v4/vdem_data.json',
    vdemMindmap: '../../data/processed/v4/vdem_mindmap_structure.json'
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
