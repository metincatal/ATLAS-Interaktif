/**
 * D3 Yükleme Yardımcı Fonksiyonları - ATLAS İnteraktif
 * D3 kütüphanesinin yüklenip yüklenmediğini kontrol eder ve bekler
 */

/**
 * D3'ün yüklenip yüklenmediğini kontrol eder
 * @returns {boolean} D3 yüklenmişse true, değilse false
 */
export function isD3Loaded() {
    return typeof window.d3 !== 'undefined' &&
           window.d3 !== null &&
           typeof window.d3.select === 'function';
}

/**
 * D3'ün yüklenmesini bekler
 * @param {number} maxWaitTime - Maksimum bekleme süresi (ms)
 * @param {number} checkInterval - Kontrol aralığı (ms)
 * @returns {Promise<boolean>} D3 yüklenirse true, timeout olursa false
 */
export function waitForD3(maxWaitTime = 5000, checkInterval = 100) {
    return new Promise((resolve) => {
        // D3 zaten yüklenmişse hemen döndür
        if (isD3Loaded()) {
            resolve(true);
            return;
        }

        const startTime = Date.now();

        const checkD3 = setInterval(() => {
            if (isD3Loaded()) {
                clearInterval(checkD3);
                console.log('✓ D3 kütüphanesi yüklendi');
                resolve(true);
            } else if (Date.now() - startTime > maxWaitTime) {
                clearInterval(checkD3);
                console.error('❌ D3 kütüphanesi yüklenemedi (timeout)');
                resolve(false);
            }
        }, checkInterval);
    });
}

/**
 * D3 kütüphanesini döndürür (yüklenmişse)
 * @returns {object|null} D3 objesi veya null
 */
export function getD3() {
    return isD3Loaded() ? window.d3 : null;
}
