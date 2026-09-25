import sys
import os
import re
import requests
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
CHATS_DIR = os.path.join(ROOT_DIR, "chats")
TEMP_DIR = os.path.join(ROOT_DIR, "temp")
os.makedirs(TEMP_DIR, exist_ok=True)

LLM_URL = "http://127.0.0.1:8080/v1/chat/completions"

def find_active_chat_file(explicit_name=None):
    """Individua il file di chat attivo dove registrare il messaggio."""
    if explicit_name:
        safe_title = re.sub(r'[/\\?%*:|"<>]', '_', explicit_name).strip()
        if not safe_title.endswith(".txt"):
            safe_title += ".txt"
        return os.path.join(CHATS_DIR, safe_title)

    env_chat = os.environ.get("TINY_JARVIS_CHAT")
    if env_chat:
        safe = re.sub(r'[/\\?%*:|"<>]', '_', env_chat).strip()
        if not safe.endswith(".txt"):
            safe += ".txt"
        return os.path.join(CHATS_DIR, safe)

    # In alternativa, cerca il file modificato più recentemente nella cartella chats/
    if os.path.exists(CHATS_DIR):
        files = [
            os.path.join(CHATS_DIR, f)
            for f in os.listdir(CHATS_DIR)
            if f.endswith(".txt") and os.path.isfile(os.path.join(CHATS_DIR, f))
        ]
        if files:
            files.sort(key=lambda p: os.path.getmtime(p), reverse=True)
            return files[0]

    return None

def append_to_chat(chat_file, role, text):
    """Scrive il messaggio nel file della chat su disco affinché appaia sia nella CLI sia nella GUI."""
    if not chat_file:
        return
    try:
        os.makedirs(os.path.dirname(chat_file), exist_ok=True)
        with open(chat_file, "a", encoding="utf-8") as f:
            f.write(f"{role}: {text.strip()}\n\n")
    except Exception as e:
        sys.stderr.write(f"[backcall_llm] Errore scrittura chat: {e}\n")

def expand_file_references(prompt_text):
    """
    Rileva se nel prompt ci sono riferimenti a file esistenti (es. temp/browser_ricerca o file .txt)
    e ne incorpora il contenuto direttamente nel prompt per l'LLM.
    """
    words = prompt_text.split()
    expanded = prompt_text

    for word in words:
        clean_word = word.strip("+'\",;")
        candidates = [
            clean_word,
            os.path.join(ROOT_DIR, clean_word),
            os.path.join(TEMP_DIR, clean_word),
            os.path.join(TEMP_DIR, os.path.basename(clean_word))
        ]

        for candidate in candidates:
            if os.path.isfile(candidate):
                try:
                    with open(candidate, "r", encoding="utf-8", errors="ignore") as f:
                        file_content = f.read().strip()

                    # Se è un file HTML, estrae in modo ultra-rapido title, meta description e testo significativo
                    if "<html" in file_content.lower() or "<!doctype" in file_content.lower():
                        title_m = re.search(r"<title>([^<]+)</title>", file_content, re.IGNORECASE)
                        title = title_m.group(1).strip() if title_m else ""

                        desc_m = re.search(r"<meta[^>]*name=[\"']description[\"'][^>]*content=[\"']([^\"']+)[\"']", file_content, re.IGNORECASE)
                        desc = desc_m.group(1).strip() if desc_m else ""

                        # Cerca eventuali titoli h1 o informazioni sul profilo
                        h1_matches = re.findall(r"<h[1-3][^>]*>([^<]+)</h[1-3]>", file_content, re.IGNORECASE)
                        h_text = " | ".join([h.strip() for h in h1_matches[:5] if h.strip()])

                        clean_summary = f"Titolo pagina: {title}\nDescrizione: {desc}\nIntestazioni: {h_text}"
                        file_content = clean_summary
                    elif len(file_content) > 4000:
                        file_content = file_content[:4000].strip()

                    placeholder = f"\n--- [Contenuto file {clean_word}] ---\n{file_content}\n--- [Fine file] ---\n"
                    expanded = expanded.replace(word, placeholder, 1)
                    break
                except Exception:
                    pass

    return expanded

def main():
    if len(sys.argv) < 2:
        sys.exit(0)

    # Parsing argomenti
    raw_args = list(sys.argv[1:])
    chat_file = None

    if "--chat" in raw_args:
        idx = raw_args.index("--chat")
        if idx + 1 < len(raw_args):
            chat_file = find_active_chat_file(raw_args[idx + 1])
            del raw_args[idx:idx + 2]

    if not chat_file:
        chat_file = find_active_chat_file()

    raw_prompt = " ".join(raw_args)
    enriched_prompt = expand_file_references(raw_prompt)

    system_prompt = (
        "Sei Tiny Jarvis. Rispondi cordialmente all'utente completando la task o sintetizzando "
        "le informazioni ricevute. Se devi compiere un'ulteriore azione di sistema, termina con <tool>nome_tool.py argomenti</tool>."
    )

    data = {
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": enriched_prompt}
        ],
        "max_tokens": 600,
        "chat_template_kwargs": {
            "enable_thinking": False
        }
    }

    try:
        response = requests.post(LLM_URL, json=data, timeout=60)
        response.raise_for_status()
        result = response.json()
        raw_answer = result["choices"][0]["message"]["content"]
    except Exception as e:
        sys.stderr.write(f"[backcall_llm] Errore richiesta LLM (8080): {e}\n")
        sys.exit(1)

    # Estrae eventuale tool per continuazione catena
    tool_match = re.search(r'<tool>([\s\S]*?)</tool>', raw_answer, re.IGNORECASE)
    extracted_tool = tool_match.group(1).strip() if tool_match else None

    # Pulisce la risposta per la chat
    clean_answer = re.sub(r'<tool>[\s\S]*?</tool>', '', raw_answer, flags=re.IGNORECASE).strip()

    # 1. Stampa su standard output
    if clean_answer:
        print(clean_answer)

    # 2. Registra direttamente nel file della chat attiva
    if clean_answer and chat_file:
        append_to_chat(chat_file, "jarvis", clean_answer)

    # 3. Se è stato richiesto un ulteriore tool, inoltra l'esecuzione
    if extracted_tool and extracted_tool != "nothing":
        tool_selector_script = os.path.join(SCRIPT_DIR, "tool_selector.py")
        cmd = [sys.executable, tool_selector_script, "use"] + extracted_tool.split()
        if chat_file:
            append_to_chat(chat_file, "jev_action", f"python tool_selector.py use {extracted_tool}")
        subprocess.Popen(cmd, cwd=SCRIPT_DIR)

if __name__ == "__main__":
    main()
