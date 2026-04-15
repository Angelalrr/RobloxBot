console.log("🚀 El programa ha comenzado a ejecutarse...");
require('dotenv').config(); // Carga el archivo .env
const { Client, GatewayIntentBits } = require('discord.js');
const WebSocket = require('ws');
const axios = require('axios'); // Para llamar a la API de Roblox

// --- CONFIGURACIÓN ---
const TOKEN = process.env.DISCORD_TOKEN; // Saca el token del archivo secreto
const PLACE_ID = "109983668079237"; // ID del juego de los Brainrots
const CANALES_BRAINROT = [
    '1490860769645039749', // Bajo
    '1493042166656929994', // Medio
    '1493042607503183965'  // Alto
];
const PUERTO_WEBSOCKET = 8081;
// ----------------------

// Variable para guardar servidores recientes y no saturar la API
const cacheServidores = new Map();

async function obtenerJugadoresRoblox(jobId) {
    // 1. Si ya lo buscamos hace poco, devolver el valor guardado
    if (cacheServidores.has(jobId)) {
        const data = cacheServidores.get(jobId);
        if (Date.now() - data.time < 30000) { // 30 segundos de cache
            return data.players;
        }
    }

    try {
        const url = `https://games.roblox.com/v1/games/${PLACE_ID}/servers/Public?limit=100`;
        const respuesta = await axios.get(url);
        
        const servidor = respuesta.data.data.find(s => s.id === jobId);
        
        if (servidor) {
            const info = `${servidor.playing}/${servidor.maxPlayers}`;
            cacheServidores.set(jobId, { players: info, time: Date.now() });
            return info;
        }
        return "1/8"; 
    } catch (error) {
        if (error.response && error.response.status === 429) {
            console.log("⚠️ Roblox dice: 'Vas muy rápido'. Usando dato por defecto...");
            return "1/8"; // Enviamos 1/8 para que el script de Roblox intente entrar
        }
        console.error("❌ Error API Roblox:", error.message);
        return "0/8";
    }
}

const wss = new WebSocket.Server({ port: PUERTO_WEBSOCKET });
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

wss.on('connection', (ws) => console.log('🟢 Roblox conectado al puente'));

client.on('messageCreate', async (message) => {
    if (!CANALES_BRAINROT.includes(message.channel.id)) return;

    // 1. EXTRAER JOBID DEL BOTÓN
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

    // 2. EXTRAER NOMBRE Y DINERO DEL EMBED
    let brainrotName = "Brainrot";
    let income = "0";

    if (message.embeds.length > 0) {
        const embed = message.embeds[0];
        const contenido = (embed.title || "") + " " + (embed.description || "");
        
        const nameMatch = contenido.match(/Highlight: (.*?) Detected/i);
        brainrotName = nameMatch ? nameMatch[1].trim() : (contenido.match(/\*\*(.*?)\*\*/) ? contenido.match(/\*\*(.*?)\*\*/)[1] : "Brainrot");

        const moneyMatch = contenido.match(/\$([0-9.]+[KMB])/i);
        income = moneyMatch ? moneyMatch[1] : "0";
    }

    // 3. CONSULTAR JUGADORES EN TIEMPO REAL
    console.log(`⏳ Consultando jugadores para el server ${jobId.substring(0,6)}...`);
    const playerCount = await obtenerJugadoresRoblox(jobId);

    console.log(`✨ [${playerCount}] ${brainrotName} | ${income}`);

    // 4. ENVIAR A ROBLOX
    const payload = JSON.stringify({
        brainrotName: brainrotName,
        jobId: jobId,
        income: income,
        playerCount: playerCount // Enviamos la cantidad real (ej: 5/8)
    });

    wss.clients.forEach(wsClient => {
        if (wsClient.readyState === WebSocket.OPEN) wsClient.send(payload);
    });
});

client.login(TOKEN);