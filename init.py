import os
import sys
import subprocess
import shutil
import platform

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

LLM_DIR = os.path.join(BASE_DIR, ".MODELS_SOURCE", "llm_models", "Qwen3.5-4B")
STT_DIR = os.path.join(BASE_DIR, ".MODELS_SOURCE", "stt_models", "whisper-large-v3-turbo-F16")
JEVLIKE_DIR = os.path.join(BASE_DIR, ".MODELS_SOURCE", "jevlike_models", "jev-style-Qwen3.5-2B-Decision")

LLAMA_DIR = os.path.join(BASE_DIR, "LLM", "server_llama")
LLAMA_REPO = os.path.join(LLAMA_DIR, "llama.cpp")

def check_command(cmd):
    return shutil.which(cmd) is not None

def run_cmd(args, cwd=None, ignore_errors=False):
    try:
        res = subprocess.run(args, cwd=cwd, check=not ignore_errors)
        return res.returncode == 0
    except Exception as e:
        if not ignore_errors:
            print(f"[ERRORE] Esecuzione fallita {args}: {e}")
        return False

def get_hf_cmd():
    if check_command("hf"):
        return ["hf"]
    elif check_command("huggingface-cli"):
        return ["huggingface-cli"]
    else:
        return [sys.executable, "-m", "huggingface_hub.cli.hf_cli"]

def main():
    print("=========================================")
    print(" Inizializzazione Cross-Platform Tiny JARVIS")
    print("=========================================")
    
    # 1. Verifica dipendenze di sistema base
    deps = ["git", "cmake", "node"]
    for dep in deps:
        if check_command(dep):
            print(f"[✓] {dep} presente")
        else:
            print(f"[!] ATTENZIONE: '{dep}' non trovato nel PATH di sistema.")
            print(f"    Assicurati di aver installato {dep} prima di proseguire.")

    # 2. Installazione pacchetti Python necessari
    print("\nVerifica e installazione pacchetti Python...")
    run_cmd([sys.executable, "-m", "pip", "install", "requests", "huggingface_hub"], ignore_errors=True)

    hf_base = get_hf_cmd()

    # 3. Download Modello LLM
    os.makedirs(LLM_DIR, exist_ok=True)
    print("\nDownload Modello LLM principale...")
    run_cmd(hf_base + [
        "download",
        "techwithsergiu/Qwen3.5-text-4B-GGUF",
        "--include", "*Q4_K_M.gguf",
        "--local-dir", LLM_DIR
    ], ignore_errors=True)

    # 4. Download Modello STT
    os.makedirs(STT_DIR, exist_ok=True)
    print("\nDownload Modello STT...")
    run_cmd(hf_base + [
        "download",
        "memoravox/whisper-large-v3-turbo-gguf",
        "--local-dir", STT_DIR
    ], ignore_errors=True)

    # 5. Download Modello Jev-like
    os.makedirs(JEVLIKE_DIR, exist_ok=True)
    print("\nDownload Modello Jev-like...")
    run_cmd(hf_base + [
        "download",
        "chaoliangUNSW/Jev-Style-Qwen3.5-2B-Decision-GGUF",
        "--include", "Jev-Style-Qwen3.5-2B-Decision-Q4_K_M.gguf",
        "--local-dir", JEVLIKE_DIR
    ], ignore_errors=True)

    # 6. Cloning & Compilazione llama.cpp
    os.makedirs(LLAMA_DIR, exist_ok=True)
    if not os.path.exists(LLAMA_REPO):
        print("\nClonazione di llama.cpp...")
        run_cmd(["git", "clone", "https://github.com/ggml-org/llama.cpp", LLAMA_REPO])
    else:
        print("\nllama.cpp già presente.")

    print("\nCompilazione di llama.cpp con CMake...")
    build_dir = os.path.join(LLAMA_REPO, "build")
    run_cmd(["cmake", "-S", LLAMA_REPO, "-B", build_dir, "-DCMAKE_BUILD_TYPE=Release"])
    
    cpu_cores = str(os.cpu_count() or 4)
    run_cmd(["cmake", "--build", build_dir, "--config", "Release", "--target", "llama-server", "-j", cpu_cores])

    print("\n[✓] Inizializzazione completata con successo!")

if __name__ == "__main__":
    main()
