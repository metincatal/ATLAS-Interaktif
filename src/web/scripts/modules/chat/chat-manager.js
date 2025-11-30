/**
 * Chat Yöneticisi - ATLAS İnteraktif  
 * AI Chat UI yönetimi
 */

import { state, setState } from '../../core/state.js';
import { API_CONFIG, getOllamaUrl, SYSTEM_PROMPT } from '../../config/api-config.js';

/**
 * Chat sistemini kurar
 */
export function setupChat() {
    const chatTrigger = document.querySelector('.chat-trigger');
    const chatArea = document.getElementById('chat-area');
    const closeChat = document.getElementById('close-chat');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-chat');
    const chatMessages = document.getElementById('chat-messages');
    
    if (!chatTrigger || !chatArea) {
        console.warn('Chat elementleri bulunamadı');
        return;
    }
    
    // Chat tetikleme
    chatTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        chatArea.classList.add('active');
        chatTrigger.style.display = 'none';
        const blurOverlay = document.getElementById('blur-overlay');
        blurOverlay.classList.add('active', 'chat-mode');
        chatInput.focus();
    });

    // Chat kapatma
    closeChat.addEventListener('click', () => {
        chatArea.classList.remove('active');
        chatTrigger.style.display = 'flex';
        const blurOverlay = document.getElementById('blur-overlay');
        const panel = document.getElementById('country-panel');
        blurOverlay.classList.remove('chat-mode');
        if (!panel.classList.contains('active')) {
            blurOverlay.classList.remove('active');
        }
    });
    
    // Mesaj gönderme
    const sendMessage = async () => {
        const message = chatInput.value.trim();
        if (!message) return;
        
        // Kullanıcı mesajını ekle
        addMessage(message, 'user');
        chatInput.value = '';
        chatInput.disabled = true;
        sendBtn.disabled = true;
        
        // AI cevabı al
        try {
            await sendToOllama(message);
        } catch (error) {
            console.error('Chat hatası:', error);
            addMessage('Üzgünüm, şu anda mesajınıza yanıt veremiyorum. Lütfen Ollama servisinin çalıştığından emin olun.', 'ai');
        }
        
        chatInput.disabled = false;
        sendBtn.disabled = false;
        chatInput.focus();
    };
    
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    console.log('✓ Chat yöneticisi hazır');
}

/**
 * Chat'e mesaj ekler
 */
function addMessage(text, type) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'user' ? 'user-message' : 'ai-message';
    messageDiv.textContent = text;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Ollama'ya mesaj gönderir (Stream mode)
 */
async function sendToOllama(userMessage) {
    // Conversation history'ye ekle
    state.conversationHistory.push({
        role: 'user',
        content: userMessage
    });

    // AI mesajı için div oluştur
    const chatMessages = document.getElementById('chat-messages');
    const aiMessageDiv = document.createElement('div');
    aiMessageDiv.className = 'ai-message';
    aiMessageDiv.textContent = '';
    chatMessages.appendChild(aiMessageDiv);

    let fullResponse = '';

    try {
        const response = await fetch(getOllamaUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: API_CONFIG.ollama.model,
                prompt: `${SYSTEM_PROMPT}\n\nKullanıcı: ${userMessage}\n\nAsistan:`,
                stream: true,
                options: API_CONFIG.ollama.options
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama API hatası: ${response.status}`);
        }

        // Stream'i oku
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            // Chunk'ı decode et
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
                try {
                    const data = JSON.parse(line);

                    if (data.response) {
                        fullResponse += data.response;
                        aiMessageDiv.textContent = fullResponse;
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }

                    if (data.done) {
                        break;
                    }
                } catch (e) {
                    // JSON parse hatası - devam et
                    console.warn('JSON parse hatası:', e);
                }
            }
        }

        // Conversation history'ye ekle
        state.conversationHistory.push({
            role: 'assistant',
            content: fullResponse
        });

        return fullResponse;

    } catch (error) {
        aiMessageDiv.remove();
        console.error('Ollama bağlantı hatası:', error);
        throw error;
    }
}

