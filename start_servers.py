import os
import sys
import platform
import subprocess
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def find_llama_server():
    is_windows = platform.system() == "Windows"
    ext = ".exe" if is_windows else ""
    
    candidates = [
        os.path.join(BASE_DIR, "LLM", "server_llama", "llama.cpp", "build", "bin", f"llama-server{ext}"),
        os.path.join(BASE_DIR, "LLM", "server_llama", "llama.cpp", "build", "bin", "Release", f"llama-server{ext}"),
        os.path.join(BASE_DIR, "LLM", "server_llama", "llama.cpp", "build", "bin", "Debug", f"llama-server{ext}"),
    ]
    
    for candidate in candidates:
        if os.path.isfile(candidate):
            return candidate
            
    # Fallback default
    return candidates[0]

LLAMA_SERVER_PATH = find_llama_server()
LLM_PATH = os.path.join(BASE_DIR, ".MODELS_SOURCE", "llm_models", "Qwen3.5-4B", "Qwen3.5-text-4B-Q4_K_M.gguf")
JEVLIKE_PATH = os.path.join(BASE_DIR, ".MODELS_SOURCE", "jevlike_models", "jev-style-Qwen3.5-2B-Decision", "Jev-Style-Qwen3.5-2B-Decision-Q4_K_M.gguf")

def main():
    if not os.path.isfile(LLAMA_SERVER_PATH):
        sys.stderr.write(f"[ERRORE] Binario llama-server non trovato in: {LLAMA_SERVER_PATH}\n")
        sys.stderr.write("Esegui prima 'bash init.sh' (Linux) o 'python init.py' (Windows) per compilare llama.cpp.\n")
        sys.exit(1)

    print("=========================================")
    print("Avvio dei server Tiny JARVIS...")
    print("=========================================")

    # Avvio LLM principale su porta 8080
    cmd_llm = [
        LLAMA_SERVER_PATH,
        "--host", "127.0.0.1",
        "--port", "8080",
        "--ctx-size", "8192",
        "-m", LLM_PATH
    ]
    
    # Avvio Jev-like Tool Selector su porta 8081
    cmd_jev = [
        LLAMA_SERVER_PATH,
        "--host", "127.0.0.1",
        "--port", "8081",
        "--ctx-size", "2048",
        "--parallel", "1",
        "-m", JEVLIKE_PATH
    ]

    llm_proc = subprocess.Popen(cmd_llm)
    jev_proc = subprocess.Popen(cmd_jev)

    print(f"Server LLM avviato su http://127.0.0.1:8080 (PID: {llm_proc.pid})")
    print(f"Server Jev-like avviato su http://127.0.0.1:8081 (PID: {jev_proc.pid})")

    try:
        while True:
            time.sleep(1)
            if llm_proc.poll() is not None or jev_proc.poll() is not None:
                print("[!] Uno dei server di inferenza si è arrestato.")
                break
    except KeyboardInterrupt:
        print("\nArresto dei server di inferenza...")
    finally:
        for p in (llm_proc, jev_proc):
            if p.poll() is None:
                p.terminate()

if __name__ == "__main__":
    main()
