import os
import sys
import subprocess
import time
import urllib.request

FILE_DIR = os.path.dirname(os.path.abspath(__file__))
SERVERS_SCRIPT = os.path.join(FILE_DIR, "start_servers.py")
CLI_DIR = os.path.join(FILE_DIR, "CLI", "cli.js")
log_file = open(os.path.join(FILE_DIR, "servers.log"), "w")

# 1. Avvia i server in background
print("Avvio dei server Tiny Jarvis...")
servers_process = subprocess.Popen(
    [sys.executable, SERVERS_SCRIPT],
    stdout=log_file,
    stderr=log_file
)

# Funzione per verificare se la porta risponde
def is_server_ready(port):
    try:
        urllib.request.urlopen(f"http://127.0.0.1:{port}/health", timeout=1)
        return True
    except Exception:
        return False

# 2. Attende che entrambi i server (8080 e 8081) siano pronti
print("In attesa che i server siano attivi sulle porte 8080 e 8081...")
while not (is_server_ready(8080) and is_server_ready(8081)):
    time.sleep(1)

print("Server pronti! Avvio della CLI...\n")

# 3. Avvia la CLI in modalità interattiva
try:
    subprocess.run(["node", CLI_DIR])
finally:
    # Pulizia server alla chiusura della CLI
    servers_process.terminate()

