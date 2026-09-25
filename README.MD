# Tiny Jarvis 🤖

Un agente AI locale intelligente, leggero e modulare, progettato per operare interamente sul tuo dispositivo con modelli open source.

---

## 🎯 Obiettivo

Creare un assistente vocale e testuale in grado di:
- **Trascrivere audio in testo (STT)** tramite modelli Whisper locali.
- **Comprendere ed elaborare richieste (LLM)** per riassumere, analizzare e conversare.
- **Selezionare ed eseguire tool autonomamente** (tool selection / function calling tramite modello decisionale dedicato).
- **Interagire con il sistema**: eseguire comandi bash, leggere/scrivere file, ed effettuare ricerche web.

---

## 🏗️ Architettura & Flusso

```text
Richiesta Utente (Testo / Voce)
           │
           ▼
     Modello LLM / Decision
           │
           ▼
     Tool Selector (Jev-Style)
           │
           ▼
     Esecuzione Tool ──► Output
           │
           ▼
      Modello LLM (Sintesi finale)
           │
           ▼
      Risposta all'Utente
```

### Componenti Principali
- **LLM Principale**: Qwen 3.5 4B (GGUF `Q4_K_M`) — serve porta `8080`
- **Tool Selector**: Jev-Style Qwen 3.5 2B Decision (GGUF `Q4_K_M`) — serve porta `8081`
- **STT (Speech-to-Text)**: Whisper Large v3 Turbo (GGUF) via `whisper.cpp`
- **Inference Engine**: `llama.cpp` (`llama-server`) nativo ad alte prestazioni
- **Interfaccia Utente**: CLI reattiva in Node.js con salvataggio delle cronologie di chat

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

### 3. Avvio della CLI
In una nuova sessione di terminale, avvia la Command Line Interface:

```bash
node CLI/cli.js
```

Le conversazioni verranno salvate automaticamente all'interno della cartella `chats/`.

---

## 🗺️ Roadmap & Versioni

- **Alpha 0.0.1** (Attuale):
  - [x] Download e setup automatizzato modelli GGUF
  - [x] Compilazione ed orchestrazione dual-server `llama.cpp`
  - [x] CLI interattiva con memoria e logging chat
  - [ ] Integrazione completa Speech-to-Text (`whisper.cpp`)
  - [ ] Esecuzione dinamica dei primi tool di sistema (lettura/scrittura file e shell)

---

## 📄 Licenza

Distribuito sotto licenza MIT. Consulta il file [LICENSE](LICENSE) per ulteriori dettagli.