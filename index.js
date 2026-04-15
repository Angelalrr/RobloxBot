const { Client, GatewayIntentBits } = require('discord.js');
const WebSocket = require('ws');
const http = require('http');

const CANALES = ['1490860769645039749', '1493042166656929994', '1493042607503183965'];

// Creamos un servidor web simple para que la nube no nos mate
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("BOT ONLINE");
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log("🟢 ROBLOX CONECTADO");
});

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.on('messageCreate', async (msg) => {
  if (!CANALES.includes(msg.channel.id)) return;
  
  let jobId = null;
  if (msg.components) {
    for (const row of msg.components) {
      for (const c of row.components) {
        if (c.url && c.url.includes('gameInstanceId=')) {
          jobId = c.url.split('gameInstanceId=')[1]?.split('&')[0];
        }
      }
    }
  }

  if (jobId) {
    const embed = msg.embeds[0];
    const money = embed ? (embed.description?.match(/\$([0-9.]+[KMB])/i) || ["", "0"])[1] : "0";

    const payload = JSON.stringify({
      brainrotName: "Detectado",
      jobId: jobId,
      income: money,
      playerCount: "1/8"
    });

    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) client.send(payload);
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
server.listen(process.env.PORT || 8000);
