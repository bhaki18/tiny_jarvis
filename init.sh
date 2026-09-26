#!/bin/bash

RED="\033[31m"
GREEN="\033[32m"
RESET="\033[0m"
BLUE="\033[34m"

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"

LLM_DIR="$BASE_DIR/.MODELS_SOURCE/llm_models/Qwen3.5-4B"
STT_DIR="$BASE_DIR/.MODELS_SOURCE/stt_models/whisper-large-v3-turbo-F16"
JEVLIKE_DIR="$BASE_DIR/.MODELS_SOURCE/jevlike_models/jev-style-Qwen3.5-2B-Decision"

LLAMA_DIR="$BASE_DIR/LLM/server_llama"
LLAMA_REPO="$LLAMA_DIR/llama.cpp"

# --------------------------------------------------
# Dipendenze
# --------------------------------------------------

install_pkg() {
    PKG_ARCH="$1"
    PKG_DEB="$2"
    NAME="$3"

    if command -v pacman > /dev/null 2>&1; then
        sudo pacman -S --noconfirm "$PKG_ARCH" > /dev/null 2>&1
    elif command -v apt-get > /dev/null 2>&1; then
        sudo apt-get update -y > /dev/null 2>&1 && sudo apt-get install -y $PKG_DEB > /dev/null 2>&1
    else
        echo -e "${RED}ERRORE: gestore pacchetti non riconosciuto [ERR]${RESET}"
        return 1
    fi

    if [ $? -eq 0 ]; then
        echo -e "$NAME installato ${GREEN}[OK]${RESET}"
    else
        echo -e "${RED}ERRORE: installazione di $NAME fallita [ERR]${RESET}"
    fi
}

install_pkg "python" "python3 python3-pip" "Python e pip"
install_pkg "gcc" "build-essential" "Build Essential (C/C++)"
install_pkg "cmake" "cmake" "CMake"
install_pkg "git" "git" "Git"
install_pkg "npm" "nodejs npm" "NodeJS/npm"
install_pkg "python-requests" "python3-requests" "python-requests"

# Assicuriamo la presenza di huggingface-cli
if ! command -v hf > /dev/null 2>&1 && ! command -v huggingface-cli > /dev/null 2>&1; then
    if command -v pacman > /dev/null 2>&1; then
        sudo pacman -S --noconfirm python-huggingface-hub > /dev/null 2>&1
    elif command -v apt-get > /dev/null 2>&1; then
        sudo apt-get install -y python3-huggingface-hub > /dev/null 2>&1 || pip3 install --break-system-packages huggingface_hub > /dev/null 2>&1 || pip install huggingface_hub > /dev/null 2>&1
    fi
fi

if command -v hf > /dev/null 2>&1; then
    HF_CMD="hf"
elif command -v huggingface-cli > /dev/null 2>&1; then
    HF_CMD="huggingface-cli"
else
    HF_CMD="python3 -m huggingface_hub.cli.hf_cli"
fi

echo -e "huggingface-hub installato ${GREEN}[OK]${RESET}"

# --------------------------------------------------
# Modello LLM
# --------------------------------------------------

mkdir -p "$LLM_DIR"

if $HF_CMD download techwithsergiu/Qwen3.5-text-4B-GGUF \
    --include '*Q4_K_M.gguf' \
    --local-dir "$LLM_DIR" > /dev/null 2>&1; then

    echo -e "modello LLM installato ${GREEN}[OK]${RESET}"

else

    echo -e "${RED}ERRORE: si è verificato un errore durante l'installazione del modello LLM [ERR]${RESET}"

fi

# --------------------------------------------------
# Modello STT
# --------------------------------------------------

mkdir -p "$STT_DIR"

if $HF_CMD download memoravox/whisper-large-v3-turbo-gguf \
    --local-dir "$STT_DIR" > /dev/null 2>&1; then

    echo -e "modello STT installato ${GREEN}[OK]${RESET}"

else

    echo -e "${RED}ERRORE: si è verificato un errore durante l'installazione del modello STT [ERR]${RESET}"

fi

# --------------------------------------------------
# llama.cpp
# --------------------------------------------------

mkdir -p "$LLAMA_DIR"

if [ ! -d "$LLAMA_REPO" ]; then

    if git clone https://github.com/ggml-org/llama.cpp "$LLAMA_REPO" > /dev/null 2>&1; then
        echo -e "llama.cpp scaricato ${GREEN}[OK]${RESET}"
    else
        echo -e "${RED}ERRORE: si è verificato un errore durante il download di llama.cpp [ERR]${RESET}"
    fi

else

    echo -e "llama.cpp già presente ${GREEN}[OK]${RESET}"

fi

# --------------------------------------------------
# Compilazione llama.cpp
# --------------------------------------------------

if [ -d "$LLAMA_REPO" ]; then

    CORES=4
    if command -v nproc > /dev/null 2>&1; then
        CORES="$(nproc)"
    fi

    # Rimuove eventuale cache corrotta da esecuzioni precedenti fallite
    if [ -d "$LLAMA_REPO/build" ] && [ ! -f "$LLAMA_REPO/build/Makefile" ] && [ ! -f "$LLAMA_REPO/build/build.ninja" ]; then
        rm -rf "$LLAMA_REPO/build"
    fi

    if cmake -S "$LLAMA_REPO" -B "$LLAMA_REPO/build" -DCMAKE_BUILD_TYPE=Release > /dev/null 2>&1 \
        && cmake --build "$LLAMA_REPO/build" --config Release --target llama-server -j"$CORES" > /dev/null 2>&1; then

        echo -e "server llama.cpp compilato ${GREEN}[OK]${RESET}"

    else
        # Tentativo di rigenerazione pulita
        rm -rf "$LLAMA_REPO/build"
        if cmake -S "$LLAMA_REPO" -B "$LLAMA_REPO/build" -DCMAKE_BUILD_TYPE=Release > /dev/null 2>&1 \
            && cmake --build "$LLAMA_REPO/build" --config Release --target llama-server -j"$CORES" > /dev/null 2>&1; then
            echo -e "server llama.cpp compilato ${GREEN}[OK]${RESET}"
        else
            echo -e "${RED}ERRORE: si è verificato un errore durante la compilazione del server llama [ERR]${RESET}"
        fi
    fi

fi

# --------------------------------------------------
# Modello Jev-like
# --------------------------------------------------

mkdir -p "$JEVLIKE_DIR"

if $HF_CMD download chaoliangUNSW/Jev-Style-Qwen3.5-2B-Decision-GGUF \
    --include 'Jev-Style-Qwen3.5-2B-Decision-Q4_K_M.gguf' \
    --local-dir "$JEVLIKE_DIR" > /dev/null 2>&1; then

    echo -e "modello Jev-like installato ${GREEN}[OK]${RESET}"

else

    echo -e "${RED}ERRORE: si è verificato un errore durante l'installazione del modello Jev-like [ERR]${RESET}"

fi

# --------------------------------------------------
# Fine
# --------------------------------------------------

echo
echo -e "${BLUE}[INIT COMPLETATO]${RESET}"
