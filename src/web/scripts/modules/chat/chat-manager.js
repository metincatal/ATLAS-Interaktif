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
        document.getElementById('blur-overlay').classList.add('active');
        chatInput.focus();
    });
    
    // Chat kapatma
    closeChat.addEventListener('click', () => {
        chatArea.classList.remove('active');
        chatTrigger.style.display = 'flex';
        const panel = document.getElementById('country-panel');
        if (!panel.classList.contains('active')) {
            document.getElementById('blur-overlay').classList.remove('active');
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
            const response = await sendToOllama(message);
            addMessage(response, 'ai');
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
 * Ollama'ya mesaj gönderir
 */
async function sendToOllama(userMessage) {
    // Conversation history'ye ekle
    state.conversationHistory.push({
        role: 'user',
        content: userMessage
    });
    
    // Typing indicator göster
    const typingDiv = document.createElement('div');
    typingDiv.className = 'ai-message';
    typingDiv.innerHTML = '<span class="typing-indicator">...</span>';
    document.getElementById('chat-messages').appendChild(typingDiv);
    
    try {
        const response = await fetch(getOllamaUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: API_CONFIG.ollama.model,
                prompt: `${SYSTEM_PROMPT}\n\nKullanıcı: ${userMessage}\n\nAsistan:`,
                stream: false,
                options: API_CONFIG.ollama.options
            })
        });
        
        // Typing indicator'ı kaldır
        typingDiv.remove();
        
        if (!response.ok) {
            throw new Error(`Ollama API hatası: ${response.status}`);
        }
        
        const data = await response.json();
        const aiResponse = data.response || 'Yanıt alınamadı';
        
        // Conversation history'ye ekle
        state.conversationHistory.push({
            role: 'assistant',
            content: aiResponse
        });
        
        return aiResponse;
        
    } catch (error) {
        typingDiv.remove();
        console.error('Ollama bağlantı hatası:', error);
        throw error;
    }
}

