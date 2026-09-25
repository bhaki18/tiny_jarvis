import subprocess
import sys

args = sys.argv[1:]
if args:
    command = " ".join(args)
    subprocess.Popen(command, shell=True)

