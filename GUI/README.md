# Tiny Jarvis GUI 🤖

Interfaccia grafica desktop moderna per **Tiny Jarvis**, ispirata fedelmente all'esperienza d'uso e al design minimalista di **ChatGPT (Dark Theme)**.

Realizzata in **HTML5, Vanilla CSS3 e Vanilla JavaScript**, affiancata da un server locale leggero in **Node.js** (`GUI_servers.js`) che permette la reale esecuzione dei comandi di sistema sul tuo computer Linux.

---

## 🎨 Caratteristiche dell'Interfaccia

1. **Sidebar Sinistra (Cronologia & Gestione)**:
   - **Nuova Chat**: pulsante `+ Nuova chat` (scorciatoia `⌘K` o `Ctrl+Shift+O`).
   - **Cerca nelle chat**: filtro di ricerca istantaneo nei titoli e nei contenuti delle conversazioni.
   - **Cronologia Conversazioni**: lista delle sessioni con indicatore di chat attiva e pulsante di rimozione rapida (sincronizzata con i file salvati in `chats/`).
   - **Monitor Server in tempo reale**: stato e porte dei server locali (`LLM 8080`, `Jev 8081`) con badge pulsante verde/rosso e pulsante di re-check.

2. **Area Centrale (Chat Viewport)**:
   - **Empty State di Benvenuto**: logo Jarvis con aura pulsante e card di suggerimento cliccabili per eseguire azioni rapide (Spotify, filesystem, diagnostica, STT).
   - **Rendering Markdown Completo**: titoli, elenchi, grassetto, corsivo e blocchi di codice stilizzati con pulsante *Copia codice* con feedback visivo.
   - **Pannello Console Jev Action**: riquadro dedicato con stile terminale che visualizza il comando eseguito e l'output effettivo restituito dal sistema operativo (`stdout` o `stderr`).
   - **Thinking Indicator**: animazione pulsante a 3 punti durante l'elaborazione del modello.

3. **Prompt Bar (In basso al centro)**:
   - Textarea auto-espandibile in base al testo digitato.
   - Invio rapido con tasto **Invio** (`Shift + Invio` per andare a capo).
   - **Dettatura Vocale (STT)**: supporto browser-nativo per Speech-to-Text tramite microfono.

---

## ⚙️ Architettura e Ruolo di `GUI_servers.js`

`GUI_servers.js` (o `GUI_server.js`) è il backend Node.js locale privo di dipendenze esterne che si occupa di:
- Servire i file statici (`index.html`, `main.css`, `main.js`) sulla porta `3000`.
- **Esecuzione reale dei tool (`POST /api/exec-tool`)**: quando Tiny Jarvis seleziona un comando shell (es. `run_shell_tool.py spotify`), invia la richiesta al server che esegue `python tool_selector.py use ...` all'interno di `exe_tools/` e ne raccoglie l'output.
- **Sincronizzazione cronologia (`GET /api/chats` e `POST /api/log-chat`)**: scrive e legge i file storici in `chats/*.txt` garantendo piena parità con la CLI.

---

## 🚀 Come Avviare la GUI

### Metodo 1: Avvio automatizzato completo (Consigliato)
Verifica la disponibilità dei server di inferenza `8080` e `8081`, avvia `GUI_servers.js` e apre automaticamente il browser:

```bash
python start.py
```

### Metodo 2: Avvio manuale
Se i server di inferenza sono già attivi in background (`bash start_servers.sh`):

```bash
node GUI/GUI_servers.js
# oppure
node GUI/GUI_server.js
```

Poi apri il browser all'indirizzo [http://127.0.0.1:3000](http://127.0.0.1:3000).

---

## 📁 Struttura della Cartella `GUI`

```text
GUI/
├── index.html        # Struttura semantica dell'interfaccia (layout ChatGPT)
├── main.css          # Foglio di stile dark theme, micro-animazioni e responsive
├── main.js           # Client frontend: chiamate a Qwen (8080), markdown ed eventi UI
├── GUI_servers.js    # Entry-point backend Node.js (porta 3000)
├── GUI_server.js     # Modulo core del server locale per file statici e API tool
└── README.md         # Documentazione dell'interfaccia grafica
```
