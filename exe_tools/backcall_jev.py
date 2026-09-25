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

JEV_URL = "http://127.0.0.1:8081/v1/chat/completions"

def find_active_chat_file(explicit_name=None):
    """Individua il file di chat attivo dove registrare le azioni di Jev."""
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
    """Scrive l'azione nel file della chat su disco."""
    if not chat_file:
        return
    try:
        os.makedirs(os.path.dirname(chat_file), exist_ok=True)
        with open(chat_file, "a", encoding="utf-8") as f:
            f.write(f"{role}: {text.strip()}\n\n")
    except Exception as e:
        sys.stderr.write(f"[backcall_jev] Errore scrittura chat: {e}\n")

def expand_file_references(prompt_text):
    """Sostituisce riferimenti a file esistenti con il loro contenuto per il contesto di Jev."""
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
                    placeholder = f"\n[File {clean_word}]:\n{file_content}\n"
                    expanded = expanded.replace(word, placeholder, 1)
                    break
                except Exception:
                    pass

    return expanded

def main():
    if len(sys.argv) < 2:
        sys.exit(0)

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

    env = os.environ.copy()
    env["PYTHONPATH"] = f"{SCRIPT_DIR}:{env.get('PYTHONPATH', '')}"
    env["PATH"] = f"{SCRIPT_DIR}:{env.get('PATH', '')}"
    if chat_file:
        env["TINY_JARVIS_CHAT"] = os.path.basename(chat_file)

    # 1. Se il comando passato include già pipeline shell esplicite (es. tool_selector o concatenazioni &)
    if "tool_selector.py" in raw_prompt or "run_shell_tool.py" in raw_prompt or "backcall_llm.py" in raw_prompt:
        if chat_file:
            append_to_chat(chat_file, "jev_action", f"Esecuzione pipeline: {raw_prompt}")
        print(f"[Jev Executing Pipeline]: {raw_prompt}")
        proc = subprocess.Popen(raw_prompt, shell=True, cwd=ROOT_DIR, env=env, executable="/bin/bash")
        proc.wait()
        return

    # 2. Interroga il modello Jev (8081) per determinare o raffinare l'azione
    system_prompt = (
        "Sei il modulo decisionale Jev di Tiny Jarvis. Determina il comando o i comandi shell necessari. "
        "Rispondi fornendo il comando effettivo da eseguire o la decisione tecnica."
    )

    data = {
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": enriched_prompt}
        ],
        "max_tokens": 300,
        "chat_template_kwargs": {
            "enable_thinking": False
        }
    }

    decision_text = ""
    try:
        response = requests.post(JEV_URL, json=data, timeout=60)
        response.raise_for_status()
        result = response.json()
        raw_content = result["choices"][0]["message"]["content"]
        # Rimuove eventuali tag thinking
        decision_text = re.sub(r'<think>[\s\S]*?</think>', '', raw_content).strip()
    except Exception as e:
        sys.stderr.write(f"[backcall_jev] Errore richiesta Jev (8081): {e}\n")
        decision_text = raw_prompt

    print(decision_text)

    if chat_file:
        append_to_chat(chat_file, "jev_action", decision_text)

    # Se la decisione contiene un comando o tool, eseguilo tramite tool_selector o bash
    cmd_match = re.search(r'(?:tool_selector\.py|run_shell_tool\.py|backcall_llm\.py)[^\r\n]*', decision_text)
    if cmd_match:
        cmd_to_run = f"python {cmd_match.group(0)}"
        proc = subprocess.Popen(cmd_to_run, shell=True, cwd=ROOT_DIR, env=env, executable="/bin/bash")
        proc.wait()

if __name__ == "__main__":
    main()
