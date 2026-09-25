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

BUILD_DIR="$BASE_DIR/build"

# --------------------------------------------------
# Dipendenze
# --------------------------------------------------

if sudo pacman -S --noconfirm python > /dev/null 2>&1; then
    echo -e "python installato ${GREEN}[OK]${RESET}"
else
    echo -e "${RED}ERRORE: si è verificato un errore durante l'installazione di python [ERR]${RESET}"
fi

if sudo pacman -S --noconfirm python-huggingface-hub > /dev/null 2>&1; then
    echo -e "huggingface-hub installato ${GREEN}[OK]${RESET}"
else
    echo -e "${RED}ERRORE: si è verificato un errore durante l'installazione di huggingface-hub [ERR]${RESET}"
fi

if sudo pacman -S --noconfirm cmake > /dev/null 2>&1; then
    echo -e "cmake installato ${GREEN}[OK]${RESET}"
else
    echo -e "${RED}ERRORE: si è verificato un errore durante l'installazione di cmake [ERR]${RESET}"
fi

if sudo pacman -S --noconfirm git > /dev/null 2>&1; then
    echo -e "git installato ${GREEN}[OK]${RESET}"
else
    echo -e "${RED}ERRORE: si è verificato un errore durante l'installazione di git [ERR]${RESET}"
fi

if sudo pacman -S --noconfirm npm > /dev/null 2>&1;then
echo -e "nodeJS installato ${GREEN}[OK]${RESET}"
else 
echo -e "${RED}ERRORE: si è verificato un errore durante l'installazione di nodeJS [ERR]${RESET}"
fi

if sudo pacman -S --noconfirm python-requests > /dev/null 2>&1;then 
echo -e "python-requests installato ${GREEN}[OK]${RESET}"
else
echo -e "${RED}ERRORE: si è verificato un errore durante l'installazione di python-requests [ERR]${RESET}"
fi

# --------------------------------------------------
# Modello LLM
# --------------------------------------------------

mkdir -p "$LLM_DIR"

if hf download techwithsergiu/Qwen3.5-text-4B-GGUF \
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

if hf download memoravox/whisper-large-v3-turbo-gguf \
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

    if cmake -S "$LLAMA_REPO" \
        -B "$LLAMA_REPO/build" \
        -DCMAKE_BUILD_TYPE=Release > /dev/null 2>&1 \
        && cmake --build "$LLAMA_REPO/build" \
        --config Release \
        --target llama-server \
        -j"$(nproc)" > /dev/null 2>&1; then

        echo -e "server llama.cpp compilato ${GREEN}[OK]${RESET}"

    else

        echo -e "${RED}ERRORE: si è verificato un errore durante la compilazione del server llama [ERR]${RESET}"

    fi

fi

# --------------------------------------------------
# Modello Jev-like
# --------------------------------------------------

mkdir -p "$JEVLIKE_DIR"

if hf download chaoliangUNSW/Jev-Style-Qwen3.5-2B-Decision-GGUF \
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
