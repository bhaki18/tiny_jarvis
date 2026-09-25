import fs from "node:fs/promises";
import path from "node:path";
import { exec } from "node:child_process";
const HOST = "127.0.0.1";
const LLM_PORT = 8080;
const JEVLIKE_PORT = 8081;
const FILE_PATH = path.dirname(import.meta.filename);
const CHATS_PATH = path.join(FILE_PATH, "..", "chats");
const LLM_SERVER = HOST + ":" + LLM_PORT;
const JEVLIKE_SERVER = HOST + ":" + JEVLIKE_PORT;
const EXE_TOOLS_PATH = path.join(FILE_PATH, "..", "exe_tools")

const start_msg = `
████████╗██╗███╗   ██╗██╗   ██╗
╚══██╔══╝██║████╗  ██║╚██╗ ██╔╝
   ██║   ██║██╔██╗ ██║ ╚████╔╝
   ██║   ██║██║╚██╗██║  ╚██╔╝
   ██║   ██║██║ ╚████║   ██║
   ╚═╝   ╚═╝╚═╝  ╚═══╝   ╚═╝

     ██╗ █████╗ ██████╗ ██╗   ██╗██╗███████╗
     ██║██╔══██╗██╔══██╗██║   ██║██║██╔════╝
     ██║███████║██║  ██║██║   ██║██║███████╗
██   ██║██╔══██║██████╔╝╚██╗ ██╔╝██║╚════██║
╚█████╔╝██║  ██║██╔══██╗ ╚████╔╝ ██║███████║
 ╚════╝ ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═══╝  ╚═╝╚══════╝

COMMAND LINE INTERFACE
`;

let run_cli = true;

console.log(start_msg);
console.log(`host running on: ${HOST}`);
console.log(`LLM server active on port ${LLM_PORT}`);
console.log(`JEVLIKE server active on port ${JEVLIKE_PORT}`);
console.log(`servers running:
    ${LLM_SERVER}
    ${JEVLIKE_SERVER}`);


async function ask() {
    return new Promise((resolve) => {
        process.stdout.write("> ");

        process.stdin.once("data", (input) => {
            resolve(input.toString().trim());
        });
    });
}


const JARVIS_SYSTEM_PROMPT = `Sei Tiny Jarvis, un assistente AI avanzato che opera localmente sul computer dell'utente.
Sei integrato con un modulo decisionale ed esecutivo (Jev) collegato direttamente al sistema operativo, in grado di:
- Eseguire realmente comandi bash da terminale.
- Creare, spostare, eliminare o leggere cartelle e file.
- Trascrivere audio in testo.

REGOLE FONDAMENTALI:
1. NON dire mai che sei solo un modello di linguaggio o che non hai accesso al filesystem/sistema operativo: Jev esegue le operazioni richieste in background per te.
2. Quando l'utente ti chiede di eseguire un comando o compiere un'azione sul sistema, conferma l'esecuzione in modo chiaro, amichevole e sintetico.
3. Se l'utente fa domande generali o richieste di spiegazioni, rispondi normalmente con tono professionale e collaborativo.`;

async function askLLM(prompt) {
    const response = await fetch(`http://${LLM_SERVER}/v1/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            messages: [
                {
                    role: "system",
                    content: JARVIS_SYSTEM_PROMPT
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 500,
            chat_template_kwargs: {
                enable_thinking: false
            }
        })
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

let chat_name = null;
await fs.mkdir(CHATS_PATH, { recursive: true });
let CHAT_PATH;
while (run_cli) {
    const user_req = await ask();
    if (!user_req) continue;

    if (chat_name == null) {
        // Pulisce il nome file eliminando slash e caratteri non ammessi dal filesystem
        const safe_title = user_req.trim().replace(/[/\\?%*:|"<>]/g, "_").slice(0, 40);
        chat_name = safe_title || `chat_${Date.now()}`;
        CHAT_PATH = path.join(CHATS_PATH, `${chat_name}.txt`);

        // Crea automaticamente il file della chat se non esiste
        try {
            await fs.writeFile(CHAT_PATH, "", { flag: "a" });
        } catch (err) {
            console.warn("ERRORE CREAZIONE FILE CHAT:", err);
        }
    }

    await chat_log("user", user_req, CHAT_PATH);
    const answer = await askLLM(user_req);
    await chat_log("jarvis", answer, CHAT_PATH);
    console.log(answer);

    const jev_res = await askJev(user_req);
    await execute_jev_choice(jev_res, CHAT_PATH);
}

async function chat_log(role, content, chat) {
    if (!chat) return;
    const args = role + ": " + content + "\n";
    try {
        await fs.mkdir(path.dirname(chat), { recursive: true });
        await fs.appendFile(chat, args, "utf-8");
    } catch (err) {
        console.warn("ERRORE IN CHAT_LOG(cli.js): " + err);
    }
}


async function askJev(prompt) {
    const systemPrompt = `Sei il modulo di selezione dei tool per un assistente AI locale.
In base alla richiesta, rispondi con il comando appropriato:

- Se la richiesta richiede di eseguire comandi da terminale, creare file o cartelle, o interagire col sistema:
tool_selector.py use run_shell_tool.py <comando_bash>

- Se la richiesta richiede di trascrivere un file audio:
tool_selector.py use use_stt.py <file_audio>

- Se la richiesta richiede una rielaborazione LLM:
tool_selector.py use backcall_llm.py <testo>

- Se è un semplice saluto, una normale conversazione o una risposta testuale che non richiede tool di sistema:
tool_selector.py nothing

Regola: scrivi direttamente il comando da eseguire sostituendo i parametri senza parentesi angolari.`;

    const response = await fetch(`http://${JEVLIKE_SERVER}/v1/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 500,
            temperature: 0.2,
            presence_penalty: 0.4
        })
    });

    if (!response.ok) {
        throw new Error(`Jev-like HTTP ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data.choices[0].message.content || "";

    // 1. Cerca il comando nella porzione finale dopo l'eventuale ragionamento </think>
    const afterThink = rawContent.includes("</think>") 
        ? rawContent.split("</think>").pop() 
        : rawContent;

    const regex = /tool_selector\.py\s+(use|nothing)[^\r\n<]*/i;
    let match = afterThink.match(regex);

    // 2. Se non lo trova dopo il think, cerca nell'intero testo generato
    if (!match) {
        match = rawContent.match(regex);
    }

    if (match) {
        return match[0].trim();
    }

    return afterThink.trim();
}

async function execute_jev_choice(jev_process, chatPath) {
    if (!jev_process) return;

    // Estrae il comando effettivo
    const match = jev_process.match(/tool_selector\.py\s+(use|nothing)[^\r\n<]*/i);
    const validCommand = match ? match[0].trim() : null;

    if (!validCommand || validCommand.includes("nothing")) {
        return;
    }

    console.log(`[Jev Action]: python ${validCommand}`);
    if (chatPath) {
        await chat_log("jev_action", `python ${validCommand}`, chatPath);
    }

    return new Promise((resolve) => {
        exec(`python ${validCommand}`, { cwd: EXE_TOOLS_PATH }, async (error, stdout, stderr) => {
            if (error) {
                console.error(`[ERRORE EXEC]: ${error.message}`);
                if (chatPath) await chat_log("tool_error", error.message, chatPath);
                resolve();
                return;
            }

            if (stderr) {
                console.error(`[STDERR]: ${stderr}`);
                if (chatPath) await chat_log("tool_stderr", stderr.trim(), chatPath);
            }

            if (stdout) {
                console.log(`[STDOUT]: ${stdout}`);
                if (chatPath) await chat_log("tool_stdout", stdout.trim(), chatPath);
            }
            resolve();
        });
    });
}