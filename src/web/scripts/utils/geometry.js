/**
 * Geometri Hesaplamaları - ATLAS İnteraktif
 */

/**
 * Nokta pozisyonunu günceller (Dar Koridor grafiğinde)
 */
export function updateDotPosition(graphic, img, dot, xPercent, yPercent) {
    const computedStyle = window.getComputedStyle(graphic);
    const paddingLeft = parseFloat(computedStyle.paddingLeft);
    const paddingTop = parseFloat(computedStyle.paddingTop);
    
    const imgRect = img.getBoundingClientRect();
    const imgWidth = imgRect.width;
    const imgHeight = imgRect.height;
    
    const dotLeft = paddingLeft + (imgWidth * xPercent / 100);
    const dotTop = paddingTop + (imgHeight * yPercent / 100);
    
    dot.style.left = `${dotLeft}px`;
    dot.style.top = `${dotTop}px`;
}

/**
 * Dar Koridor pozisyon hesaplama
 * StatePower ve SocietyPower (-3 ile +3 arası) değerlerini yüzdeye çevirir
 */
export function calculateCorridorPosition(statePower, societyPower) {
    // X ekseni: SocietyPower (Toplum Gücü) - soldan sağa
    const xPercent = ((societyPower + 3) / 6) * 100;
    // Y'yi ters çeviriyoruz çünkü grafik koordinatları üstten başlar
    const yPercent = 100 - ((statePower + 3) / 6) * 100;
    
    return { x: xPercent, y: yPercent };
}

