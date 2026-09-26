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


const OS_NAME = process.platform === "win32" ? "Windows" : "Linux";
const JARVIS_SYSTEM_PROMPT = `Sei Tiny Jarvis, un assistente AI avanzato che opera localmente sul computer dell'utente (${OS_NAME}).
Sei integrato con il modulo decisionale ed esecutivo Jev.

REGOLE DI RISPOSTA:
1. Rispondi all'utente in modo chiaro, naturale e cordiale.
2. Alla FINE della tua risposta, aggiungi SEMPRE il tag <tool> specificando lo strumento tecnico necessario per compiere l'azione richiesta:
   - Se l'utente chiede di cercare sul web, leggere una pagina internet, o ispezionare un URL (es. github, siti web):
     <tool>run_shell_tool.py curl -sL <url_valido> -o temp/web_search.txt && python backcall_llm.py temp/web_search.txt + "estrai e sintetizza le informazioni richieste dall'utente"</tool>
   - Se l'utente chiede di eseguire un comando da terminale, creare file o cartelle, o avviare applicazioni (es. spotify, browser, bash, cmd):
     <tool>run_shell_tool.py <comando_effettivo></tool>
   - Se l'utente chiede di trascrivere un file audio:
     <tool>use_stt.py <file_audio></tool>
   - Se è una semplice domanda, saluto o non serve eseguire alcun comando sul sistema operativo:
     <tool>nothing</tool>

ESEMPI:
- Utente: "cerca sul web https://github.com/bhaki18 e dimmi il nome dell'account"
  Risposta: Certamente! Sto cercando sul web la pagina di bhaki18 per verificare il nome del profilo. 🌐
  <tool>run_shell_tool.py curl -sL https://github.com/bhaki18 -o temp/web_search.txt && python backcall_llm.py temp/web_search.txt + "estrai e sintetizza il nome dell'account e della persona"</tool>

- Utente: "apri spotify"
  Risposta: Certamente! Sto avviando Spotify per te. 🎵
  <tool>run_shell_tool.py spotify</tool>

- Utente: "ciao come stai?"
  Risposta: Ciao! Tutto bene, sono pronto ad aiutarti.
  <tool>nothing</tool>`;

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
    const raw_answer = await askLLM(user_req);

    // 1. Estrae l'intento tecnico dal tag <tool> generato dall'LLM
    const toolMatch = raw_answer.match(/<tool>([\s\S]*?)<\/tool>/i);
    let extracted_tool = toolMatch ? toolMatch[1].trim() : null;

    // Fallback: se l'utente ha scritto esplicitamente comandi o ricerche web
    if (!extracted_tool || extracted_tool === "nothing") {
        const urlMatch = user_req.match(/(?:https?:\/\/|www\.)[^\s]+/i) || user_req.match(/github(?:\.com)?\/[a-zA-Z0-9_-]+/i);
        const explicitCmd = user_req.match(/^(?:esegui\s+(?:il\s+)?comando\s*:?\s*)(.+)/i);

        if (urlMatch) {
            let targetUrl = urlMatch[0];
            if (targetUrl.includes("github/")) targetUrl = targetUrl.replace("github/", "github.com/");
            if (!targetUrl.startsWith("http")) targetUrl = "https://" + targetUrl;
            extracted_tool = `run_shell_tool.py curl -sL ${targetUrl} -o temp/web_search.txt && python backcall_llm.py temp/web_search.txt + "${user_req.replace(/"/g, "'")}"`;
        } else if (explicitCmd) {
            extracted_tool = `run_shell_tool.py ${explicitCmd[1].trim()}`;
        } else {
            extracted_tool = "nothing";
        }
    }

    // 2. Pulisce la risposta per l'utente rimuovendo i tag <tool>
    const clean_answer = raw_answer.replace(/<tool>[\s\S]*?<\/tool>/gi, "").trim();
    await chat_log("jarvis", clean_answer, CHAT_PATH);
    console.log(clean_answer);

    // 3. Instrada ed esegue il Tool selezionato
    const command_to_run = (extracted_tool && extracted_tool !== "nothing")
        ? `tool_selector.py use ${extracted_tool}`
        : "tool_selector.py nothing";

    await execute_jev_choice(command_to_run, CHAT_PATH);
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


async function askJev(tool_intent) {
    // Se non serve compiere alcuna azione, Jev non interviene
    if (!tool_intent || tool_intent === "nothing") {
        return "tool_selector.py nothing";
    }

    const systemPrompt = `Sei il modulo di controllo di Tiny Jarvis.
Valuta l'azione richiesta.
Se è un comando o azione valida da eseguire: rispondi USE.
Se non serve fare nulla o è vuota: rispondi NOTHING.
Rispondi con una sola parola: USE o NOTHING.`;

    try {
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
                        content: tool_intent
                    }
                ],
                max_tokens: 15,
                temperature: 0.1
            })
        });

        if (!response.ok) {
            return `tool_selector.py use ${tool_intent}`;
        }

        const data = await response.json();
        const content = (data.choices[0].message.content || "").trim();
        const firstWord = content.split(/[\s\n]+/)[0].toUpperCase();

        if (firstWord.includes("USE")) {
            return `tool_selector.py use ${tool_intent}`;
        } else {
            return "tool_selector.py nothing";
        }
    } catch {
        return `tool_selector.py use ${tool_intent}`;
    }
}

async function execute_jev_choice(jev_process, chatPath, extracted_tool) {
    // Estrae il comando effettivo
    const match = jev_process ? jev_process.match(/tool_selector\.py\s+(use|nothing)[^\r\n<]*/i) : null;
    let validCommand = match ? match[0].trim() : null;

    // Fallback automatico se Jev non ha formattato ma l'LLM ha estratto un tool valido
    if (!validCommand && extracted_tool && extracted_tool !== "nothing") {
        validCommand = `tool_selector.py use ${extracted_tool}`;
    }

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