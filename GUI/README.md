# Tiny Jarvis GUI 🤖

Interfaccia grafica desktop moderna per **Tiny Jarvis**, progettata per offrire un'esperienza d'uso fluida, elegante e minimalista ispirata a **ChatGPT (Dark Theme)**.

Costruita interamente con tecnologie web standard (**HTML5, Vanilla CSS3 e Vanilla JavaScript**) senza dipendenze frontend pesanti, e supportata da un backend locale leggero in **Node.js** ([`GUI_server.js`](file:///home/adp/Scrivania/tiny_jarvis/GUI/GUI_server.js)) che gestisce le API locali e la reale esecuzione dei comandi di sistema sul tuo computer (Linux e Windows).

---

## 🎨 Caratteristiche dell'Interfaccia

### 1. Sidebar Sinistra (Gestione Conversazioni & Monitoraggio)
- **Nuova Chat**: pulsante `+ Nuova chat` con scorciatoie da tastiera (`⌘K` su macOS, `Ctrl+Shift+O` su Linux/Windows).
- **Ricerca Istantanea**: barra di ricerca per filtrare rapidamente conversazioni sia per titolo che per contenuto.
- **Cronologia Sessioni**: elenco delle chat memorizzate su disco in `chats/*.txt`, con evidenziazione della chat attiva e pulsante per eliminazione rapida.
- **Monitor Server in Tempo Reale**: indicatore di stato con badge pulsante (verde/rosso) per i server di inferenza locali:
  - `LLM :8080` (Qwen 3.5 4B)
  - `Jev :8081` (Jev-Style Qwen 3.5 2B Decision)
  - Pulsante di re-check immediato dello stato.

### 2. Area Centrale (Chat Viewport)
- **Schermata di Benvenuto (Empty State)**: logo Jarvis animato con aura pulsante e card di suggerimento cliccabili per eseguire azioni rapide (es. avvio Spotify, diagnosi di sistema, comandi filesystem, ricerca web).
- **Rendering Markdown Completo**: formattazione avanzata di titoli, paragrafi, elenchi puntati/numerati, grassetto, corsivo e tabelle.
- **Blocchi di Codice con Copia Rapida**: evidenziazione stilizzata dei frammenti di codice con pulsante *Copia* e feedback visivo.
- **Pannello Console Jev Action**: riquadro integrato in stile terminale che mostra in tempo reale l'azione tecnica intrapresa e l'output restituito dal sistema operativo (`stdout` o `stderr`).
- **Indicatore di Elaborazione (Thinking State)**: animazione con puntini pulsanti durante la generazione della risposta da parte del modello.

### 3. Prompt Bar (Area di Input)
- **Textarea Intelligente**: espansione automatica dell'altezza durante la digitazione.
- **Scorciatoie di Invio**: pressione di `Invio` per inviare la richiesta, `Shift + Invio` per inserire una riga vuota.
- **Dettatura Vocale (STT)**: pulsante microfono integrato che attiva il riconoscimento vocale tramite Web Speech API con animazione visiva durante l'ascolto.

---

## ⚙️ Architettura e API di `GUI_server.js`

Il server locale [`GUI_server.js`](file:///home/adp/Scrivania/tiny_jarvis/GUI/GUI_server.js) (esposto sulla porta `3000`) svolge tre funzioni essenziali:

1. **File Server Statico**: serve `index.html`, `main.css` e `main.js` con i corretti MIME type e supporto CORS completo.
2. **Esecutore dei Tool di Sistema (`POST /api/exec-tool`)**:
   - Riceve l'intento tecnico estratto dai tag `<tool>` o generato dal modello Jev.
   - Esegue il comando tramite `tool_selector.py use ...` all'interno della cartella `exe_tools/`.
   - Cattura `stdout` e `stderr` e restituisce il risultato JSON all'interfaccia.
   - Traccia l'esecuzione, gli output e gli errori direttamente nel file di sessione attivo (`chats/<nome_chat>.txt`).
3. **Gestione & Sincronizzazione Cronologia**:
   - `GET /api/status`: verifica lo stato del server GUI.
   - `GET /api/chats`: legge e analizza tutti i file `chats/*.txt` convertendoli in sessioni visualizzabili.
   - `POST /api/log-chat`: memorizza i turni di conversazione (`user`, `jarvis`, `jev_action`) nei file di testo.

---

## 🚀 Modalità di Avvio

### Metodo 1: Avvio Automatico Integrato (Consigliato 🌐)
Il comando verifica la salute dei server `llama-server` (porte `8080` e `8081`), li avvia in background se non ancora attivi, inizializza `GUI_server.js` e apre automaticamente il tuo browser predefinito:

```bash
python start.py
```

### Metodo 2: Avvio Diretto Node.js
Se i server di inferenza sono già stati avviati (tramite `python start_servers.py`):

```bash
node GUI/GUI_server.js
```

L'interfaccia sarà immediatamente disponibile all'indirizzo:
👉 **[http://127.0.0.1:3000](http://127.0.0.1:3000)**

---

## 📂 Organizzazione dei File

```text
GUI/
├── index.html        # Struttura semantica del layout ChatGPT-Style
├── main.css          # Design system dark theme, responsive layout e micro-animazioni
├── main.js           # Logica client: chiamate LLM (8080), parsing Markdown, gestione UI
├── GUI_server.js     # Core backend Node.js: server statico e API (/api/exec-tool, /api/chats)
├── GUI_servers.js    # Entrypoint di comodità (alias di GUI_server.js)
└── README.md         # Questa guida
```

---

## ⌨️ Scorciatoie da Tastiera

| Combinazione | Azione |
| :--- | :--- |
| `Invio` | Invia il messaggio corrente |
| `Shift + Invio` | Inserisce un a capo senza inviare |
| `Ctrl + Shift + O` / `⌘K` | Crea una nuova sessione di chat |
| `Click su Microfono` | Avvia / arresta la dettatura vocale |
