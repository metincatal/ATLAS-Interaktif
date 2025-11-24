/**
 * Historical Maps Modülü - ATLAS İnteraktif
 * 1789-2024 arası tarihi sınır haritalarını yönetir
 */

import { state, setState } from '../../core/state.js';
import { DATA_PATHS, COUNTRY_NAME_MAP } from '../../config/constants.js';
import { loadHistoricalMapToGlobe } from '../../core/globe.js';
import { openCountryPanel } from '../panel/panel-manager.js';

// Map cache - Yüklenen haritaları sakla
const mapCache = new Map();

// Preload state
let preloadInProgress = false;
let preloadCompleted = false;

/**
 * Tüm historical maps'leri paralel olarak önceden yükler
 * @param {Function} progressCallback - Progress callback (loaded, total)
 * @returns {Promise<boolean>} Başarı durumu
 */
export async function preloadAllHistoricalMaps(progressCallback) {
    if (preloadInProgress || preloadCompleted) {
        console.log('⚠️ Preload zaten devam ediyor veya tamamlandı');
        return preloadCompleted;
    }

    preloadInProgress = true;
    console.log('🚀 Tüm historical maps preload başlatılıyor...');

    const index = state.historicalMapsIndex;
    if (!index) {
        console.error('❌ Historical Maps index yüklenmemiş');
        preloadInProgress = false;
        return false;
    }

    // Tüm milestone'lar (hepsi GeoJSON dosyası)
    const milestones = index.milestones;
    const total = milestones.length;
    let loaded = 0;

    console.log(`📦 ${total} harita paralel yüklenecek...`);

    // Progress callback başlangıç
    if (progressCallback) {
        progressCallback(loaded, total);
    }

    // Paralel fetch işlemleri
    const fetchPromises = milestones.map(async (milestone) => {
        try {
            const mapPath = DATA_PATHS.historicalMapsBaseDir + milestone.path;
            // console.log(`🔗 Preload URL: ${mapPath}`); // Verbose olmaması için yorum satırı
            const response = await fetch(mapPath);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status} (${mapPath})`);
            }

            const mapData = await response.json();
            mapData.loadedMilestone = milestone;

            // Cache'e ekle
            mapCache.set(milestone.year, mapData);

            loaded++;
            console.log(`✓ ${milestone.year} yüklendi (${loaded}/${total})`);

            // Progress callback
            if (progressCallback) {
                progressCallback(loaded, total);
            }

            return true;
        } catch (error) {
            console.error(`❌ ${milestone.year} yükleme hatası:`, error);
            loaded++;
            if (progressCallback) {
                progressCallback(loaded, total);
            }
            return false;
        }
    });

    // Tüm fetch'leri bekle
    const results = await Promise.all(fetchPromises);
    const successCount = results.filter(r => r).length;

    preloadInProgress = false;
    preloadCompleted = true;

    console.log(`✅ Preload tamamlandı: ${successCount}/${total} başarılı`);
    console.log(`💾 Cache boyutu: ${mapCache.size} harita`);

    return successCount === total;
}

/**
 * Historical Maps Index ve Names verilerini yükler
 */
export async function loadHistoricalMapsData() {
    try {
        console.log('📚 Historical Maps verileri yükleniyor...');

        // createHistoricalTooltip'i window'a export et (globe.js erişimi için)
        window.createHistoricalTooltip = createHistoricalTooltip;

        // Index dosyasını yükle
        const indexResponse = await fetch(DATA_PATHS.historicalMapsIndex);
        if (!indexResponse.ok) {
            throw new Error(`Index yükleme hatası: ${indexResponse.status}`);
        }
        const indexData = await indexResponse.json();
        setState('historicalMapsIndex', indexData);

        // Historical names mapping yükle
        const namesResponse = await fetch(DATA_PATHS.historicalNamesMapping);
        if (!namesResponse.ok) {
            throw new Error(`Names mapping yükleme hatası: ${namesResponse.status}`);
        }
        const namesData = await namesResponse.json();
        setState('historicalNamesMapping', namesData);

        // Başkent koordinatlarını yükle
        const capitalsResponse = await fetch(DATA_PATHS.capitalCoordinates);
        if (!capitalsResponse.ok) {
            throw new Error(`Capital coordinates yükleme hatası: ${capitalsResponse.status}`);
        }
        const capitalsData = await capitalsResponse.json();
        setState('capitalCoordinates', capitalsData);

        console.log('✓ Historical Maps verileri yüklendi:', {
            totalMilestones: indexData.milestones.length,
            yearCoverage: `${indexData.metadata.coverage.start_year}-${indexData.metadata.coverage.end_year}`,
            sources: indexData.metadata.sources.length,
            namedCountries: namesData.mappings.length,
            capitalCountries: Object.keys(capitalsData.capitals).length
        });

        return true;
    } catch (error) {
        console.error('❌ Historical Maps veri yükleme hatası:', error);
        return false;
    }
}

/**
 * Belirli bir yıl için en uygun milestone'u bulur
 * @param {number} year - Hedef yıl
 * @returns {Object|null} Milestone bilgisi
 */
export function getMilestoneForYear(year) {
    const index = state.historicalMapsIndex;
    if (!index) {
        console.warn('⚠️  Historical Maps index yüklenmemiş');
        return null;
    }

    // Tam eşleşme ara
    let milestone = index.milestones.find(m => m.year === year);

    // Bulamazsan en yakın önceki milestone'u al
    if (!milestone) {
        const suitableMilestones = index.milestones.filter(m => m.year <= year);
        if (suitableMilestones.length > 0) {
            milestone = suitableMilestones.reduce((prev, curr) =>
                curr.year > prev.year ? curr : prev
            );
        }
    }

    return milestone;
}

/**
 * Belirli bir milestone için tarihi haritayı yükler
 * @param {Object} milestone - Milestone bilgisi
 * @param {number} year - Seçili yıl (tooltip için)
 * @returns {Promise<Object>} GeoJSON harita verisi
 */
export async function loadHistoricalMap(milestone, year = null) {
    try {
        const cacheKey = milestone.year;

        // Cache'te var mı kontrol et
        if (mapCache.has(cacheKey)) {
            console.log(`💾 Cache'ten yüklendi: ${milestone.year}`);
            const mapData = mapCache.get(cacheKey);

            setState('historicalMapData', mapData);
            setState('currentHistoricalMilestone', milestone);

            // Globe'a yükle
            const displayYear = year || milestone.year;
            loadHistoricalMapToGlobe(mapData, milestone, displayYear);

            // Başkent noktalarını yükle
            loadCapitalPointsToGlobe(displayYear);

            return mapData;
        }

        // Cache'te yok, yükle
        const mapPath = DATA_PATHS.historicalMapsBaseDir + milestone.path;
        console.log(`📍 Harita yükleniyor: ${milestone.year} (${milestone.source})`);
        console.log(`🔗 URL: ${mapPath}`);

        const response = await fetch(mapPath);
        if (!response.ok) {
            throw new Error(`Harita yükleme hatası: ${response.status} (${mapPath})`);
        }

        const mapData = await response.json();

        // Metadata ekle
        mapData.loadedMilestone = milestone;

        // Cache'e ekle
        mapCache.set(cacheKey, mapData);
        console.log(`✓ Harita yüklendi ve cache'lendi: ${mapData.features.length} feature`);

        setState('historicalMapData', mapData);
        setState('currentHistoricalMilestone', milestone);

        // Globe'a yükle
        const displayYear = year || milestone.year;
        loadHistoricalMapToGlobe(mapData, milestone, displayYear);

        // Başkent noktalarını yükle
        loadCapitalPointsToGlobe(displayYear);

        return mapData;
    } catch (error) {
        console.error('❌ Harita yükleme hatası:', error);
        return null;
    }
}

/**
 * V-Dem ülke adını tarihi ada çevirir
 * @param {string} vdemName - V-Dem'deki modern ad
 * @param {number} year - Hedef yıl
 * @returns {Object|null} Tarihi ad bilgisi
 */
export function getHistoricalName(vdemName, year) {
    const namesData = state.historicalNamesMapping;
    if (!namesData) {
        return null;
    }

    const mapping = namesData.mappings.find(m => m.vdem_name === vdemName);
    if (!mapping) {
        return null;
    }

    const period = mapping.historical_periods.find(p =>
        p.start_year <= year && year <= p.end_year
    );

    return period;
}

/**
 * GeoJSON ülke adını V-Dem adıyla eşleştirir
 * @param {string} geoJsonName - GeoJSON'daki ülke adı
 * @param {string} source - Veri kaynağı (Historical Basemaps, CShapes, vb.)
 * @returns {string} V-Dem ülke adı
 */
export function matchCountryToVDem(geoJsonName, source) {
    // CShapes formatı: "Turkey (Ottoman Empire)"
    if (source === 'CShapes 2.0') {
        // Parantez içindekini temizle
        const cleanName = geoJsonName.replace(/\s*\([^)]*\)/, '').trim();

        // COUNTRY_NAME_MAP'te ara
        if (COUNTRY_NAME_MAP[cleanName]) {
            return COUNTRY_NAME_MAP[cleanName];
        }

        return cleanName;
    }

    // Historical Basemaps formatı: "Ottoman Empire"
    if (source === 'Historical Basemaps') {
        // Özel eşleştirmeler
        const specialMappings = {
            'Ottoman Empire': 'Türkiye',
            'Russian Empire': 'Russia',
            'Qing Dynasty': 'China',
            'British India': 'India',
            'German Empire': 'Germany',
            'Austrian Empire': 'Austria',
            'Austria-Hungary': 'Austria'
        };

        if (specialMappings[geoJsonName]) {
            return specialMappings[geoJsonName];
        }

        // COUNTRY_NAME_MAP'te ara
        if (COUNTRY_NAME_MAP[geoJsonName]) {
            return COUNTRY_NAME_MAP[geoJsonName];
        }

        return geoJsonName;
    }

    // Natural Earth ve diğerleri için standart eşleştirme
    if (COUNTRY_NAME_MAP[geoJsonName]) {
        return COUNTRY_NAME_MAP[geoJsonName];
    }

    return geoJsonName;
}

/**
 * Tarihi harita için ülke tooltip metnini oluşturur
 * @param {Object} feature - GeoJSON feature
 * @param {number} year - Seçili yıl
 * @param {Object} milestone - Milestone bilgisi
 * @returns {string} Tooltip HTML
 */
export function createHistoricalTooltip(feature, year, milestone) {
    const props = feature.properties;

    // Ülke adını belirle (kaynak tipine göre)
    let geoJsonName;
    if (props.cntry_name) {
        // CShapes formatı
        geoJsonName = props.cntry_name;
    } else if (props.NAME) {
        // Historical Basemaps formatı
        geoJsonName = props.NAME;
    } else {
        geoJsonName = 'Bilinmiyor';
    }

    // V-Dem adıyla eşleştir
    const vdemName = matchCountryToVDem(geoJsonName, milestone.source);

    // Tarihi adı bul
    const historicalPeriod = getHistoricalName(vdemName, year);
    const displayName = historicalPeriod ? historicalPeriod.display_name : vdemName;

    // Tooltip içeriği
    let tooltip = `<strong>${displayName}</strong>`;

    // Başkent varsa ekle
    if (props.capname) {
        tooltip += `<br><small>Başkent: ${props.capname}</small>`;
    }

    // Tarihi dönem notu varsa ekle
    if (historicalPeriod && historicalPeriod.notes) {
        tooltip += `<br><small style="opacity: 0.8;">${historicalPeriod.notes}</small>`;
    }

    // Veri kaynağı bilgisi
    tooltip += `<br><small style="opacity: 0.6;">Kaynak: ${milestone.source} (${milestone.year})</small>`;

    return tooltip;
}

/**
 * Year slider'ı günceller
 * @param {number} year - Seçili yıl
 */
export function updateHistoricalYearSlider(year) {
    const slider = document.getElementById('historical-year-slider');
    const label = document.getElementById('historical-year-label');
    const sourceDisplay = document.getElementById('current-milestone-source');

    if (slider) slider.value = year;
    if (label) label.textContent = year;

    // Milestone bilgisini güncelle
    const milestone = getMilestoneForYear(year);
    if (milestone && sourceDisplay) {
        sourceDisplay.textContent = `${milestone.source} (${milestone.year})`;
    }

    setState('currentHistoricalYear', year);
}

/**
 * Historical Maps modunu aktif eder
 */
export async function enableHistoricalMaps() {
    console.log('🗺️  Historical Maps modu aktif ediliyor...');

    // createHistoricalTooltip'i window'a export et (globe.js erişimi için)
    window.createHistoricalTooltip = createHistoricalTooltip;

    // Eğer veriler yüklenmediyse yükle
    if (!state.historicalMapsIndex || !state.historicalNamesMapping) {
        const loaded = await loadHistoricalMapsData();
        if (!loaded) {
            console.error('❌ Historical Maps verileri yüklenemedi');
            return false;
        }
    }

    // İlk haritayı yükle (2023 - en güncel yıl)
    const initialYear = state.currentHistoricalYear || 2023;
    const milestone = getMilestoneForYear(initialYear);

    if (milestone) {
        await loadHistoricalMap(milestone, initialYear);
    }

    // UI güncelle
    updateHistoricalUI(true);

    // Event listener'ları ayarla
    setupHistoricalEventListeners();

    setState('historicalMapsEnabled', true);

    console.log('✓ Historical Maps modu aktif');
    return true;
}

/**
 * Historical Maps modunu devre dışı bırakır
 */
export function disableHistoricalMaps() {
    console.log('🗺️  Historical Maps modu devre dışı bırakılıyor...');

    updateHistoricalUI(false);

    setState('historicalMapsEnabled', false);
    setState('historicalMapData', null);

    console.log('✓ Historical Maps modu devre dışı');
}

/**
 * Historical Maps UI elementlerini göster/gizle
 * @param {boolean} show - Göster/gizle
 */
function updateHistoricalUI(show) {
    const controls = document.getElementById('historical-controls');
    const sliderContainer = document.getElementById('historical-year-slider-container');

    if (controls) {
        controls.style.display = show ? 'flex' : 'none';
    }

    if (sliderContainer) {
        sliderContainer.style.display = show ? 'block' : 'none';
    }
}

/**
 * Loading state göster/gizle
 */
function setLoadingState(isLoading) {
    const slider = document.getElementById('historical-year-slider');
    const container = document.getElementById('historical-year-slider-container');

    if (isLoading) {
        if (slider) slider.style.opacity = '0.5';
        if (container) container.style.pointerEvents = 'none';
        document.body.style.cursor = 'wait';
    } else {
        if (slider) slider.style.opacity = '1';
        if (container) container.style.pointerEvents = 'auto';
        document.body.style.cursor = 'default';
    }
}

/**
 * Historical Maps event listener'larını kurar
 */
export function setupHistoricalEventListeners() {
    if (state.historicalListenersBound) {
        return;
    }

    const slider = document.getElementById('historical-year-slider');
    if (slider) {
        let isDragging = false;
        let lastLoadedYear = null;

        // Harita yükleme fonksiyonu
        const loadMapForYear = async (year) => {
            // Aynı yıl tekrar yüklenmesin
            if (lastLoadedYear === year) {
                return;
            }

            const currentMilestone = state.currentHistoricalMilestone;
            const newMilestone = getMilestoneForYear(year);

            if (!newMilestone) {
                console.error('❌ Milestone bulunamadı:', year);
                return;
            }

            if (!currentMilestone || newMilestone.year !== currentMilestone.year) {
                setLoadingState(true);
                console.log(`🔄 Yeni harita yükleniyor: ${newMilestone.year}...`);

                try {
                    await loadHistoricalMap(newMilestone, year);
                    lastLoadedYear = year;
                    console.log(`✓ Harita yüklendi: ${newMilestone.year}`);
                } catch (error) {
                    console.error('❌ Harita yükleme hatası:', error);
                } finally {
                    setLoadingState(false);
                }
            } else {
                // Aynı milestone ama farklı yıl - sadece tooltip'i güncelle
                const mapData = state.historicalMapData;
                if (mapData) {
                    loadHistoricalMapToGlobe(mapData, newMilestone, year);
                    // Başkent noktalarını güncelle
                    loadCapitalPointsToGlobe(year);
                    lastLoadedYear = year;
                }
            }
        };

        // Mousedown - slider tutulduğunda
        slider.addEventListener('mousedown', (e) => {
            isDragging = true;
            // Slider kullanırken kürenin otomatik dönüşünü durdurmayalım
            e.stopPropagation();
        });

        // Mouseup - slider bırakıldığında haritayı yükle
        slider.addEventListener('mouseup', async (e) => {
            if (isDragging) {
                isDragging = false;
                const year = parseInt(e.target.value);
                await loadMapForYear(year);
            }
            // Slider kullanırken kürenin otomatik dönüşünü durdurmayalım
            e.stopPropagation();
        });

        // Input event - sadece UI güncelle (sürükleme sırasında)
        slider.addEventListener('input', (e) => {
            const year = parseInt(e.target.value);
            updateHistoricalYearSlider(year);
        });

        // Change event - klavye ile değiştirildiğinde
        slider.addEventListener('change', async (e) => {
            if (!isDragging) {
                const year = parseInt(e.target.value);
                await loadMapForYear(year);
            }
        });

        // Milestone tıklama
        document.addEventListener('click', async (e) => {
            if (e.target.classList.contains('timeline-milestone')) {
                const milestoneElement = e.target;
                const year = parseInt(milestoneElement.getAttribute('data-year'));
                if (year) {
                    slider.value = year;
                    updateHistoricalYearSlider(year);
                    await loadMapForYear(year);
                }
            }
        });

        console.log('✓ Historical Maps event listener\'ları kuruldu (mouseup optimized)');
    }

    setState('historicalListenersBound', true);
}

/**
 * Timeline üzerinde milestone marker'ları oluşturur
 */
export function renderTimelineMilestones() {
    const container = document.getElementById('timeline-milestone-markers');
    if (!container || !state.historicalMapsIndex) {
        return;
    }

    const milestones = state.historicalMapsIndex.milestones;
    const minYear = 1789;
    const maxYear = 2024;
    const range = maxYear - minYear;

    container.innerHTML = '';

    milestones.forEach(milestone => {
        const position = ((milestone.year - minYear) / range) * 100;

        const marker = document.createElement('div');
        marker.className = 'timeline-milestone';
        marker.style.left = `${position}%`;
        marker.title = `${milestone.year} - ${milestone.source}`;
        marker.setAttribute('data-year', milestone.year);

        // Önemli yılları vurgula
        const importantYears = [1783, 1815, 1886, 1914, 1923, 1945, 1989, 2019];
        if (importantYears.includes(milestone.year)) {
            marker.classList.add('important');
        }

        container.appendChild(marker);
    });

    console.log(`✓ ${milestones.length} milestone marker oluşturuldu`);
}

/**
 * Belirli bir ülke için belirli bir yıldaki başkent konumunu bulur
 * @param {string} vdemName - V-Dem ülke adı
 * @param {number} year - Hedef yıl
 * @returns {Object|null} Başkent bilgisi {capital, lat, lng}
 */
export function getCapitalForYear(vdemName, year) {
    const capitalsData = state.capitalCoordinates;
    if (!capitalsData || !capitalsData.capitals) {
        return null;
    }

    const countryCapitals = capitalsData.capitals[vdemName];
    if (!countryCapitals) {
        return null;
    }

    // Yıla uygun başkenti bul
    const capitalPeriod = countryCapitals.find(period =>
        period.start_year <= year && year <= period.end_year
    );

    return capitalPeriod || null;
}

/**
 * Belirli bir yıl için tüm başkent noktalarını oluşturur
 * @param {number} year - Hedef yıl
 * @returns {Array} Başkent noktaları listesi
 */
export function getCapitalPointsForYear(year) {
    const capitalsData = state.capitalCoordinates;
    const namesData = state.historicalNamesMapping;

    if (!capitalsData || !namesData) {
        return [];
    }

    const points = [];

    // Tüm ülkeler için başkent noktalarını oluştur
    Object.keys(capitalsData.capitals).forEach(vdemName => {
        const capitalInfo = getCapitalForYear(vdemName, year);
        if (!capitalInfo) {
            return;
        }

        // Tarihi adı bul
        const historicalPeriod = getHistoricalName(vdemName, year);
        const displayName = historicalPeriod ? historicalPeriod.display_name : vdemName;

        points.push({
            lat: capitalInfo.lat,
            lng: capitalInfo.lng,
            vdemName: vdemName,
            displayName: displayName,
            capital: capitalInfo.capital,
            year: year
        });
    });

    return points;
}

/**
 * Başkent noktası için tooltip metni oluşturur
 * @param {Object} point - Başkent noktası
 * @returns {string} Tooltip HTML
 */
export function createCapitalTooltip(point) {
    let tooltip = `<strong>${point.displayName}</strong>`;

    if (point.capital) {
        tooltip += `<br><small>${point.capital}</small>`;
    }

    return tooltip;
}

/**
 * Başkent noktalarını globe'a yükler
 * @param {number} year - Hedef yıl
 */
export function loadCapitalPointsToGlobe(year) {
    const globe = state.globe;
    if (!globe) {
        console.warn('⚠️  Globe hazır değil');
        return;
    }

    const points = getCapitalPointsForYear(year);

    if (points.length === 0) {
        console.warn('⚠️  Başkent noktası bulunamadı');
        return;
    }

    // Globe'a noktaları ekle
    globe
        .pointsData(points)
        .pointLat(d => d.lat)
        .pointLng(d => d.lng)
        .pointColor(() => '#ffffff')
        .pointAltitude(0.01)
        .pointRadius(0.3)
        .pointLabel(d => createCapitalTooltip(d))
        .onPointClick((point) => {
            if (point && point.vdemName) {
                console.log(`🗺️  Başkent noktasına tıklandı: ${point.displayName}`);
                openCountryPanel(point.vdemName);
            }
        })
        .onPointHover((point) => {
            if (globe && globe.controls()) {
                // Hover durumunda cursor pointer yap
                document.body.style.cursor = point ? 'pointer' : 'default';
            }
        });

    console.log(`✓ ${points.length} başkent noktası yüklendi (${year})`);
}
