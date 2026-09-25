# Tiny Jarvis 🤖

Un agente AI locale intelligente, leggero e modulare, progettato per operare interamente sul tuo dispositivo con modelli open source.

---

## 🎯 Obiettivo

Creare un assistente vocale e testuale in grado di:
- **Trascrivere audio in testo (STT)** tramite modelli Whisper locali.
- **Comprendere ed elaborare richieste (LLM)** per riassumere, analizzare e conversare.
- **Selezionare ed eseguire tool autonomamente** (tool selection / function calling tramite modello decisionale dedicato).
- **Interagire con il sistema**: eseguire comandi bash, gestire file, avviare applicazioni ed effettuare ricerche.

---

## 🏗️ Architettura & Flusso

```text
Richiesta Utente (Testo / Voce / GUI)
           │
           ▼
     Modello LLM (Qwen 3.5 4B :8080)
           │
           ▼
  Estrazione Tag <tool>
           │
           ▼
  Tool Selector (Jev-Style Decision)
           │
           ▼
  Esecuzione Tool (Linux OS) ──► Output (stdout/stderr)
           │
           ▼
  Risposta & Visualizzazione (CLI / GUI ChatGPT-Style)
```

### Componenti Principali
- **LLM Principale**: Qwen 3.5 4B (GGUF `Q4_K_M`) — server porta `8080`
- **Tool Selector**: Jev-Style Qwen 3.5 2B Decision (GGUF `Q4_K_M`) — server porta `8081`
- **STT (Speech-to-Text)**: Whisper Large v3 Turbo (GGUF) via `whisper.cpp` e supporto vocale browser
- **Inference Engine**: `llama.cpp` (`llama-server`) nativo ad alte prestazioni
- **Interfaccia Grafica (GUI)**: UI web moderna dark-mode in stile ChatGPT (HTML5 / Vanilla CSS / Vanilla JS) con backend locale in Node.js per l'esecuzione dei comandi
- **Interfaccia a riga di comando (CLI)**: CLI reattiva in Node.js con memorizzazione delle chat su disco

---

## 📋 Requisiti di Sistema

- **Sistema Operativo**: Arch Linux o distribuzioni Arch-based (Manjaro, EndeavourOS, ecc.)
- **Pacchetti di base**: `python`, `python-huggingface-hub`, `cmake`, `git`, `nodejs` / `npm`, `gcc`/`clang`
- **Spazio su disco**: ~10–15 GB per repository, build e modelli GGUF

---

## 🚀 Quick Start

### 1. Inizializzazione del progetto
Lo script `init.sh` si occupa di installare le dipendenze di sistema necessarie, scaricare i pesi dei modelli da Hugging Face e compilare `llama.cpp`:

```bash
bash init.sh
```

### 2. Avvio dei server di inferenza
Avvia le istanze di `llama-server` in background (LLM su porta 8080 e Jev-Style su porta 8081):

```bash
bash start_servers.sh
```

### 3. Avvio della GUI (Consigliato 🌐)
Per avviare l'interfaccia grafica in stile ChatGPT:

- **Metodo Automatico (Python)**:
  Controlla che i server siano pronti, avvia il server GUI e apre il browser:
  ```bash
  python start.py
  ```

- **Metodo Diretto (Node.js)**:
  ```bash
  node GUI/GUI_servers.js
  ```
  Quindi collegati a [http://127.0.0.1:3000](http://127.0.0.1:3000).

### 4. Avvio della CLI (Terminale 💻)
In alternativa, puoi utilizzare la Command Line Interface testuale:

```bash
python start_cli.py
# oppure
node CLI/cli.js
```

Le conversazioni e i log dei comandi eseguiti vengono salvati automaticamente all'interno della cartella `chats/`.

---

## 🗺️ Roadmap & Versioni

- **Alpha 0.0.1** (Attuale):
  - [x] Download e setup automatizzato modelli GGUF
  - [x] Compilazione ed orchestrazione dual-server `llama.cpp`
  - [x] CLI interattiva con memoria e logging chat
  - [x] Interfaccia grafica Desktop/Web ChatGPT-Style in Vanilla JS & CSS
  - [x] Backend locale Node.js (`GUI_servers.js`) per esecuzione tool da interfaccia grafica
  - [x] Esecuzione dinamica dei primi tool di sistema (shell bash, filesystem, app)
  - [ ] Integrazione completa Speech-to-Text nativa (`whisper.cpp`)

---

## 📄 Licenza

Distribuito sotto licenza MIT. Consulta il file [LICENSE](LICENSE) per ulteriori dettagli.