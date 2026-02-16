/**
 * Game Constants
 * Oyun sabitleri - Leviathan tipi ve ülke bazlı politik sermaye değerleri
 */

// Leviathan tipine göre politik sermaye değerleri
// Despotic: Güçlü devlet, yüksek sermaye
// Shackled: Dengeli devlet, orta sermaye
// Paper: Zayıf devlet, düşük sermaye
// Absent: Devletsiz, çok düşük sermaye
export const CAPITAL_BY_LEVIATHAN = {
    'Shackled': { current: 80, max: 100, regen: 15 },
    'Despotic': { current: 120, max: 150, regen: 25 },
    'Paper': { current: 60, max: 80, regen: 10 },
    'Absent': { current: 50, max: 70, regen: 8 }
};

// Ülke ekonomik güç çarpanları (GDP ve kurumsal kapasite bazlı)
// 1.0 = ortalama, >1.0 = güçlü ekonomi, <1.0 = zayıf ekonomi
export const COUNTRY_CAPITAL_MODIFIERS = {
    // Büyük ekonomiler (G7 + Çin)
    'USA': 1.3,
    'CHN': 1.25,
    'DEU': 1.2,
    'JPN': 1.2,
    'GBR': 1.15,
    'FRA': 1.15,
    'ITA': 1.1,
    'CAN': 1.15,

    // Gelişmekte olan büyük ekonomiler
    'TUR': 1.1,
    'BRA': 1.1,
    'IND': 1.05,
    'MEX': 1.05,
    'RUS': 1.1,
    'IDN': 1.0,
    'KOR': 1.15,
    'SAU': 1.1,
    'ARE': 1.1,

    // Orta ölçekli ekonomiler
    'POL': 1.05,
    'NLD': 1.1,
    'BEL': 1.05,
    'SWE': 1.1,
    'NOR': 1.15,
    'CHE': 1.2,
    'AUT': 1.05,
    'ESP': 1.05,
    'PRT': 1.0,
    'GRC': 0.95,
    'CZE': 1.0,
    'HUN': 0.95,
    'ROU': 0.9,
    'UKR': 0.85,

    // Afrika
    'ZAF': 0.95,
    'EGY': 0.9,
    'NGA': 0.85,
    'KEN': 0.85,
    'ETH': 0.75,
    'GHA': 0.85,
    'TZA': 0.8,
    'COD': 0.7,
    'SDN': 0.7,
    'SSD': 0.6,

    // Orta Doğu
    'IRN': 0.9,
    'IRQ': 0.75,
    'SYR': 0.6,
    'YEM': 0.6,
    'LBN': 0.75,
    'JOR': 0.85,
    'ISR': 1.1,
    'QAT': 1.15,
    'KWT': 1.05,

    // Asya
    'PAK': 0.8,
    'BGD': 0.75,
    'VNM': 0.9,
    'THA': 0.95,
    'MYS': 1.0,
    'SGP': 1.25,
    'PHL': 0.85,
    'MMR': 0.7,
    'AFG': 0.55,
    'NPL': 0.7,
    'LKA': 0.8,

    // Latin Amerika
    'ARG': 0.9,
    'CHL': 1.0,
    'COL': 0.9,
    'PER': 0.85,
    'VEN': 0.7,
    'ECU': 0.8,
    'BOL': 0.75,
    'PRY': 0.8,
    'URY': 0.95,
    'CUB': 0.7,
    'HTI': 0.55,

    // Orta Asya
    'KAZ': 0.9,
    'UZB': 0.8,
    'TKM': 0.75,
    'KGZ': 0.7,
    'TJK': 0.65,

    // Diğer
    'AUS': 1.15,
    'NZL': 1.1

    // Tanımlanmamış ülkeler için varsayılan: 1.0
};

// Varsayılan değerler
export const DEFAULT_CAPITAL_MODIFIER = 1.0;
export const DEFAULT_LEVIATHAN_TYPE = 'Absent';

// Faktör sınırları (State Power ve Society Power için)
// Faktör skorları -3 ile +3 arasında olmalı
export const FACTOR_LIMITS = {
    MIN: -3,
    MAX: 3
};

// Tur bazlı maksimum değişim sınırı
// Her turda faktörler en fazla bu kadar değişebilir
export const MAX_FACTOR_CHANGE_PER_TURN = 0.5;

// Şiddet çarpanları (Politika etkileri için)
// Orijinal değerler çok yüksekti ve radikal değişimlere neden oluyordu
export const INTENSITY_MULTIPLIERS = {
    "Soft": 0.25,       // Eski: 0.5
    "Moderate": 0.5,    // Eski: 1.0
    "Radical": 1.0,     // Eski: 2.5
    "Extreme": 1.5      // Eski: 4.0
};

// Değişken bazlı maksimum değişim sınırı
// Tek bir politika tek bir değişkeni en fazla bu kadar değiştirebilir
export const MAX_VARIABLE_CHANGE = 0.05;
