const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// === KONFIGURATION (aus Coolify) ===
const ERP_URL = process.env.ERP_URL || "http://100.78.117.19:8090";
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
// ... (oberer Teil bleibt gleich)



app.use('/api', createProxyMiddleware({
    target: ERP_URL,
    changeOrigin: true,
    onProxyReq: (proxyReq, req, res) => {
        // 1. Authentifizierung
        proxyReq.setHeader('Authorization', `token ${API_KEY}:${API_SECRET}`);

        // 2. DIE LÖSUNG FÜR FEHLER 417
        // Wir zwingen ERPNext dazu, die Site "frontend" zu nutzen.
        proxyReq.setHeader('X-Frappe-Site-Name', 'frontend');
        proxyReq.setHeader('Host', 'frontend');

        // 3. Störfaktoren entfernen
        proxyReq.removeHeader('Origin');
        proxyReq.removeHeader('Referer');
        proxyReq.removeHeader('Cookie'); // Wichtig! Alte Cookies blockieren oft die API.

        console.log(`📡 Proxy leitet weiter an: ${ERP_URL}${req.url} (Site: frontend)`);
    },
    onError: (err, req, res) => {
        console.error('🔥 Proxy Fehler:', err);
        res.status(500).json({ error: 'Proxy Error', details: err.message });
    }
}));




// Healthcheck (damit Coolify weiß, dass er läuft)
app.get('/health', (req, res) => res.send('Proxy is running OK'));

app.listen(PORT, () => {
    console.log(`🛡️  Proxy läuft auf Port ${PORT}`);
    console.log(`Allowed Origin: ${ALLOWED_ORIGIN}`);
});
