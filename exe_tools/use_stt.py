import sys
import subprocess
import os
import platform

FILE_DIR = os.path.dirname(os.path.abspath(__file__))

is_windows = platform.system() == "Windows"
stt_binary = "whisper-cpp-win-x64.exe" if is_windows else "whisper-cpp-linux-x64-cpu"

STT_PATH = os.path.join(FILE_DIR, "..", "STT", "server_whisper", stt_binary)
MODEL_STT_PATH = os.path.join(FILE_DIR, "..", ".MODELS_SOURCE", "stt_models", "whisper-large-v3-turbo-F16", "whisper-large-v3-turbo-Q8_0.gguf")
PATH_TRASCRIZIONE = os.path.join(FILE_DIR, "..", "chats", "transcriptions")

if len(sys.argv) > 1:
    audio_file = sys.argv[1]
    cmd = [STT_PATH, "-m", MODEL_STT_PATH, "-f", audio_file, "-otxt", "-nt", "-of", PATH_TRASCRIZIONE]
    subprocess.Popen(cmd)