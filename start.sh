#!/bin/bash

set -e

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"

# inizializziamo il server llama

LLAMA_SERVER_PATH="$BASE_DIR/LLM/server_llama/llama.cpp/build/bin/llama-server"
if $LLAMA_SERVER_PATH;then 
echo "server llama avviato correttamente!"
else
echo "si è verificato un errore durante l'avvio del server llama"
fi
