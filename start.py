import os
import subprocess
import time
import urllib.request
import json
import signal
import webbrowser

import sys
import platform

FILE_DIR = os.path.dirname(os.path.abspath(__file__))
SERVERS_SCRIPT = os.path.join(FILE_DIR, "start_servers.py")
GUI_SERVER_DIR = os.path.join(FILE_DIR, "GUI", "GUI_server.js")
LOG_PATH = os.path.join(FILE_DIR, "servers.log")
GUI_PORT = 3000

def is_server_ready(port):
    """Verifica se il server risponde correttamente con status HTTP 200 e stato 'ok'."""
    try:
        req = urllib.request.Request(f"http://127.0.0.1:{port}/health")
        with urllib.request.urlopen(req, timeout=1) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                return data.get("status") == "ok"
    except Exception:
        return False
    return False

def is_gui_ready(port=GUI_PORT):
    """Verifica se il server della GUI è attivo."""
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/", timeout=1) as response:
            return response.status == 200
    except Exception:
        return False

def wait_for_servers(servers_process=None, timeout=120):
    """Attende che sia LLM (8080) sia Jev (8081) siano pienamente operativi prima di proseguire."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        if servers_process and servers_process.poll() is not None:
            raise RuntimeError(
                f"I server si sono interrotti inaspettatamente (exit code {servers_process.returncode}).\n"
                f"Controlla il file servers.log per dettagli."
            )

        llm_ok = is_server_ready(8080)
        jev_ok = is_server_ready(8081)

        if llm_ok and jev_ok:
            print("[✓] Server LLM (8080): PRONTO")
            print("[✓] Server Jev (8081): PRONTO")
            return True

        pending = []
        if not llm_ok:
            pending.append("LLM:8080")
        if not jev_ok:
            pending.append("Jev:8081")
        print(f"[*] In attesa dei server ({', '.join(pending)})...")
        time.sleep(1)

    raise TimeoutError("Tempo scaduto durante l'attesa dell'avvio dei server.")

def main():
    servers_process = None
    started_by_us = False

    # 1. Verifica disponibilità server locali (8080 e 8081)
    if is_server_ready(8080) and is_server_ready(8081):
        print("[✓] Server LLM (8080) e Jev (8081) già attivi e pronti.")
    else:
        print("[*] Avvio dei server Tiny Jarvis in background...")
        log_file = open(LOG_PATH, "w")
        
        popen_kwargs = {"stdout": log_file, "stderr": log_file}
        if platform.system() == "Windows":
            popen_kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
        else:
            popen_kwargs["preexec_fn"] = os.setsid

        servers_process = subprocess.Popen(
            [sys.executable, SERVERS_SCRIPT],
            **popen_kwargs
        )
        started_by_us = True

        # Attesa esplicita della salute dei server
        wait_for_servers(servers_process)

    print("\n[✓] Tutti i server di inferenza sono operativi!")
    print(f"[*] Avvio server interfaccia grafica (GUI) su porta {GUI_PORT}...")

    # 2. Avvio del server GUI in Node.js
    gui_process = subprocess.Popen(["node", GUI_SERVER_DIR])

    # Attesa che la GUI sia pronta
    for _ in range(15):
        if is_gui_ready(GUI_PORT):
            break
        time.sleep(0.5)

    print(f"\n🌐 GUI Tiny Jarvis avviata con successo su: http://127.0.0.1:{GUI_PORT}")
    try:
        webbrowser.open(f"http://127.0.0.1:{GUI_PORT}")
    except Exception:
        pass

    try:
        gui_process.wait()
    except KeyboardInterrupt:
        print("\nChiusura Tiny Jarvis...")
    finally:
        gui_process.terminate()
        if started_by_us and servers_process:
            print("Arresto server Tiny Jarvis...")
            if platform.system() == "Windows":
                servers_process.terminate()
            else:
                try:
                    os.killpg(os.getpgid(servers_process.pid), signal.SIGTERM)
                except Exception:
                    servers_process.terminate()

if __name__ == "__main__":
    main()
