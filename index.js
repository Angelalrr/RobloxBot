require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const WebSocket = require('ws');
const axios = require('axios');
const http = require('http'); // Necesario para que la nube no se apague

// --- CONFIGURACIÓN ---
const TOKEN = process.env.DISCORD_TOKEN;
const PLACE_ID = "109983668079237";
const CANALES_BRAINROT = ['1490860769645039749', '1493042166656929994', '1493042607503183965'];
const PORT = process.env.PORT || 8080; // Render nos dará el puerto automáticamente

// Servidor HTTP básico para que Render sepa que el bot está vivo
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Bot de Brainrot funcionando 24/7");
});

const wss = new WebSocket.Server({ server });

async function obtenerJugadoresRoblox(jobId) {
    try {
        const url = `https://games.roblox.com/v1/games/${PLACE_ID}/servers/Public?limit=100`;
        const respuesta = await axios.get(url);
        const servidor = respuesta.data.data.find(s => s.id === jobId);
        return servidor ? `${servidor.playing}/${servidor.maxPlayers}` : "1/8";
    } catch (e) {
        return "1/8"; // Si hay error 429, enviamos 1/8 para no trabar el proceso
    }
}

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.on('messageCreate', async (message) => {
    if (!CANALES_BRAINROT.includes(message.channel.id)) return;

    let jobId = null;
    if (message.components) {
        for (const row of message.components) {
            for (const comp of row.components) {
                if (comp.url && comp.url.includes('gameInstanceId=')) {
                    jobId = comp.url.split('gameInstanceId=')[1]?.split('&')[0];
                }
            }
        }
    }

    if (!jobId) return;

    const playerCount = await obtenerJugadoresRoblox(jobId);
    
    // Extraer datos básicos
    const embed = message.embeds[0];
    const contenido = embed ? (embed.title + " " + embed.description) : "Brainrot";
    const moneyMatch = contenido.match(/\$([0-9.]+[KMB])/i);
    const income = moneyMatch ? moneyMatch[1] : "0";

    const payload = JSON.stringify({
        brainrotName: "Brainrot Detectado",
        jobId: jobId,
        income: income,
        playerCount: playerCount
    });

    wss.clients.forEach(wsClient => {
        if (wsClient.readyState === WebSocket.OPEN) wsClient.send(payload);
    });
});

server.listen(PORT, () => {
    console.log(`📡 Servidor WebSocket en puerto ${PORT}`);
});
client.login(TOKEN);
