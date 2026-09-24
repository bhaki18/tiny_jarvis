#!/bin/bash

set -e

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
LLM_DIR="$BASE_DIR/.MODELS_SOURCE/llm_models/Qwen3.5-4B"
STT_DIR="$BASE_DIR/.MODELS_SOURCE/stt_models/whisper-large-v3-turbo-F16"
# non ho la minima idea di come verificare le dipendenze già installate e mi scoccio di vedere
# come fare quindi le reinstallo e basta

# btw tutto per arch linux(amo arch)

if sudo pacman -S python; then
echo "python installato [ok]"
else
echo "ERRORE:si è verificato un errore durante l'installazione di python[ERR]"
fi

if sudo pacman -S python-huggingface-hub; then
echo "huggingface-hub installato [ok]"
else
echo "ERRORE:si è verificato un errore durante l'installazione di huggingface-hub[ERR]"
fi

if sudo pacman -S cmake; then
echo "cmake installato [ok]"
else 
echo "ERRORE:si è verificato un errore durante l'installazione di cmake[ERR]"
fi

if sudo pacman -S git;then
echo "git installto [ok]"
else 
echo "ERRORE:si è verificato un errore durante l'installazione di git[ERR]"
fi

if hf download techwithsergiu/Qwen3.5-text-4B-GGUF \
                                                    --include '*F16.gguf' \
                                                    --local-dir $LLM_DIR; then
echo "modello LLM installato [ok]"
else
echo "ERRORE:si è verificato un errore durante l'installazione del modello LLM[ERR]"
fi

if hf download memoravox/whisper-large-v3-turbo-gguf \
                                                    --local-dir $STT_DIR;then
echo "modello STT installato [ok]"
else
echo "ERRORE:si è verificato un errore durante l'installazione del modello STT[ERR]"
fi

cd $BASE_DIR/LLM/server_llama
if git clone https://github.com/ggml-org/llama.cpp;then
echo "llama.cpp installato [ok]"
else
echo "si è verificato un errore durante l'istallazione del server llama[ERR]"
fi
cd llama.cpp 
if cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release -t llama-server -j$(nproc);then
echo "server llama.cpp compilato [ok]"
else
echo "si è verificato un errore durante la compilazione del server llama[ERR]"
fi

echo "INIT COMPLETATO CON SUCCESSO!"