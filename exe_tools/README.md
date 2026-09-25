# Tiny Jarvis Execution Tools (`exe_tools/`) 🛠️

Questo modulo contiene gli strumenti modulari di Tiny Jarvis per l'esecuzione di comandi sul sistema operativo Linux, l'elaborazione autonoma di file e pagine web, il loop di retroazione con i modelli e la trascrizione vocale.

---

## 📂 Componenti del Modulo

| Script | Funzione | Esempio di Invocazione |
| :--- | :--- | :--- |
| **[`tool_selector.py`](file:///home/adp/Scrivania/tiny_jarvis/exe_tools/tool_selector.py)** | Router di smistamento ed esecuzione comandi | `python tool_selector.py use run_shell_tool.py spotify` |
| **[`run_shell_tool.py`](file:///home/adp/Scrivania/tiny_jarvis/exe_tools/run_shell_tool.py)** | Esecutore shell bash non-bloccante | `python run_shell_tool.py mkdir -p ~/Scrivania/test` |
| **[`backcall_llm.py`](file:///home/adp/Scrivania/tiny_jarvis/exe_tools/backcall_llm.py)** | Retroazione LLM (:8080) con analisi file & sintesi web | `python backcall_llm.py temp/web_search.txt + "riassumi i contenuti"` |
| **[`backcall_jev.py`](file:///home/adp/Scrivania/tiny_jarvis/exe_tools/backcall_jev.py)** | Decisione ed esecuzione avanzata tramite Jev (:8081) | `python backcall_jev.py "apri browser su google"` |
| **[`use_stt.py`](file:///home/adp/Scrivania/tiny_jarvis/exe_tools/use_stt.py)** | Trascrizione offline con Whisper.cpp | `python use_stt.py registrazione.wav` |

---

## 🔍 Dettagli Tecnici degli Script

### 1. `tool_selector.py`
È il punto di ingresso invocato sia dal backend della GUI (`GUI_server.js`) sia dalla CLI (`cli.js`).
- Parametri:
  - `use <argomenti>`: prepara ed avvia il processo specificato (se il comando punta a uno script `.py`, usa l'interprete Python corrente).
  - `nothing`: operazione no-op, non viene eseguita alcuna azione sul sistema.

### 2. `run_shell_tool.py`
Riceve una stringa di argomenti e li concatena eseguendoli in una subshell bash (`subprocess.Popen(..., shell=True)`). È ideale per:
- Avvio di applicazioni desktop in background (`spotify`, `firefox`, ecc.).
- Gestione di file, cartelle e diagnostica di sistema (`mkdir`, `rm`, `ls`, `uname -a`).
- Download di risorse web (`curl -sL <url> -o temp/web_search.txt`).

### 3. `backcall_llm.py`
Permette a Tiny Jarvis di elaborare file e pagine web e inviare una seconda richiesta contestualizzata all'LLM principale (porta `8080`):
- **Espansione File Intelligente**: cerca riferimenti a file esistenti nel testo del prompt e ne inietta il contenuto.
- **Estrattore Rapido HTML**: se il file è una pagina HTML scaricata dal web, estrae automaticamente tag `<title>`, `<meta name="description">` e titoli `<h1>-<h3>`, riducendo i token e migliorando la pertinenza della sintesi.
- **Sincronizzazione della Chat**: individua automaticamente il file di sessione attivo (`chats/*.txt` o variabile `TINY_JARVIS_CHAT`) e vi aggiunge la risposta finale dell'assistente.
- **Concatenazione (Multi-Tool Chaining)**: se la risposta generata contiene un ulteriore tag `<tool>`, lo invia automaticamente a `tool_selector.py`.

### 4. `backcall_jev.py`
Svolge una funzione simile a `backcall_llm.py` ma si appoggia al modello decisionale Jev (porta `8081`):
- Ideale per risolvere pipeline shell complesse o richieste con più passi sequenziali.
- Esegue direttamente i comandi validati o raffinati dal modello Jev.

### 5. `use_stt.py`
Interfaccia verso il motore di Speech-to-Text locale:
- Invoca il binario precompilato [`whisper-cpp-linux-x64-cpu`](file:///home/adp/Scrivania/tiny_jarvis/STT/server_whisper/whisper-cpp-linux-x64-cpu).
- Utilizza il modello GGUF `whisper-large-v3-turbo-Q8_0.gguf`.
- Salva la trascrizione testuale risultante all'interno di `chats/transcriptions/`.
