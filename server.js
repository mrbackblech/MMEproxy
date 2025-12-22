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
    changeOrigin: true, // Wichtig!
    onProxyReq: (proxyReq, req, res) => {
        // 1. Authentifizierung
        proxyReq.setHeader('Authorization', `token ${API_KEY}:${API_SECRET}`);

        // 2. Browser-Header entfernen (wichtig für Sicherheit)
        proxyReq.removeHeader('Origin');
        proxyReq.removeHeader('Referer');
        proxyReq.removeHeader('Cookie');

        // 3. FIX FÜR FEHLER 417 (WICHTIG!)
        // Node.js sendet bei POST oft "Expect: 100-continue". 
        // Das mag ERPNext/Nginx nicht und wirft Fehler 417. Wir löschen ihn hier.
        proxyReq.removeHeader('Expect'); 

        console.log(`📡 Proxy Anfrage: ${req.url}`);
    }
}));


// Healthcheck (damit Coolify weiß, dass er läuft)
app.get('/health', (req, res) => res.send('Proxy is running OK'));

app.listen(PORT, () => {
    console.log(`🛡️  Proxy läuft auf Port ${PORT}`);
    console.log(`Allowed Origin: ${ALLOWED_ORIGIN}`);
});
