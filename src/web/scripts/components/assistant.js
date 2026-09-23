/**
 * ATLAS Asistanı
 *
 * Yapay zekâ bağlı olmasa da çalışır: öneri düğmeleri kuramı ve seçili ülkeyi
 * veriyle açıklayan hazır yanıtlar üretir. Serbest sorular için isteğe bağlı
 * olarak yerel bir model (Ollama) ya da OpenAI uyumlu bir uç nokta bağlanabilir.
 */

import { icon } from '../core/icons.js';
import { esc } from '../core/dom.js';
import { load, save, context, on } from '../core/store.js';
import { countryStory, contextLine } from '../core/narrative.js';
import { countryName, db } from '../core/data.js';
import { TYPES } from '../core/theory.js';

const DEFAULTS = { provider: 'ollama', ollamaUrl: 'http://localhost:11434', model: '', openaiUrl: 'http://localhost:1234/v1', apiKey: '' };

const SYSTEM_PROMPT = `Sen ATLAS İnteraktif'in asistanısın. Daron Acemoğlu ve James A. Robinson'un "Ulusların Düşüşü" (Why Nations Fail, 2012) ve "Dar Koridor" (The Narrow Corridor, 2019) kitaplarındaki kavramları ve bu uygulamadaki verileri açıklarsın.

Uygulamanın verisi hakkında bilmen gerekenler:
- Her ülke-yıl için iki puan vardır: "devletin gücü" ve "toplumun gücü". 1996 sonrası WGI (5 yönetişim göstergesi) ve V-Dem'den (5 sivil alan göstergesi), 1789–1995 arası yalnızca V-Dem'den; her gösterge her yıl kendi içinde standartlaştırılır, iki faktörlü varimax faktör analiziyle puanlar çıkarılır. Puanlar görelidir: o yılın dünya ortalamasına göre z-puanıdır.
- Tüm ülke-yıllar K-ortalamalar (k=4) ile dört kümeye ayrılır ve kümeler Zincirlenmiş, Despotik, Kâğıttan ve Namevcut Leviathan olarak adlandırılır. Bu, kitabın kavramlarının veriye dayalı bir yorumudur; yazarların kendi sınıflandırması değildir.

Yanıt kuralları:
- Türkçe, açık ve dengeli yaz; çoğu yanıt 2–4 kısa paragrafı geçmesin. Gerekirse kısa madde işaretleri kullan.
- Kitaplardaki kavramları doğru kullan: kapsayıcı/sömürücü kurumlar, yaratıcı yıkım, kritik kavşaklar, Kızıl Kraliçe etkisi, normlar kafesi.
- Emin olmadığın olgusal bilgiyi belirt; kaynak, alıntı ya da istatistik uydurma. Uygulamanın verdiği sayıları kullanabilirsin.
- Güncel siyasette taraf tutma; kurumsal mekanizmaları ve farklı yorumları açıkla.`;

const QUICK = [
    { id: 'corridor', label: 'Dar koridor nedir?' },
    { id: 'redqueen', label: 'Kızıl Kraliçe etkisi' },
    { id: 'institutions', label: 'Kapsayıcı ve sömürücü kurumlar' },
    { id: 'method', label: 'Puanlar nasıl hesaplanıyor?' },
    { id: 'country', label: null },
];

const ANSWERS = {
    corridor: `**Dar koridor**, Acemoğlu ve Robinson'un özgürlüğün koşulunu anlatmak için kullandığı imgedir. Bir eksende devletin gücü, diğerinde toplumun gücü vardır.

- Devlet toplumdan çok güçlüyse **Despotik Leviathan** ortaya çıkar: düzen vardır ama özgürlük yoktur.
- Devlet zayıf, toplum güçlüyse **Namevcut Leviathan**: merkezî otorite yoktur ve gelenekler, “normlar kafesi” bireyleri kısıtlar.
- İkisi de zayıfsa **Kâğıttan Leviathan**: kâğıt üzerinde güçlü görünen ama uygulamada ne düzen ne özgürlük sağlayan kurumlar.

Özgürlük, ikisinin birlikte güçlendiği ve birbirini dengelediği dar alanda, **Zincirlenmiş Leviathan**'da yaşar. Koridor dardır, çünkü bu dengeyi korumak sürekli çaba ister.`,
    redqueen: `**Kızıl Kraliçe etkisi**, adını *Alice Aynanın İçinde*'deki Kızıl Kraliçe'den alır: “Aynı yerde kalabilmek için olabildiğince hızlı koşman gerekir.”

Koridordaki ülkelerde devlet kapasitesini artırdıkça toplum da örgütlenip denetimini güçlendirir; toplum güçlendikçe devlet de yeni görevler üstlenir. Bu yarış iki tarafı da büyütür. Taraflardan biri geride kalırsa denge bozulur: toplum yetişemezse despotizme, devlet yetişemezse kaosa ya da güçsüzlüğe kayılır.

Oyundaki danışman notları ve ülke profillerindeki “denge” cümleleri bu fikre dayanır.`,
    institutions: `*Ulusların Düşüşü*'nün temel ayrımı:

- **Kapsayıcı kurumlar** güvenceli mülkiyet hakları, herkese eşit işleyen hukuk, serbest giriş ve rekabet ile geniş katılımlı, denetlenebilir siyasi güç sunar. Toplumun büyük kesimini ekonomik ve siyasi hayata katar; yenilik ve yatırım teşvik edilir.
- **Sömürücü kurumlar** kaynakları dar bir elitin denetiminde toplar; tekeller, keyfî el koyma ve hesap vermeyen bir iktidar vardır. Elit, konumunu tehdit eden **yaratıcı yıkımı** engeller.

Kurumlar kendini yeniden üretme eğilimindedir (erdemli ve kısır döngüler); büyük değişimler çoğu zaman salgın, savaş ya da ticaret şoku gibi **kritik kavşaklarda** olur.`,
    method: `Uygulamadaki her konum aynı dört adımla hesaplanır:

1. **Göstergeler.** 1996 sonrası Dünya Bankası WGI'dan 5 yönetişim (hukukun üstünlüğü, hükümet etkinliği, yolsuzluk kontrolü, düzenleyici kalite, siyasi istikrar) ve V-Dem'den 5 sivil alan göstergesi; 1789–1995 için V-Dem'in 17 tarihî göstergesi.
2. **Yıllık standartlaştırma.** Her gösterge her yıl kendi içinde z-puanına çevrilir, yani puanlar o yılın dünya ortalamasına göredir.
3. **Faktör analizi.** Varimax rotasyonlu iki faktör çıkarılır: yönetişimden “devletin gücü”, sivil alandan “toplumun gücü”.
4. **Kümeleme.** Tüm ülke-yıllar K-ortalamalarla (k = 4) dört kümeye ayrılır ve kümeler dört Leviathan tipine eşlenir.

Puanlar göreli olduğu için bir ülke, kendisi değişmeden de başkaları ilerlediğinde geriye düşmüş görünebilir.`,
};

let state = { open: false, busy: false, messages: [], settingsOpen: false, controller: null };
let drawer = null;

export function initAssistant(trigger) {
    drawer = document.createElement('aside');
    drawer.className = 'drawer assistant';
    drawer.setAttribute('aria-label', 'ATLAS Asistanı');
    drawer.innerHTML = `
        <div class="drawer-head">
            <span class="assistant-mark">${icon('sparkle')}</span>
            <div class="grow"><div style="font-weight:600">Asistan</div><div class="tiny faint" data-status>Hazır yanıtlar · yapay zekâ bağlı değil</div></div>
            <button class="icon-btn plain" type="button" data-settings aria-label="Bağlantı ayarları" aria-expanded="false">${icon('settings')}</button>
            <button class="icon-btn plain" type="button" data-close aria-label="Asistanı kapat">${icon('x')}</button>
        </div>
        <div class="assistant-settings" data-settings-panel hidden></div>
        <div class="drawer-body" data-log aria-live="polite"></div>
        <div class="assistant-quick" data-quick></div>
        <form class="drawer-foot assistant-form" data-form>
            <label class="sr-only" for="assistant-input">Sorunuz</label>
            <textarea id="assistant-input" rows="1" placeholder="Bir soru sorun…" data-input></textarea>
            <button class="icon-btn" type="submit" aria-label="Gönder" data-send>${icon('send')}</button>
        </form>`;
    document.body.append(drawer);

    drawer.querySelector('[data-close]').addEventListener('click', close);
    drawer.querySelector('[data-settings]').addEventListener('click', toggleSettings);
    drawer.querySelector('[data-form]').addEventListener('submit', (e) => {
        e.preventDefault();
        const input = drawer.querySelector('[data-input]');
        const text = input.value.trim();
        if (!text || state.busy) return;
        input.value = '';
        autoGrow(input);
        ask(text);
    });
    const input = drawer.querySelector('[data-input]');
    input.addEventListener('input', () => autoGrow(input));
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            drawer.querySelector('[data-form]').requestSubmit();
        }
    });
    drawer.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close();
    });
    trigger?.addEventListener('click', () => (state.open ? close() : openAssistant()));
    on('context', renderQuick);
    renderLog();
    renderQuick();
    refreshStatus();
}

function autoGrow(el) {
    el.style.height = 'auto';
    el.style.height = `${Math.min(140, el.scrollHeight)}px`;
}

export function openAssistant(prompt = null) {
    if (!drawer) return;
    state.open = true;
    drawer.classList.add('open');
    document.querySelector('[data-assistant-trigger]')?.setAttribute('aria-expanded', 'true');
    renderQuick();
    setTimeout(() => drawer.querySelector('[data-input]')?.focus(), 60);
    if (prompt) ask(prompt);
}

function close() {
    state.open = false;
    drawer.classList.remove('open');
    const trigger = document.querySelector('[data-assistant-trigger]');
    trigger?.setAttribute('aria-expanded', 'false');
    trigger?.focus();
}

// ---------------------------------------------------------------- mesajlar
function renderLog() {
    const log = drawer.querySelector('[data-log]');
    if (!state.messages.length) {
        log.innerHTML = `<div class="assistant-intro">
            <p class="title-2">Merhaba.</p>
            <p class="muted small">Kuram, veriler ya da haritada seçtiğiniz ülke hakkında sorabilirsiniz. Aşağıdaki öneriler her zaman çalışır; serbest sorular için ayarlardan bir yerel yapay zekâ modeli bağlayabilirsiniz.</p>
        </div>`;
        return;
    }
    log.innerHTML = state.messages
        .map(
            (m) => `<div class="msg ${m.role}">${m.role === 'assistant' ? `<div class="msg-meta">${m.source === 'local' ? 'Hazır yanıt' : m.source === 'error' ? 'Bağlantı yok' : 'Yapay zekâ'}</div>` : ''}<div class="msg-body">${m.role === 'user' ? esc(m.content) : md(m.content)}</div></div>`,
        )
        .join('');
    log.scrollTop = log.scrollHeight;
}

function renderQuick() {
    if (!drawer) return;
    const box = drawer.querySelector('[data-quick]');
    const items = QUICK.map((q) => {
        if (q.id !== 'country') return q;
        if (!context.country) return null;
        return { id: 'country', label: `${countryName(context.country)} neden bu bölgede?` };
    }).filter(Boolean);
    box.innerHTML = items.map((q) => `<button type="button" class="quick" data-q="${q.id}">${esc(q.label)}</button>`).join('');
    box.querySelectorAll('[data-q]').forEach((b) =>
        b.addEventListener('click', () => {
            const id = b.dataset.q;
            const label = b.textContent;
            state.messages.push({ role: 'user', content: label });
            state.messages.push({ role: 'assistant', content: localAnswer(id), source: 'local' });
            renderLog();
        }),
    );
}

function localAnswer(id) {
    if (id !== 'country') return ANSWERS[id];
    const cid = context.country;
    const year = context.year || db.lastYear;
    const story = countryStory(cid, year);
    const p = story.point;
    if (!p) return story.sentences.join(' ');
    const t = TYPES[p.type];
    return `**${countryName(cid)}, ${p.year}: ${t.long}.** ${t.desc}\n\n${story.sentences.join(' ')}\n\nBu sınıflandırma verideki kümelerin bir yorumudur; ayrıntı için Kuram sayfasındaki yöntem bölümüne bakabilirsiniz.`;
}

// ---------------------------------------------------------------- yapay zekâ
function settings() {
    return { ...DEFAULTS, ...(load('assistant', {}) || {}) };
}

async function ask(text) {
    state.messages.push({ role: 'user', content: text });
    const reply = { role: 'assistant', content: '', source: 'ai' };
    state.messages.push(reply);
    state.busy = true;
    setBusy(true);
    renderLog();
    const body = drawer.querySelector('.msg:last-child .msg-body');
    body.innerHTML = '<span class="typing"><span></span><span></span><span></span></span>';

    const cfg = settings();
    const contextNote = context.country ? `\n\nKullanıcının şu an baktığı veri: ${contextLine(context.country, context.year || db.lastYear)}` : '';
    const history = state.messages
        .slice(0, -1)
        .filter((m) => m.source !== 'error')
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));
    const messages = [{ role: 'system', content: SYSTEM_PROMPT + contextNote }, ...history];

    try {
        state.controller = new AbortController();
        const stream = cfg.provider === 'openai' ? streamOpenAI(cfg, messages, state.controller.signal) : streamOllama(cfg, messages, state.controller.signal);
        for await (const piece of stream) {
            reply.content += piece;
            body.innerHTML = md(reply.content);
            drawer.querySelector('[data-log]').scrollTop = 1e9;
        }
        if (!reply.content.trim()) throw new Error('Boş yanıt');
        setStatus(`${cfg.provider === 'openai' ? 'OpenAI uyumlu' : 'Ollama'} · ${cfg.model || 'varsayılan model'}`);
    } catch (error) {
        if (error.name === 'AbortError') return;
        reply.source = 'error';
        reply.content = `Yapay zekâya bağlanılamadı (${error.message}).\n\nYine de yukarıdaki **öneri düğmeleri** kuramı ve seçili ülkeyi veriyle açıklar. Serbest sorular için sağ üstteki ayarlar düğmesinden yerel bir model bağlayın:\n\n1. [ollama.com](https://ollama.com) adresinden Ollama'yı kurun ve bir model indirin: \`ollama pull llama3.1\`\n2. Tarayıcının bağlanabilmesi için sunucuyu şöyle başlatın: \`OLLAMA_ORIGINS="*" ollama serve\``;
        body.innerHTML = md(reply.content);
        drawer.querySelector('.msg:last-child .msg-meta').textContent = 'Bağlantı yok';
    } finally {
        state.busy = false;
        state.controller = null;
        setBusy(false);
    }
}

async function* streamOllama(cfg, messages, signal) {
    let model = cfg.model;
    if (!model) {
        const tags = await fetch(`${cfg.ollamaUrl}/api/tags`, { signal }).then((r) => r.json());
        model = tags.models?.[0]?.name;
        if (!model) throw new Error('Ollama’da yüklü model yok');
    }
    const res = await fetch(`${cfg.ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: true, options: { temperature: 0.5 } }),
        signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    yield* readLines(res, (line) => {
        const data = JSON.parse(line);
        if (data.error) throw new Error(data.error);
        return data.message?.content || '';
    });
}

async function* streamOpenAI(cfg, messages, signal) {
    const headers = { 'Content-Type': 'application/json' };
    if (cfg.apiKey) headers.Authorization = `Bearer ${cfg.apiKey}`;
    const res = await fetch(`${cfg.openaiUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ model: cfg.model || 'local-model', messages, stream: true, temperature: 0.5 }),
        signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    yield* readLines(res, (line) => {
        if (!line.startsWith('data:')) return '';
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') return '';
        return JSON.parse(payload).choices?.[0]?.delta?.content || '';
    });
}

/** Parça sınırlarında bölünen satırları doğru birleştirerek akışı okur */
async function* readLines(res, parse) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (line) yield parse(line);
        }
    }
    if (buffer.trim()) yield parse(buffer.trim());
}

function setBusy(busy) {
    const send = drawer.querySelector('[data-send]');
    send.disabled = busy;
    send.setAttribute('aria-busy', String(busy));
}

function setStatus(text) {
    drawer.querySelector('[data-status]').textContent = text;
}

async function refreshStatus() {
    const cfg = settings();
    if (!load('assistant')) return; // Kullanıcı hiç ayar yapmadıysa arka planda istek atma
    try {
        const url = cfg.provider === 'openai' ? `${cfg.openaiUrl.replace(/\/$/, '')}/models` : `${cfg.ollamaUrl}/api/tags`;
        const res = await fetch(url, { signal: AbortSignal.timeout?.(2500) });
        if (!res.ok) throw new Error();
        setStatus(`${cfg.provider === 'openai' ? 'OpenAI uyumlu' : 'Ollama'} bağlı`);
    } catch {
        setStatus('Hazır yanıtlar · yapay zekâ bağlı değil');
    }
}

function toggleSettings() {
    state.settingsOpen = !state.settingsOpen;
    const panel = drawer.querySelector('[data-settings-panel]');
    drawer.querySelector('[data-settings]').setAttribute('aria-expanded', String(state.settingsOpen));
    panel.hidden = !state.settingsOpen;
    if (!state.settingsOpen) return;
    const cfg = settings();
    panel.innerHTML = `
        <form class="stack" data-settings-form>
            <div class="segmented compact" role="group" aria-label="Sağlayıcı">
                <button type="button" data-provider="ollama" aria-pressed="${cfg.provider === 'ollama'}">Ollama (yerel)</button>
                <button type="button" data-provider="openai" aria-pressed="${cfg.provider === 'openai'}">OpenAI uyumlu</button>
            </div>
            <div data-ollama ${cfg.provider === 'ollama' ? '' : 'hidden'}>
                <label class="label" for="as-ollama">Ollama adresi</label>
                <input class="input" id="as-ollama" name="ollamaUrl" value="${esc(cfg.ollamaUrl)}">
            </div>
            <div data-openai ${cfg.provider === 'openai' ? '' : 'hidden'} class="stack">
                <div><label class="label" for="as-openai">Uç nokta (…/v1)</label><input class="input" id="as-openai" name="openaiUrl" value="${esc(cfg.openaiUrl)}"></div>
                <div><label class="label" for="as-key">API anahtarı (isteğe bağlı)</label><input class="input" id="as-key" name="apiKey" type="password" value="${esc(cfg.apiKey)}" autocomplete="off"></div>
            </div>
            <div><label class="label" for="as-model">Model</label><input class="input" id="as-model" name="model" value="${esc(cfg.model)}" placeholder="Boş bırakılırsa ilk yüklü model"></div>
            <p class="tiny faint">Ayarlar yalnızca bu tarayıcıda saklanır. Tarayıcıdan erişim için Ollama’yı <code>OLLAMA_ORIGINS="*" ollama serve</code> ile başlatın.</p>
            <div class="row"><button class="btn btn-primary btn-sm" type="submit">Kaydet ve dene</button><button class="btn btn-ghost btn-sm" type="button" data-reset>Varsayılana dön</button></div>
        </form>`;
    let provider = cfg.provider;
    panel.querySelectorAll('[data-provider]').forEach((b) =>
        b.addEventListener('click', () => {
            provider = b.dataset.provider;
            panel.querySelectorAll('[data-provider]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
            panel.querySelector('[data-ollama]').hidden = provider !== 'ollama';
            panel.querySelector('[data-openai]').hidden = provider !== 'openai';
        }),
    );
    panel.querySelector('[data-reset]').addEventListener('click', () => {
        save('assistant', null);
        toggleSettings();
        setStatus('Hazır yanıtlar · yapay zekâ bağlı değil');
    });
    panel.querySelector('[data-settings-form]').addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        save('assistant', { provider, ollamaUrl: f.get('ollamaUrl') || DEFAULTS.ollamaUrl, openaiUrl: f.get('openaiUrl') || DEFAULTS.openaiUrl, apiKey: f.get('apiKey') || '', model: f.get('model') || '' });
        setStatus('Bağlantı deneniyor…');
        await refreshStatus();
        toggleSettings();
    });
}

// ---------------------------------------------------------------- mini markdown
function md(text) {
    const lines = esc(text).split('\n');
    let html = '';
    let list = null;
    const inline = (s) =>
        s
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    for (const raw of lines) {
        const line = raw.trimEnd();
        const ul = line.match(/^\s*[-•]\s+(.*)/);
        const ol = line.match(/^\s*\d+[.)]\s+(.*)/);
        if (ul || ol) {
            const kind = ul ? 'ul' : 'ol';
            if (list !== kind) {
                if (list) html += `</${list}>`;
                html += `<${kind}>`;
                list = kind;
            }
            html += `<li>${inline((ul || ol)[1])}</li>`;
            continue;
        }
        if (list) {
            html += `</${list}>`;
            list = null;
        }
        if (line.trim()) html += `<p>${inline(line.replace(/^#+\s*/, ''))}</p>`;
    }
    if (list) html += `</${list}>`;
    return html;
}
