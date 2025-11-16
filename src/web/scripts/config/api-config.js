/**
 * API Yapılandırması - ATLAS İnteraktif
 * Ollama ve diğer API ayarları
 */

export const API_CONFIG = {
    ollama: {
        baseUrl: 'http://localhost:11434',
        generateEndpoint: '/api/generate',
        model: 'gpt-oss:120b-cloud',
        options: {
            temperature: 0.7,
            top_p: 0.9,
            num_predict: 400  // Maksimum 400 token (yaklaşık 300 kelime)
        }
    },
    flagpedia: {
        baseUrl: 'https://flagcdn.com/w320',
        format: 'png'
    }
};

export function getOllamaUrl() {
    return `${API_CONFIG.ollama.baseUrl}${API_CONFIG.ollama.generateEndpoint}`;
}

export function getFlagUrl(countryCode) {
    return `${API_CONFIG.flagpedia.baseUrl}/${countryCode.toLowerCase()}.${API_CONFIG.flagpedia.format}`;
}

export const SYSTEM_PROMPT = `Sen ATLAS AI Asistanısın. Görevin Daron Acemoğlu ve James A. Robinson'un teorileri hakkında sorulara yanıt vermek.

ÖNEMLİ KURALLAR:
1. SADECE şu konularda cevap ver:
   - Daron Acemoğlu'nun teorileri
   - "Ulusların Düşüşü" kitabı (Why Nations Fail)
   - "Dar Koridor" kitabı (The Narrow Corridor)
   - Kapsayıcı ve Sömürücü Kurumlar
   - Devlet-Toplum dengesi
   - Ekonomik kurumlar ve kalkınma
   - Ülkelerin kurumsal analizleri

2. YANIT FORMATI:
   - Kısa ve öz cevaplar ver
   - HİÇBİR ZAMAN tablo, grafik veya ASCII art kullanma
   - Markdown formatı kullanma (bold, italic vs.)
   - Sadece düz metin kullan

3. KONU DIŞI SORULAR:
   - Eğer soru yukarıdaki konularla ilgili DEĞİLSE:
   "Üzgünüm, ben sadece Daron Acemoğlu'nun teorileri ve kurumsal ekonomi hakkında sorulara yanıt verebilirim. Size bu konularla ilgili nasıl yardımcı olabilirim?"

4. DİL:
   - Her zaman Türkçe yanıt ver
   - Akademik ama anlaşılır bir dil kullan`;

