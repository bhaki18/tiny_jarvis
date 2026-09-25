/**
 * Tiny Jarvis — ChatGPT-Style Web UI
 * Frontend interattivo per inferenza locale (LLM su 8080)
 * ed esecuzione immediata dei comandi tramite GUI_server (porta 3000).
 */

// ============================================================================
// CONFIGURAZIONE SERVER & ENDPOINT
// ============================================================================

const getBackendUrl = () => {
    if (window.location.protocol.startsWith("http")) {
        return window.location.origin;
    }
    return "http://127.0.0.1:3000";
};

const CONFIG = {
    LLM_HOST: "127.0.0.1:8080",
    JEV_HOST: "127.0.0.1:8081",
    BACKEND_URL: getBackendUrl(),
    STORAGE_KEY: "tiny_jarvis_sessions_v1",
    HEALTH_INTERVAL_MS: 8000,
};

const JARVIS_SYSTEM_PROMPT = `Sei Tiny Jarvis, un assistente AI avanzato che opera localmente sul computer dell'utente (Linux).
Sei integrato con il modulo decisionale ed esecutivo Jev.

REGOLE DI RISPOSTA:
1. Rispondi all'utente in modo chiaro, naturale e cordiale.
2. Alla FINE della tua risposta, aggiungi SEMPRE il tag <tool> specificando lo strumento tecnico necessario per compiere l'azione richiesta:
   - Se l'utente chiede di cercare sul web, leggere una pagina internet, o ispezionare un URL (es. github, siti web):
     <tool>run_shell_tool.py curl -sL <url_valido> -o temp/web_search.txt && python backcall_llm.py temp/web_search.txt + "estrai e sintetizza le informazioni richieste dall'utente"</tool>
   - Se l'utente chiede di eseguire un comando da terminale, creare file o cartelle, o avviare applicazioni (es. spotify, browser, bash):
     <tool>run_shell_tool.py <comando_effettivo></tool>
   - Se l'utente chiede di trascrivere un file audio:
     <tool>use_stt.py <file_audio></tool>
   - Se è una semplice domanda, saluto o non serve eseguire alcun comando sul sistema operativo:
     <tool>nothing</tool>

ESEMPI:
- Utente: "cerca sul web https://github.com/bhaki18 e dimmi il nome dell'account"
  Risposta: Certamente! Sto effettuando la ricerca sul web del profilo bhaki18 su GitHub per individuare il nome dell'account. 🌐
  <tool>run_shell_tool.py curl -sL https://github.com/bhaki18 -o temp/web_search.txt && python backcall_llm.py temp/web_search.txt + "estrai e sintetizza il nome dell'account e della persona"</tool>

- Utente: "apri spotify"
  Risposta: Certamente! Sto avviando Spotify per te. 🎵
  <tool>run_shell_tool.py spotify</tool>

- Utente: "crea una cartella test sul desktop"
  Risposta: Creo immediatamente la cartella test sulla tua scrivania.
  <tool>run_shell_tool.py mkdir -p ~/Scrivania/test</tool>

- Utente: "ciao come stai?"
  Risposta: Ciao! Tutto bene, sono pronto ad aiutarti.
  <tool>nothing</tool>`;

// ============================================================================
// STATO DELL'APPLICAZIONE
// ============================================================================

const state = {
    chats: [],
    activeChatId: null,
    isGenerating: false,
    llmOnline: false,
    jevOnline: false,
    backendOnline: false,
    recognition: null,
    isRecording: false,
};

// ============================================================================
// ELEMENTI DEL DOM
// ============================================================================

const DOM = {
    sidebar: document.getElementById("sidebar"),
    sidebarCloseBtn: document.getElementById("sidebar-close-btn"),
    sidebarOpenBtn: document.getElementById("sidebar-open-btn"),
    newChatBtn: document.getElementById("new-chat-btn"),
    searchInput: document.getElementById("search-input"),
    chatItemsList: document.getElementById("chat-items-list"),
    refreshStatusBtn: document.getElementById("refresh-status-btn"),
    llmIndicator: document.getElementById("llm-indicator"),
    jevIndicator: document.getElementById("jev-indicator"),
    clearChatBtn: document.getElementById("clear-chat-btn"),
    chatViewport: document.getElementById("chat-viewport"),
    welcomeScreen: document.getElementById("welcome-screen"),
    messagesFeed: document.getElementById("messages-feed"),
    promptInput: document.getElementById("prompt-input"),
    micBtn: document.getElementById("mic-btn"),
    sendBtn: document.getElementById("send-btn"),
    suggestionCards: document.querySelectorAll(".prompt-card"),
};

// ============================================================================
// GESTIONE CONVERSAZIONI & STORAGE
// ============================================================================

async function loadChatsFromStorage() {
    try {
        const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (stored) {
            state.chats = JSON.parse(stored);
        }
    } catch (e) {
        console.warn("Impossibile caricare le chat da localStorage:", e);
        state.chats = [];
    }

    if (!Array.isArray(state.chats)) {
        state.chats = [];
    }

    // Sincronizza con i log presenti sul disco tramite GUI_server
    try {
        const res = await fetch(`${CONFIG.BACKEND_URL}/api/chats`);
        if (res.ok) {
            state.backendOnline = true;
            const diskChats = await res.json();
            if (Array.isArray(diskChats) && diskChats.length > 0) {
                diskChats.forEach(dc => {
                    const exists = state.chats.some(c => c.id === dc.id || c.title === dc.title);
                    if (!exists && dc.messages.length > 0) {
                        state.chats.push({
                            id: dc.id,
                            title: dc.title,
                            createdAt: new Date().toISOString(),
                            messages: dc.messages
                        });
                    }
                });
            }
        }
    } catch {
        // Backend offline o avviato su porta differente
    }

    if (state.chats.length > 0) {
        setActiveChat(state.chats[0].id);
    } else {
        createNewChat();
    }
}

function saveChatsToStorage() {
    try {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state.chats));
    } catch (e) {
        console.warn("Errore salvataggio chat:", e);
    }
}

async function logToDisk(chatName, role, content) {
    try {
        await fetch(`${CONFIG.BACKEND_URL}/api/log-chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chatName, role, content })
        });
    } catch {
        // Opzionale
    }
}

function createNewChat() {
    const newChat = {
        id: "chat_" + Date.now(),
        title: "Nuova conversazione",
        createdAt: new Date().toISOString(),
        messages: []
    };

    state.chats.unshift(newChat);
    saveChatsToStorage();
    setActiveChat(newChat.id);
    renderChatList();

    if (DOM.promptInput) {
        DOM.promptInput.focus();
    }
}

function getActiveChat() {
    return state.chats.find(c => c.id === state.activeChatId);
}

function setActiveChat(chatId) {
    state.activeChatId = chatId;
    renderChatList(DOM.searchInput ? DOM.searchInput.value.trim() : "");
    renderMessages();
}

function deleteChat(chatId, event) {
    if (event) {
        event.stopPropagation();
    }

    state.chats = state.chats.filter(c => c.id !== chatId);
    saveChatsToStorage();

    if (state.activeChatId === chatId) {
        if (state.chats.length > 0) {
            setActiveChat(state.chats[0].id);
        } else {
            createNewChat();
        }
    } else {
        renderChatList();
    }
}

function clearCurrentChat() {
    const current = getActiveChat();
    if (!current) return;

    current.messages = [];
    current.title = "Nuova conversazione";
    saveChatsToStorage();
    renderChatList();
    renderMessages();
}

// ============================================================================
// RENDERING LISTA CHAT (SIDEBAR)
// ============================================================================

function renderChatList(filterQuery = "") {
    if (!DOM.chatItemsList) return;
    DOM.chatItemsList.innerHTML = "";

    const query = filterQuery.toLowerCase();
    const filteredChats = state.chats.filter(chat => 
        chat.title.toLowerCase().includes(query) ||
        chat.messages.some(m => m.content.toLowerCase().includes(query))
    );

    if (filteredChats.length === 0) {
        const emptyMsg = document.createElement("div");
        emptyMsg.className = "chat-item";
        emptyMsg.style.color = "var(--text-muted)";
        emptyMsg.style.cursor = "default";
        emptyMsg.textContent = query ? "Nessun risultato trovato" : "Nessuna conversazione";
        DOM.chatItemsList.appendChild(emptyMsg);
        return;
    }

    filteredChats.forEach(chat => {
        const item = document.createElement("div");
        item.className = `chat-item ${chat.id === state.activeChatId ? "active" : ""}`;
        item.dataset.chatId = chat.id;

        const titleSpan = document.createElement("span");
        titleSpan.className = "chat-item-title";
        titleSpan.textContent = chat.title || "Conversazione senza titolo";
        item.appendChild(titleSpan);

        const actionsDiv = document.createElement("div");
        actionsDiv.className = "chat-item-actions";

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "chat-action-btn delete";
        deleteBtn.title = "Elimina chat";
        deleteBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
        `;
        deleteBtn.addEventListener("click", (e) => deleteChat(chat.id, e));

        actionsDiv.appendChild(deleteBtn);
        item.appendChild(actionsDiv);

        item.addEventListener("click", () => setActiveChat(chat.id));
        DOM.chatItemsList.appendChild(item);
    });
}

// ============================================================================
// RENDERING FEED MESSAGGI & MARKDOWN
// ============================================================================

function renderMessages() {
    const currentChat = getActiveChat();
    if (!DOM.messagesFeed || !DOM.welcomeScreen) return;

    DOM.messagesFeed.innerHTML = "";

    if (!currentChat || currentChat.messages.length === 0) {
        DOM.welcomeScreen.style.display = "flex";
        DOM.messagesFeed.style.display = "none";
        return;
    }

    DOM.welcomeScreen.style.display = "none";
    DOM.messagesFeed.style.display = "flex";

    currentChat.messages.forEach(msg => {
        appendMessageElement(msg);
    });

    scrollToBottom();
}

function appendMessageElement(msg) {
    const wrapper = document.createElement("div");
    wrapper.className = `message-wrapper ${msg.role}`;

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = msg.role === "user" ? "👤" : "🤖";

    const body = document.createElement("div");
    body.className = "message-body";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";

    if (msg.role === "user") {
        bubble.textContent = msg.content;
    } else {
        bubble.innerHTML = renderMarkdown(msg.content);
        setupCodeCopyButtons(bubble);

        // Se è presente un tool, crea la card informativa ed interattiva
        if (msg.tool && msg.tool !== "nothing") {
            const toolCard = createToolCard(msg.tool, msg.toolOutput, msg.toolStatus);
            body.appendChild(bubble);
            body.appendChild(toolCard);
            wrapper.appendChild(avatar);
            wrapper.appendChild(body);
            DOM.messagesFeed.appendChild(wrapper);
            return;
        }
    }

    body.appendChild(bubble);

    if (msg.role === "user") {
        wrapper.appendChild(body);
        wrapper.appendChild(avatar);
    } else {
        wrapper.appendChild(avatar);
        wrapper.appendChild(body);
    }

    DOM.messagesFeed.appendChild(wrapper);
}

function createToolCard(toolCommand, toolOutput, toolStatus = "Eseguito") {
    const card = document.createElement("div");
    card.className = "jev-action-card";

    const isError = toolStatus && toolStatus.toLowerCase().includes("errore");
    const statusColor = isError ? "var(--accent-red)" : "var(--accent-teal)";

    const header = document.createElement("div");
    header.className = "jev-header";
    header.innerHTML = `
        <div class="jev-title">
            <span>⚡ Jev Tool Action</span>
        </div>
        <span class="jev-status" style="color: ${statusColor}; background-color: rgba(255,255,255,0.06);">${escapeHtml(toolStatus)}</span>
    `;

    const content = document.createElement("div");
    content.className = "jev-content terminal";
    content.textContent = `$ python tool_selector.py use ${toolCommand}`;

    if (toolOutput) {
        const outDiv = document.createElement("div");
        outDiv.style.borderTop = "1px solid rgba(255, 255, 255, 0.1)";
        outDiv.style.marginTop = "8px";
        outDiv.style.paddingTop = "8px";
        outDiv.style.color = isError ? "#f87171" : "#38bdf8";
        outDiv.textContent = toolOutput;
        content.appendChild(outDiv);
    }

    card.appendChild(header);
    card.appendChild(content);
    return card;
}

function showTypingIndicator() {
    removeTypingIndicator();

    const wrapper = document.createElement("div");
    wrapper.className = "message-wrapper assistant";
    wrapper.id = "typing-indicator-wrapper";

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = "🤖";

    const body = document.createElement("div");
    body.className = "message-body";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";

    const indicator = document.createElement("div");
    indicator.className = "typing-indicator";
    indicator.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;

    bubble.appendChild(indicator);
    body.appendChild(bubble);
    wrapper.appendChild(avatar);
    wrapper.appendChild(body);

    DOM.messagesFeed.appendChild(wrapper);
    scrollToBottom();
}

function removeTypingIndicator() {
    const existing = document.getElementById("typing-indicator-wrapper");
    if (existing) {
        existing.remove();
    }
}

function scrollToBottom() {
    if (DOM.chatViewport) {
        DOM.chatViewport.scrollTop = DOM.chatViewport.scrollHeight;
    }
}

// ============================================================================
// MARKDOWN PARSER (Vanilla JS)
// ============================================================================

function escapeHtml(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderMarkdown(rawText) {
    if (!rawText) return "";

    // Protezione blocchi di codice
    const codeBlocks = [];
    let text = rawText.replace(/```([a-zA-Z0-9_\-#+.]*)\n([\s\S]*?)```/g, (match, lang, code) => {
        const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
        codeBlocks.push({ lang: lang.trim() || "text", code: code.trim() });
        return placeholder;
    });

    // Escape dell'HTML per sicurezza
    text = escapeHtml(text);

    // Titoli
    text = text.replace(/^### (.*$)/gim, "<h3>$1</h3>");
    text = text.replace(/^## (.*$)/gim, "<h2>$1</h2>");
    text = text.replace(/^# (.*$)/gim, "<h1>$1</h1>");

    // Grassetto e corsivo
    text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/\*(.*?)\*/g, "<em>$1</em>");
    text = text.replace(/_([^_]+)_/g, "<em>$1</em>");

    // Inline code
    text = text.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Linee orizzontali
    text = text.replace(/^---$/gim, "<hr style='border:none;border-top:1px solid rgba(255,255,255,0.1);margin:12px 0;'>");

    // Liste puntate
    text = text.replace(/^\s*[-*]\s+(.*)$/gim, "<ul><li>$1</li></ul>");
    text = text.replace(/<\/ul>\s*<ul>/g, "");

    // Liste numerate
    text = text.replace(/^\s*\d+\.\s+(.*)$/gim, "<ol><li>$1</li></ol>");
    text = text.replace(/<\/ol>\s*<ol>/g, "");

    // Paragrafi e a capo
    text = text.split("\n\n").map(para => {
        para = para.trim();
        if (para.startsWith("<h") || para.startsWith("<ul") || para.startsWith("<ol") || para.startsWith("__CODE_BLOCK_")) {
            return para;
        }
        return `<p>${para.replace(/\n/g, "<br>")}</p>`;
    }).join("\n");

    // Ripristino blocchi di codice formattati
    codeBlocks.forEach((block, index) => {
        const placeholder = `__CODE_BLOCK_${index}__`;
        const codeHtml = `
            <div class="code-block-wrapper">
                <div class="code-header">
                    <span>${escapeHtml(block.lang)}</span>
                    <button class="copy-code-btn" data-code="${encodeURIComponent(block.code)}">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        <span>Copia codice</span>
                    </button>
                </div>
                <pre><code>${escapeHtml(block.code)}</code></pre>
            </div>
        `;
        text = text.replace(placeholder, codeHtml);
    });

    return text;
}

function setupCodeCopyButtons(container) {
    const copyBtns = container.querySelectorAll(".copy-code-btn");
    copyBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const rawCode = decodeURIComponent(btn.dataset.code || "");
            navigator.clipboard.writeText(rawCode).then(() => {
                const textSpan = btn.querySelector("span");
                const oldText = textSpan.textContent;
                textSpan.textContent = "Copiato!";
                btn.style.color = "var(--accent-teal)";

                setTimeout(() => {
                    textSpan.textContent = oldText;
                    btn.style.color = "";
                }, 2000);
            });
        });
    });
}

// ============================================================================
// CHIAMATE SERVER ED ESECUZIONE REALE TOOL SUL SISTEMA
// ============================================================================

async function checkServersHealth() {
    // 1. LLM Server (8080)
    try {
        const res = await fetch(`http://${CONFIG.LLM_HOST}/health`, { method: "GET" });
        if (res.ok) {
            const data = await res.json();
            state.llmOnline = (data.status === "ok");
        } else {
            state.llmOnline = false;
        }
    } catch {
        state.llmOnline = false;
    }

    // 2. Jev Server (8081)
    try {
        const res = await fetch(`http://${CONFIG.JEV_HOST}/health`, { method: "GET" });
        if (res.ok) {
            const data = await res.json();
            state.jevOnline = (data.status === "ok");
        } else {
            state.jevOnline = false;
        }
    } catch {
        state.jevOnline = false;
    }

    // 3. GUI Backend Server (porta 3000)
    try {
        const res = await fetch(`${CONFIG.BACKEND_URL}/api/status`, { method: "GET" });
        state.backendOnline = res.ok;
    } catch {
        state.backendOnline = false;
    }

    updateIndicators();
}

function updateIndicators() {
    if (DOM.llmIndicator) {
        DOM.llmIndicator.className = `status-indicator ${state.llmOnline ? "online" : "offline"}`;
        DOM.llmIndicator.title = `LLM (8080): ${state.llmOnline ? "Online e pronto" : "Non raggiungibile"}`;
    }

    if (DOM.jevIndicator) {
        DOM.jevIndicator.className = `status-indicator ${state.jevOnline ? "online" : "offline"}`;
        DOM.jevIndicator.title = `Jev (8081): ${state.jevOnline ? "Online e pronto" : "Non raggiungibile"}`;
    }
}

async function askLLM(userPrompt) {
    const currentChat = getActiveChat();
    
    const messages = [
        { role: "system", content: JARVIS_SYSTEM_PROMPT }
    ];

    if (currentChat && currentChat.messages.length > 0) {
        const context = currentChat.messages.slice(-6).map(m => ({
            role: m.role,
            content: m.content
        }));
        messages.push(...context);
    }

    messages.push({
        role: "user",
        content: userPrompt
    });

    const response = await fetch(`http://${CONFIG.LLM_HOST}/v1/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            messages: messages,
            max_tokens: 600,
            chat_template_kwargs: {
                enable_thinking: false
            }
        })
    });

    if (!response.ok) {
        throw new Error(`Errore HTTP ${response.status}: il server locale ha risposto con codice di errore`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// Invia richiesta di esecuzione reale a GUI_server.js su porta 3000
async function executeSystemTool(toolCommand, chatName) {
    try {
        const response = await fetch(`${CONFIG.BACKEND_URL}/api/exec-tool`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tool: toolCommand, chatName })
        });

        if (!response.ok) {
            return {
                success: false,
                output: `Impossibile comunicare con GUI_server (HTTP ${response.status}). Avvialo con: node GUI/GUI_servers.js`
            };
        }

        const data = await response.json();
        const output = data.output || data.stdout || data.stderr || (data.success ? "Comando completato con successo." : "Errore esecuzione");
        return { success: data.success, output };
    } catch (err) {
        return {
            success: false,
            output: `GUI_server non raggiungibile (${err.message}). Assicurati di avviare: node GUI/GUI_servers.js`
        };
    }
}

// ============================================================================
// INVIO MESSAGGIO UTENTE
// ============================================================================

async function handleSendMessage() {
    if (state.isGenerating) return;

    const text = DOM.promptInput.value.trim();
    if (!text) return;

    let currentChat = getActiveChat();
    if (!currentChat) {
        createNewChat();
        currentChat = getActiveChat();
    }

    // Se è il primo messaggio della chat, aggiorna il titolo (max 35 caratteri)
    if (currentChat.messages.length === 0) {
        const safeTitle = text.slice(0, 36) + (text.length > 36 ? "..." : "");
        currentChat.title = safeTitle;
        renderChatList();
    }

    // Registra messaggio utente
    const userMessage = {
        role: "user",
        content: text,
        timestamp: new Date().toISOString()
    };

    currentChat.messages.push(userMessage);
    saveChatsToStorage();
    logToDisk(currentChat.title, "user", text);

    // Aggiorna UI
    DOM.welcomeScreen.style.display = "none";
    DOM.messagesFeed.style.display = "flex";
    appendMessageElement(userMessage);

    // Resetta input
    DOM.promptInput.value = "";
    adjustTextareaHeight();
    updateSendButtonState();
    scrollToBottom();

    // Avvia generazione
    state.isGenerating = true;
    showTypingIndicator();

    try {
        const rawAnswer = await askLLM(text);

        // 1. Estrazione del tag <tool>
        const toolMatch = rawAnswer.match(/<tool>([\s\S]*?)<\/tool>/i);
        let extractedTool = toolMatch ? toolMatch[1].trim() : null;

        // Fallback per comando esplicito utente o ricerca web
        if (!extractedTool || extractedTool === "nothing") {
            const urlMatch = text.match(/(?:https?:\/\/|www\.)[^\s]+/i) || text.match(/github(?:\.com)?\/[a-zA-Z0-9_-]+/i);
            const explicitCmd = text.match(/^(?:esegui\s+(?:il\s+)?comando\s*:?\s*)(.+)/i);

            if (urlMatch) {
                let targetUrl = urlMatch[0];
                if (targetUrl.includes("github/")) targetUrl = targetUrl.replace("github/", "github.com/");
                if (!targetUrl.startsWith("http")) targetUrl = "https://" + targetUrl;
                extractedTool = `run_shell_tool.py curl -sL ${targetUrl} -o temp/web_search.txt && python backcall_llm.py temp/web_search.txt + "${text.replace(/"/g, "'")}"`;
            } else if (explicitCmd) {
                extractedTool = `run_shell_tool.py ${explicitCmd[1].trim()}`;
            } else {
                extractedTool = "nothing";
            }
        }

        // 2. Risposta testuale pulita per l'utente
        const cleanAnswer = rawAnswer.replace(/<tool>[\s\S]*?<\/tool>/gi, "").trim();

        // 3. Esecuzione del tool (se presente ed effettivo)
        let toolOutput = null;
        let toolSuccess = true;
        const hasExecutableTool = extractedTool && extractedTool !== "nothing";

        if (hasExecutableTool) {
            // Esegue DIRETTAMENTE il tool tramite GUI_server (senza filtri bloccanti)
            const execResult = await executeSystemTool(extractedTool, currentChat.title);
            toolOutput = execResult.output;
            toolSuccess = execResult.success;
        }

        removeTypingIndicator();

        const assistantMessage = {
            role: "assistant",
            content: cleanAnswer || "Ho elaborato la tua richiesta.",
            tool: hasExecutableTool ? extractedTool : null,
            toolOutput: toolOutput,
            toolStatus: hasExecutableTool ? (toolSuccess ? "Eseguito con successo" : "Errore esecuzione") : null,
            timestamp: new Date().toISOString()
        };

        currentChat.messages.push(assistantMessage);
        saveChatsToStorage();
        logToDisk(currentChat.title, "jarvis", cleanAnswer);
        appendMessageElement(assistantMessage);
        scrollToBottom();

    } catch (err) {
        removeTypingIndicator();
        console.error("Errore durante la comunicazione con Tiny Jarvis:", err);

        const errorMessage = {
            role: "assistant",
            content: `⚠️ **Errore di connessione**: Impossibile comunicare con Tiny Jarvis su \`${CONFIG.LLM_HOST}\`.\n\nAssicurati che i server siano attivi eseguendo:\n\`\`\`bash\nbash start_servers.sh\n\`\`\`\nDettagli: *${escapeHtml(err.message)}*`,
            timestamp: new Date().toISOString()
        };

        currentChat.messages.push(errorMessage);
        saveChatsToStorage();
        appendMessageElement(errorMessage);
        scrollToBottom();
    } finally {
        state.isGenerating = false;
        checkServersHealth();
    }
}

// ============================================================================
// GESTIONE INPUT & TEXTAREA
// ============================================================================

function adjustTextareaHeight() {
    if (!DOM.promptInput) return;
    DOM.promptInput.style.height = "auto";
    const nextHeight = Math.min(DOM.promptInput.scrollHeight, 180);
    DOM.promptInput.style.height = `${nextHeight}px`;
}

function updateSendButtonState() {
    if (!DOM.sendBtn || !DOM.promptInput) return;
    const hasText = DOM.promptInput.value.trim().length > 0;
    if (hasText) {
        DOM.sendBtn.classList.add("active");
    } else {
        DOM.sendBtn.classList.remove("active");
    }
}

// ============================================================================
// SPEECH TO TEXT (STT BROWSER-NATIVO)
// ============================================================================

function setupSpeechRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
        if (DOM.micBtn) {
            DOM.micBtn.title = "Riconoscimento vocale non supportato dal browser corrente";
            DOM.micBtn.style.opacity = "0.4";
        }
        return;
    }

    const recognition = new SpeechRec();
    recognition.lang = "it-IT";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
        state.isRecording = true;
        DOM.micBtn.classList.add("recording");
        DOM.promptInput.placeholder = "In ascolto... Parla ora!";
    };

    recognition.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
        }
        DOM.promptInput.value = transcript;
        adjustTextareaHeight();
        updateSendButtonState();
    };

    recognition.onerror = (event) => {
        console.warn("Errore STT:", event.error);
        stopSpeechRecognition();
    };

    recognition.onend = () => {
        stopSpeechRecognition();
    };

    state.recognition = recognition;
}

function toggleSpeechRecognition() {
    if (!state.recognition) return;

    if (state.isRecording) {
        state.recognition.stop();
        stopSpeechRecognition();
    } else {
        try {
            state.recognition.start();
        } catch (e) {
            console.warn("Errore avvio STT:", e);
        }
    }
}

function stopSpeechRecognition() {
    state.isRecording = false;
    if (DOM.micBtn) {
        DOM.micBtn.classList.remove("recording");
    }
    if (DOM.promptInput) {
        DOM.promptInput.placeholder = "Invia un messaggio a Tiny Jarvis...";
    }
}

// ============================================================================
// EVENT LISTENERS & INIZIALIZZAZIONE
// ============================================================================

function setupEventListeners() {
    if (DOM.sendBtn) {
        DOM.sendBtn.addEventListener("click", handleSendMessage);
    }

    if (DOM.promptInput) {
        DOM.promptInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });

        DOM.promptInput.addEventListener("input", () => {
            adjustTextareaHeight();
            updateSendButtonState();
        });
    }

    if (DOM.newChatBtn) {
        DOM.newChatBtn.addEventListener("click", createNewChat);
    }

    if (DOM.clearChatBtn) {
        DOM.clearChatBtn.addEventListener("click", () => {
            if (confirm("Vuoi cancellare i messaggi di questa conversazione?")) {
                clearCurrentChat();
            }
        });
    }

    if (DOM.sidebarCloseBtn) {
        DOM.sidebarCloseBtn.addEventListener("click", () => {
            DOM.sidebar.classList.add("closed");
        });
    }

    if (DOM.sidebarOpenBtn) {
        DOM.sidebarOpenBtn.addEventListener("click", () => {
            DOM.sidebar.classList.remove("closed");
        });
    }

    if (DOM.searchInput) {
        DOM.searchInput.addEventListener("input", (e) => {
            renderChatList(e.target.value.trim());
        });
    }

    if (DOM.refreshStatusBtn) {
        DOM.refreshStatusBtn.addEventListener("click", () => {
            checkServersHealth();
        });
    }

    if (DOM.micBtn) {
        DOM.micBtn.addEventListener("click", toggleSpeechRecognition);
    }

    DOM.suggestionCards.forEach(card => {
        card.addEventListener("click", () => {
            const prompt = card.dataset.prompt;
            if (prompt && DOM.promptInput) {
                DOM.promptInput.value = prompt;
                adjustTextareaHeight();
                updateSendButtonState();
                handleSendMessage();
            }
        });
    });

    window.addEventListener("keydown", (e) => {
        if ((e.metaKey && e.key === "k") || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "o")) {
            e.preventDefault();
            createNewChat();
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    loadChatsFromStorage();
    setupSpeechRecognition();
    setupEventListeners();
    checkServersHealth();

    setInterval(checkServersHealth, CONFIG.HEALTH_INTERVAL_MS);
});
