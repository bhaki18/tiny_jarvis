# Tiny Jarvis CLI 💻

Interfaccia a riga di comando (CLI) per **Tiny Jarvis**, progettata per interagire con l'assistente vocale/testuale direttamente dal terminale Linux con tempi di risposta immediati e basso consumo di risorse.

---

## 🌟 Caratteristiche Principali

- **Interfaccia Interattiva Readline**: ciclo di input continuo con prompt `>`, supporto per input multi-linea e comandi rapidi.
- **Integrazione Dual-Model**:
  - Interroga l'**LLM Principale** (`127.0.0.1:8080`) per generare risposte conversazionali e identificare l'intento tecnico racchiuso nei tag `<tool>`.
  - Valida ed elabora decisioni critiche tramite il modello **Jev-Style** (`127.0.0.1:8081`).
- **Sistema di Fallback Intelligente**: se il modello omette il tag `<tool>`, la CLI analizza la richiesta con espressioni regolari per rilevare URL (innescando la ricerca web `curl`) o richieste esplicite di comandi (es. *"esegui il comando..."*).
- **Esecuzione Reale dei Tool**: invoca i tool presenti in `exe_tools/` tramite `python tool_selector.py use <comando>` e visualizza in tempo reale `stdout` e `stderr`.
- **Persistenza & Storico**: crea automaticamente un file di sessione in `chats/<titolo_pulito>.txt` registrando l'intera conversazione e i log di sistema (`user`, `jarvis`, `jev_action`, `tool_stdout`, `tool_stderr`).

---

## 🚀 Come Avviare la CLI

### Metodo 1: Avvio con Verifica Automatica dei Server (Consigliato)
Lo script [`start_cli.py`](file:///home/adp/Scrivania/tiny_jarvis/start_cli.py) verifica la disponibilità degli endpoint `8080/health` e `8081/health`, avvia i server se necessario e apre la CLI:

```bash
python start_cli.py
```

### Metodo 2: Avvio Diretto Node.js
Se i server di inferenza sono già in esecuzione (`bash start_servers.sh`):

```bash
node CLI/cli.js
```

---

## 💡 Esempi di Comandi nel Terminale

```text
> ciao jarvis, come stai?
Ciao! Sono operativo e pronto ad aiutarti.

> apri spotify
Certamente! Sto avviando Spotify per te. 🎵
[Jev Action]: python tool_selector.py use run_shell_tool.py spotify

> cerca sul web https://github.com/bhaki18 e dimmi il nome
Certamente! Sto scaricando e analizzando il profilo GitHub di bhaki18...
[Jev Action]: python tool_selector.py use run_shell_tool.py curl -sL https://github.com/bhaki18 -o temp/web_search.txt && python backcall_llm.py temp/web_search.txt + "estrai e sintetizza il nome dell'account"
[STDOUT]: Il profilo appartiene ad Angelo Del Piano (bhaki18), sviluppatore software.
```
