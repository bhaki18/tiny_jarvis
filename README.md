# Tiny Jarvis 🤖

Un agente AI locale intelligente, leggero e modulare, progettato per operare interamente sul tuo dispositivo (Linux - Arch/Debian/Ubuntu - e Windows) con modelli open source all'avanguardia.

---

## 🎯 Obiettivo

Creare un assistente personale autonomo, sia testuale sia vocale, in grado di:
- **Comprendere ed elaborare richieste complesse (LLM)**: conversare, riassumere testi, estrarre informazioni ed elaborare dati.
- **Selezionare ed eseguire tool autonomamente**: decidere se e quale tool di sistema invocare (tool selection e pipeline di feedback tramite modello decisionale Jev-style).
- **Interagire con il sistema operativo (Linux e Windows)**: eseguire comandi shell/CMD, avviare applicazioni desktop (es. Spotify, browser), gestire file e directory.
- **Ispezionare il Web in tempo reale**: scaricare pagine web, estrarre titoli, metadati e contenuti significativi tramite pipeline `curl` e sintesi automatica con backcall LLM.
- **Trascrivere audio in testo (STT)**: supporto nativo sia tramite `whisper.cpp` locale sia tramite Speech Recognition browser nella GUI.

---

## 🏗️ Architettura & Flusso Operativo

```text
               Richiesta Utente (Testo / Voce / GUI)
                                │
                                ▼
                   LLM Principale (Qwen 3.5 4B :8080)
                                │
                                ▼
                     Estrazione Tag <tool>
                                │
           ┌────────────────────┴────────────────────┐
           ▼                                         ▼
   <tool>nothing</tool>                   <tool>comando / script</tool>
           │                                         │
   Risposta diretta                                  ▼
   all'utente                           Tool Selector & Modulo Jev
                                        (Jev-Style Decision :8081)
                                                     │
                                                     ▼
                                           Esecuzione Tool (Linux OS)
                                           ├── run_shell_tool.py (bash / app)
                                           ├── use_stt.py (whisper.cpp)
                                           └── curl + backcall_llm.py (Web / Loop)
                                                     │
                                                     ▼
                                        Output di Sistema (stdout / stderr)
                                                     │
                                                     ▼
                                    Feedback & Sincronizzazione Sessione
                                       (CLI Terminal / Web GUI ChatGPT-Style)
```

### Componenti Principali

| Componente | Ruolo | Dettagli Tecnici |
| :--- | :--- | :--- |
| **LLM Principale** | Comprensione, dialogo e generazione tool | Qwen 3.5 4B GGUF (`Q4_K_M`) — `llama-server` porta `8080` (CTX: 8192) |
| **Tool Selector / Jev** | Validazione e decisione sull'esecuzione dei tool | Jev-Style Qwen 3.5 2B Decision GGUF (`Q4_K_M`) — `llama-server` porta `8081` (CTX: 2048) |
| **Engine di Inferenza** | Esecuzione locale ad alte prestazioni | `llama.cpp` nativo compilato con CMake Release |
| **STT Locale** | Trascrizione vocale offline ad alta precisione | Whisper Large v3 Turbo GGUF (`Q8_0`) via binario `whisper.cpp` (`use_stt.py`) |
| **Tool Execution Suite** | Esecuzione comandi, web scraping e backcall | Script Python in `exe_tools/` (`tool_selector.py`, `run_shell_tool.py`, `backcall_llm.py`, `backcall_jev.py`) |
| **Web GUI** | Interfaccia grafica dark-mode reattiva | Frontend Vanilla HTML5/CSS3/JS, backend Node.js (`GUI_server.js` su porta `3000`) |
| **CLI** | Interfaccia a riga di comando per terminale | Node.js (`CLI/cli.js`), logging in tempo reale e persistenza su `chats/` |

---

## 🧰 Suite degli Strumenti (`exe_tools/`)

Tiny Jarvis include una serie di strumenti modulari in grado di comunicare tra loro e con i server di inferenza:

- **[`tool_selector.py`](file:///home/adp/Scrivania/tiny_jarvis/exe_tools/tool_selector.py)**: router di smistamento. Riceve `use <comando>` o `nothing` ed esegue il comando o lo script corrispondente.
- **[`run_shell_tool.py`](file:///home/adp/Scrivania/tiny_jarvis/exe_tools/run_shell_tool.py)**: esecutore shell generico non-bloccante (`subprocess.Popen`) per avviare comandi di sistema, software desktop e operazioni filesystem.
- **[`backcall_llm.py`](file:///home/adp/Scrivania/tiny_jarvis/exe_tools/backcall_llm.py)**: anello di retroazione intelligente per l'LLM:
  - Rileva riferimenti a file esistenti nel prompt ed espande il loro contenuto nel contesto del modello.
  - Esegue il parsing intelligente di pagine HTML (estrazione rapida di title, meta description, intestazioni).
  - Interroga l'LLM su porta `8080` per sintetizzare i dati estratti.
  - Registra automaticamente la risposta nel file di sessione attivo (`chats/*.txt`) e permette la prosecuzione della catena di tool.
- **[`backcall_jev.py`](file:///home/adp/Scrivania/tiny_jarvis/exe_tools/backcall_jev.py)**: anello di decisione tecnica avanzata con il modello Jev (porta `8081`) per il raffinamento di pipeline shell complesse.
- **[`use_stt.py`](file:///home/adp/Scrivania/tiny_jarvis/exe_tools/use_stt.py)**: invoca il binario `whisper.cpp` con il modello `whisper-large-v3-turbo` per trascrivere file audio direttamente in `chats/transcriptions/`.

---

## 📋 Requisiti di Sistema

- **Sistemi Operativi Supportati**:
  - **Linux**: Arch Linux / Manjaro / EndeavourOS oppure distro Debian-based (Ubuntu, Debian, Linux Mint, Pop!_OS, ecc.).
  - **Windows**: Windows 10 / 11 (con Python 3, Node.js, Git e CMake installati).
- **Pacchetti / Strumenti necessari**:
  - `python3`, `requests`, `huggingface_hub`
  - `nodejs`, `npm`
  - `cmake`, `git`, `gcc`/`clang` o MSVC (Windows), `curl`
- **Hardware raccomandato**:
  - RAM: 16 GB o superiore (per mantenere in memoria i modelli LLM, Jev e STT).
  - Spazio su disco: ~12–15 GB liberi per repository, build `llama.cpp` e pesi GGUF.

---

## 🚀 Quick Start

### 1. Inizializzazione automatica

- **Su Linux (Arch Linux / Debian / Ubuntu / Mint)**:
  ```bash
  bash init.sh
  ```
- **Su Windows (PowerShell / CMD)**:
  ```cmd
  python init.py
  ```

### 2. Avvio dell'Interfaccia Grafica (Consigliato 🌐)
Lo script [`start.py`](file:///home/adp/Scrivania/tiny_jarvis/start.py) verifica la disponibilità dei server, avvia automaticamente i server di inferenza in background se non già attivi, avvia la GUI Node.js (porta `3000`) e apre la pagina nel browser:

```bash
python start.py
```
Per avviare la Web GUI moderna in stile ChatGPT con controllo automatico dello stato dei server:

- **Metodo Automatico (Consigliato)**:
  Controlla che i server `8080` e `8081` siano pronti, avvia il server GUI e apre il browser:
  ```bash
  python start.py
  ```

- **Metodo Diretto (se i server sono già attivi)**:
  ```bash
  node GUI/GUI_servers.js
  ```
  Quindi collegati con qualsiasi browser a [http://127.0.0.1:3000](http://127.0.0.1:3000).

### 4. Avvio della CLI (Terminale 💻)
Per interagire con Tiny Jarvis direttamente da riga di comando:

- **Metodo Automatico (con verifica server)**:
  ```bash
  python start_cli.py
  ```

- **Metodo Diretto**:
  ```bash
  node CLI/cli.js
  ```

---

## 📂 Struttura del Progetto

```text
tiny_jarvis/
├── init.sh                  # Setup automatizzato dell'ambiente, dipendenze e modelli
├── start.py                 # Launcher automatico per Web GUI e verifica server
├── start_cli.py             # Launcher automatico per CLI e verifica server
├── start_servers.sh         # Script di avvio dual-server llama-server (8080 e 8081)
├── servers.log              # Log di output dei server llama-server
│
├── CLI/
│   ├── cli.js               # Applicazione CLI in Node.js con supporto tool e chat history
│   └── README.md            # Documentazione della Command Line Interface
│
├── GUI/
│   ├── index.html           # Layout ChatGPT-Style moderno e accessibile
│   ├── main.css             # Design dark-mode curato, glassmorphism e animazioni
│   ├── main.js              # Client frontend: gestione chiamate LLM, markdown e UI
│   ├── GUI_server.js        # Server backend Node.js (porta 3000) per API ed esecuzione tool
│   ├── GUI_servers.js       # Wrapper entrypoint per avvio rapido
│   └── README.md            # Documentazione approfondita dell'interfaccia grafica
│
├── exe_tools/
│   ├── tool_selector.py     # Router di selezione ed esecuzione dei tool
│   ├── run_shell_tool.py    # Esecutore comandi shell e avvio applicazioni
│   ├── backcall_llm.py      # Callback LLM con espansione file e sintesi web/HTML
│   ├── backcall_jev.py      # Callback decisionale Jev per pipeline complesse
│   ├── use_stt.py           # Wrapper di trascrizione vocale tramite whisper.cpp
│   ├── temp/                # File temporanei generati durante le ricerche web
│   └── README.md            # Documentazione dettagliata della suite degli strumenti
│
├── chats/                   # Sessioni di chat salvate e sincronizzate (*.txt)
│   └── transcriptions/      # Trascrizioni generate dai file audio tramite STT
│
├── LLM/
│   └── server_llama/        # Repository compilato di llama.cpp e configurazione
│
└── STT/
    └── server_whisper/      # Binario eseguibile whisper.cpp per Linux x64
```

---

## 💡 Esempi di Utilizzo

- **Avvio Applicazioni**:
  > *"Jarvis, apri Spotify"*
  > → Esegue: `run_shell_tool.py spotify`

- **Operazioni Filesystem**:
  > *"Crea una cartella progetti sulla scrivania"*
  > → Esegue: `run_shell_tool.py mkdir -p ~/Scrivania/progetti`

- **Ispezione e Sintesi Web**:
  > *"Cerca sul web https://github.com/bhaki18 e dimmi chi è"*
  > → Esegue `curl` verso l'URL, salva in `temp/web_search.txt` e invoca `backcall_llm.py` per riassumere profilo e progetti.

- **Trascrizione Vocale**:
  > *"Trascrivi l'audio nota.wav"*
  > → Esegue: `use_stt.py nota.wav` generando il file di testo in `chats/transcriptions/`.

- **Interazione Vocale da Browser**:
  > Nella GUI, clicca sull'icona del microfono nella barra dei messaggi per dettare la tua richiesta tramite Web Speech API.

---

## 🗺️ Roadmap & Stato dei Lavori

- **Alpha 0.0.1** (Completata):
  - [x] Inizializzazione e download modelli GGUF automatizzato (`init.sh`)
  - [x] Configurazione dual-instance `llama-server` ad alta velocità
  - [x] CLI interattiva con memoria conversazionale persistente
  - [x] Web GUI ChatGPT-Style con supporto completo a Markdown, codice formattato e copia
  - [x] Backend locale Node.js (`GUI_server.js`) con endpoint API `/api/exec-tool`
  - [x] Tool execution suite (`tool_selector`, `run_shell_tool`, `backcall_llm`, `backcall_jev`)
  - [x] Modulo di ricerca web con estrazione ed elaborazione HTML
  - [x] Integrazione STT con `whisper.cpp` e supporto vocale browser
  - [x] Launcher intelligenti con health-checking automatico (`start.py` e `start_cli.py`)

- **Prossime Fasi**:
  - [ ] Streaming bidirezionale Server-Sent Events / WebSocket per risposte token-by-token
  - [ ] Sistema di plugin estendibile con configurazione dichiarativa
  - [ ] Text-to-Speech (TTS) locale ad alta fedeltà vocale

---

## 📄 Licenza

Distribuito sotto licenza MIT. Consulta il file [LICENSE](LICENSE) per ulteriori dettagli.