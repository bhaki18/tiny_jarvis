import fs from "node:fs/promises";
import path from "node:path";
const HOST = "127.0.0.1";
const LLM_PORT = 8080;
const JEVLIKE_PORT = 8081;
const FILE_PATH = path.dirname(import.meta.filename);
const CHATS_PATH = path.join(FILE_PATH, "..", "chats");
const LLM_SERVER = HOST + ":" + LLM_PORT;
const JEVLIKE_SERVER = HOST + ":" + JEVLIKE_PORT;

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


async function askLLM(prompt) {
    const response = await fetch(`http://${LLM_SERVER}/v1/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            messages: [
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
fs.mkdir(CHATS_PATH, { recursive: true });
let CHAT_PATH;
while (run_cli) {
    const user_req = await ask();
    if (chat_name == null) {
        chat_name = user_req;
        CHAT_PATH = path.join(CHATS_PATH, chat_name);
    }

    chat_log("user", user_req, CHAT_PATH)
    const answer = await askLLM(user_req);
    chat_log("jarvis", answer, CHAT_PATH)

    console.log(answer);
}

async function chat_log(role, content, chat) {
    const args = role + ":" + content + "\n"
    try {
        await fs.appendFile(chat, args)
    } catch (err) {
        console.warn("ERRORE IN CHAT_LOG(cli.js):" + err);
    }
}