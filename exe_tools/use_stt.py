import sys
import subprocess
import os

FILE_DIR = os.path.dirname(os.path.abspath(__file__))
STT_PATH = os.path.join(FILE_DIR/".."/"STT"/"server_whisper"/"whisper-cpp-linux-x64-cpu")
MODEL_STT_PATH = os.path.join(FILE_DIR/".."/".MODELS_SOURCE"/"stt_models"/"whisper-large-v3-turbo-F16"/"whisper-large-v3-turbo-Q8_0.gguf")
PATH_TRASCRIZIONE = os.path.join(FILE_DIR/".."/"chats"/"transcriptions")

file = sys.argv[1]

subprocess.Popen(["./{STT_PATH} -m {MODEL_STT_PATH} -f {file} -otxt -nt -of {PATH_TRASCRIZIONE}"])