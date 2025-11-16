/**
 * ATLAS İnteraktif - Ana JavaScript Dosyası
 * Daron Acemoğlu Teorileri İnteraktif Görselleştirme
 * 
 * Tüm modülleri yükler ve uygulamayı başlatır
 */

// Core modüller
import { setupNavigation } from './core/navigation.js';

// Panel ve Chat
import { setupPanelAndChat } from './modules/panel/panel-manager.js';
import { setupChat } from './modules/chat/chat-manager.js';

// Dar Koridor
import { loadDarKoridorData } from './modules/corridor/corridor-data.js';

/**
 * Uygulama başlatma
 */
window.addEventListener('DOMContentLoaded', async () => {
    console.log('%cATLAS İnteraktif - Daron Acemoğlu', 'color: #4CAF50; font-size: 20px; font-weight: bold;');
    console.log('Modüler Mimari ile Yeniden Yapılandırıldı');
    console.log('Özellikler:');
    console.log('- Teori sayfası ile 3D harita arasında geçiş');
    console.log('- Otomatik dönüş (etkileşime kadar)');
    console.log('- Fare ile döndürme');
    console.log('- Tekerlek ile zoom');
    console.log('- Ülkelere tıklama');
    
    try {
        console.log('1️⃣ Sayfa navigasyonu kuruluyor...');
        setupNavigation();
        
        console.log('2️⃣ Dar Koridor verileri yükleniyor...');
        await loadDarKoridorData();
        
        console.log('3️⃣ Panel ve Chat sistemi kuruluyor...');
        setupPanelAndChat();
        setupChat();
        
        console.log('✓ ATLAS İnteraktif başlatıldı');
        console.log('⚠️ Not: WGI ve bazı özellikler kademeli olarak eklenecek');
        
    } catch (error) {
        console.error('❌ Başlatma hatası:', error);
        console.error('Hata detayı:', error.message);
        console.error('Stack trace:', error.stack);
        alert('Uygulama başlatılırken bir hata oluştu:\n' + error.message + '\n\nKonsolda detayları görebilirsiniz.');
    }
});

/**
 * NOT: Bu modüler yapı kademeli olarak tamamlanacaktır.
 * Şu anda core fonksiyonlar çalışır durumda.
 * 
 * Tamamlanacak modüller:
 * - WGI (Worldwide Governance Indicators) tam implementasyonu
 * - Dar Koridor interaktif grafik özellikleri
 * - AI Chat tam implementasyonu
 * - Flat Map (2D harita) özellikleri
 * 
 * Geçici çözüm: Eski script.js dosyası yedek olarak saklanacak
 * ve eksik özellikler oradan çekilebilir.
 */

