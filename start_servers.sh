
#!/bin/bash

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"

LLAMA_SERVER_PATH="$BASE_DIR/LLM/server_llama/llama.cpp/build/bin/llama-server"

LLM_PATH="$BASE_DIR/.MODELS_SOURCE/llm_models/Qwen3.5-4B/Qwen3.5-text-4B-Q4_K_M.gguf"

JEVLIKE_PATH="$BASE_DIR/.MODELS_SOURCE/jevlike_models/jev-style-Qwen3.5-2B-Decision/Jev-Style-Qwen3.5-2B-Decision-Q4_K_M.gguf"


# =========================
# LLM principale
# =========================

"$LLAMA_SERVER_PATH" \
    --host 127.0.0.1 \
    --port 8080 \
    --ctx-size 8192 \
    -m "$LLM_PATH" &

LLM_PID=$!


# =========================
# Jev-like Tool Selector
# =========================

"$LLAMA_SERVER_PATH" \
    --host 127.0.0.1 \
    --port 8081 \
    --ctx-size 2048 \
    --parallel 1 \
    -m "$JEVLIKE_PATH" &

JEV_PID=$!


# =========================
# Informazioni
# =========================

echo "LLM server avviato:"
echo "  PID:  $LLM_PID"
echo "  URL:  http://127.0.0.1:8080"
echo "  CTX:  8192"

echo

echo "Jev-like server avviato:"
echo "  PID:  $JEV_PID"
echo "  URL:  http://127.0.0.1:8081"
echo "  CTX:  2048"

echo
echo "Tiny JARVIS servers avviati."


# =========================
# Mantieni lo script attivo
# =========================

wait "$LLM_PID" "$JEV_PID"

