import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { exec } from "node:child_process";

const PORT = 3000;
const GUI_DIR = path.dirname(import.meta.filename);
const ROOT_DIR = path.join(GUI_DIR, "..");
const CHATS_DIR = path.join(ROOT_DIR, "chats");
const EXE_TOOLS_PATH = path.join(ROOT_DIR, "exe_tools");

const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".txt": "text/plain; charset=utf-8"
};

async function logToChatFile(chatName, role, content) {
    if (!chatName) return;
    try {
        await fs.mkdir(CHATS_DIR, { recursive: true });
        const safeTitle = chatName.replace(/[/\\?%*:|"<>]/g, "_").slice(0, 40);
        const chatFile = path.join(CHATS_DIR, `${safeTitle}.txt`);
        const entry = `${role}: ${content}\n`;
        await fs.appendFile(chatFile, entry, "utf-8");
    } catch (err) {
        console.warn("[GUI Server] Errore salvataggio chat:", err.message);
    }
}

const server = http.createServer(async (req, res) => {
    // Abilita CORS completo per consentire chiamate da qualsiasi origine/porta locale
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);

    // Endpoint di stato per confermare che GUI_server è attivo e pronto a lanciare i tools
    if (url.pathname === "/api/status" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", running: true }));
        return;
    }

    // Endpoint API: lista delle chat salvate su disco
    if (url.pathname === "/api/chats" && req.method === "GET") {
        try {
            await fs.mkdir(CHATS_DIR, { recursive: true });
            const files = await fs.readdir(CHATS_DIR);
            const chatsData = [];

            for (const file of files) {
                if (file.endsWith(".txt")) {
                    const filePath = path.join(CHATS_DIR, file);
                    const content = await fs.readFile(filePath, "utf-8");
                    const lines = content.split("\n").filter(l => l.trim().length > 0);
                    const messages = [];

                    for (const line of lines) {
                        const colonIndex = line.indexOf(":");
                        if (colonIndex > 0) {
                            const sender = line.slice(0, colonIndex).trim();
                            const msgText = line.slice(colonIndex + 1).trim();
                            if (sender === "user" || sender === "jarvis") {
                                messages.push({
                                    role: sender === "user" ? "user" : "assistant",
                                    content: msgText
                                });
                            }
                        }
                    }

                    chatsData.push({
                        id: file.replace(".txt", ""),
                        title: file.replace(".txt", "").replace(/_/g, " "),
                        messages
                    });
                }
            }

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(chatsData));
        } catch (err) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // Endpoint API: log di un turno di conversazione
    if (url.pathname === "/api/log-chat" && req.method === "POST") {
        let body = "";
        req.on("data", chunk => { body += chunk; });
        req.on("end", async () => {
            try {
                const { chatName, role, content } = JSON.parse(body || "{}");
                await logToChatFile(chatName, role, content);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // Endpoint API: ESECUZIONE REALE DEI TOOL TRAMITE PYTHON (tool_selector.py)
    if (url.pathname === "/api/exec-tool" && req.method === "POST") {
        let body = "";
        req.on("data", chunk => { body += chunk; });
        req.on("end", () => {
            try {
                const { tool, chatName } = JSON.parse(body || "{}");
                if (!tool || tool === "nothing") {
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: true, output: "Nessuna azione richiesta." }));
                    return;
                }

                // Costruisce ed esegue il comando identico a quello della CLI
                const validCommand = `python tool_selector.py use ${tool}`;
                console.log(`\n[GUI Tool Request]: ${validCommand}`);

                if (chatName) {
                    logToChatFile(chatName, "jev_action", validCommand);
                }

                exec(validCommand, { cwd: EXE_TOOLS_PATH, shell: true }, async (error, stdout, stderr) => {
                    const cleanStdout = (stdout || "").trim();
                    const cleanStderr = (stderr || "").trim();

                    if (chatName) {
                        if (cleanStdout) await logToChatFile(chatName, "tool_stdout", cleanStdout);
                        if (cleanStderr) await logToChatFile(chatName, "tool_stderr", cleanStderr);
                        if (error) await logToChatFile(chatName, "tool_error", error.message);
                    }

                    if (error) {
                        console.error(`[Tool Error]: ${error.message}`);
                    } else {
                        console.log(`[Tool Success]: ${cleanStdout || "Completato"}`);
                    }

                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({
                        success: !error,
                        stdout: cleanStdout,
                        stderr: cleanStderr,
                        output: cleanStdout || cleanStderr || "Comando avviato con successo sul sistema.",
                        error: error ? error.message : null
                    }));
                });
            } catch (err) {
                console.error("[Tool Parse Error]:", err);
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // Servizio file statici (index.html, main.css, main.js)
    let filePath = path.join(GUI_DIR, url.pathname === "/" ? "index.html" : url.pathname);
    
    try {
        const stats = await fs.stat(filePath);
        if (stats.isDirectory()) {
            filePath = path.join(filePath, "index.html");
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";
        const content = await fs.readFile(filePath);

        res.writeHead(200, { "Content-Type": contentType });
        res.end(content);
    } catch {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("404 File Non Trovato");
    }
});

server.listen(PORT, "127.0.0.1", () => {
    console.log(`\n======================================================`);
    console.log(`🤖 Tiny Jarvis GUI Server attivo su: http://127.0.0.1:${PORT}`);
    console.log(`⚡ Endpoint esecuzione tool pronto: POST /api/exec-tool`);
    console.log(`======================================================\n`);
});
