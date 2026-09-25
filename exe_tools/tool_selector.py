import sys 
import subprocess

if len(sys.argv) < 2 or sys.argv[1] == "nothing":
    run = False
elif sys.argv[1] == "use":
    run = True
else:
    print("TOOL_SELECTOR.PY:caso anomalo,il modello jevlike non ha passato argomenti validi in sys.argv[1]")
    run = False

if run and len(sys.argv) > 2:
    cmd = sys.argv[2:]
    if cmd[0].endswith(".py"):
        cmd = [sys.executable] + cmd
    subprocess.Popen(cmd)

