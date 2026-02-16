/**
 * Geometri Hesaplamaları - ATLAS İnteraktif
 */

/**
 * Image'ın container içindeki gerçek render alanını hesaplar
 * object-fit: contain kullanıldığında image, container'dan küçük olabilir
 * Bu fonksiyon image'ın gerçek boyutlarını ve offset'ini döndürür
 */
export function getImageRenderBounds(img) {
    const containerWidth = img.clientWidth;
    const containerHeight = img.clientHeight;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    
    // Eğer natural boyutlar yoksa (image henüz yüklenmemiş)
    if (!naturalWidth || !naturalHeight) {
        return {
            offsetX: 0,
            offsetY: 0,
            width: containerWidth,
            height: containerHeight
        };
    }
    
    // Aspect ratio hesapla
    const containerRatio = containerWidth / containerHeight;
    const imageRatio = naturalWidth / naturalHeight;
    
    let renderWidth, renderHeight, offsetX, offsetY;
    
    if (imageRatio > containerRatio) {
        // Image daha geniş - yatay olarak fit, dikey olarak ortalanır
        renderWidth = containerWidth;
        renderHeight = containerWidth / imageRatio;
        offsetX = 0;
        offsetY = (containerHeight - renderHeight) / 2;
    } else {
        // Image daha uzun - dikey olarak fit, yatay olarak ortalanır
        renderHeight = containerHeight;
        renderWidth = containerHeight * imageRatio;
        offsetX = (containerWidth - renderWidth) / 2;
        offsetY = 0;
    }
    
    return {
        offsetX,
        offsetY,
        width: renderWidth,
        height: renderHeight
    };
}

/**
 * Nokta pozisyonunu günceller (Dar Koridor grafiğinde)
 * object-fit: contain durumunu da destekler
 * @returns {boolean} - Başarılı ise true, image yüklenmemişse false
 */
export function updateDotPosition(graphic, img, dot, xPercent, yPercent) {
    // Image yüklenmemişse false döndür
    if (!img.naturalWidth || !img.naturalHeight) {
        dot.style.display = 'none';
        return false;
    }
    
    // Image'ın gerçek render alanını hesapla
    const bounds = getImageRenderBounds(img);
    
    // Pixel pozisyonunu hesapla
    const dotLeft = bounds.offsetX + (bounds.width * xPercent / 100);
    const dotTop = bounds.offsetY + (bounds.height * yPercent / 100);
    
    dot.style.left = `${dotLeft}px`;
    dot.style.top = `${dotTop}px`;
    dot.style.display = 'block';
    
    return true;
}

/**
 * Dar Koridor pozisyon hesaplama
 * StatePower ve SocietyPower (-3 ile +3 arası) değerlerini yüzdeye çevirir
 */
export function calculateCorridorPosition(statePower, societyPower) {
    // Faktör sınırları
    const FACTOR_MIN = -3;
    const FACTOR_MAX = 3;
    const MARGIN = 3; // Kenar boşluğu
    
    // Faktör değerlerini sınırla
    const clampedStatePower = Math.max(FACTOR_MIN, Math.min(FACTOR_MAX, statePower || 0));
    const clampedSocietyPower = Math.max(FACTOR_MIN, Math.min(FACTOR_MAX, societyPower || 0));
    
    // X ekseni: SocietyPower (Toplum Gücü) - soldan sağa
    // -3 → 0%, 0 → 50%, +3 → 100%
    let xPercent = ((clampedSocietyPower - FACTOR_MIN) / (FACTOR_MAX - FACTOR_MIN)) * 100;
    
    // Y ekseni: StatePower (Devlet Gücü) - alttan yukarıya
    // Y'yi ters çeviriyoruz çünkü grafik koordinatları üstten başlar
    // -3 → 100% (alt), 0 → 50% (orta), +3 → 0% (üst)
    let yPercent = 100 - ((clampedStatePower - FACTOR_MIN) / (FACTOR_MAX - FACTOR_MIN)) * 100;
    
    // Kesin sınırlandırma: koordinatlar her zaman grafik içinde olmalı
    xPercent = Math.max(MARGIN, Math.min(100 - MARGIN, xPercent));
    yPercent = Math.max(MARGIN, Math.min(100 - MARGIN, yPercent));
    
    return { x: xPercent, y: yPercent };
}
