const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// === KONFIGURATION (aus Coolify) ===
const ERP_URL = process.env.ERP_URL; // z.B. http://100.78.117.19:8090
const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;
// Die URL deiner React-Webseite (damit nur DU zugreifen darfst!)
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "*"; 

if (!ERP_URL || !API_KEY || !API_SECRET) {
    console.error("❌ FEHLER: ENV Variablen fehlen!");
    process.exit(1);
}

// === 1. CORS Konfiguration (WICHTIG!) ===
// Erlaubt deinem React-Frontend den Zugriff auf diesen Server
app.use(cors({
    origin: ALLOWED_ORIGIN, 
    credentials: true
}));

// === 2. Der Proxy ===
app.use('/api', createProxyMiddleware({
    target: ERP_URL,
    changeOrigin: true,
    pathRewrite: {
        // Optional: Falls du Pfade anpassen musst
    },
    onProxyReq: (proxyReq) => {
        // Hier wird das Passwort sicher hinzugefügt
        proxyReq.setHeader('Authorization', `token ${API_KEY}:${API_SECRET}`);
        console.log(`Proxy Anfrage an: ${ERP_URL}`);
    }
}));

// Healthcheck (damit Coolify weiß, dass er läuft)
app.get('/health', (req, res) => res.send('Proxy is running OK'));

app.listen(PORT, () => {
    console.log(`🛡️  Proxy läuft auf Port ${PORT}`);
    console.log(`Allowed Origin: ${ALLOWED_ORIGIN}`);
});
