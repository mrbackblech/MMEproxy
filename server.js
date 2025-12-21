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
// ... (oberer Teil bleibt gleich)

app.use('/api', createProxyMiddleware({
    target: ERP_URL,
    changeOrigin: true,
    pathRewrite: {
        // Falls nötig
    },
    onProxyReq: (proxyReq, req, res) => {
        // 1. Auth Header (wie gehabt)
        proxyReq.setHeader('Authorization', `token ${API_KEY}:${API_SECRET}`);

        // === NEU: DIE FIXES FÜR FEHLER 417 ===

        // 2. Sage ERPNext explizit, welche Site wir meinen
        // Da wir im Docker-Setup 'bench new-site frontend' gemacht haben:
        proxyReq.setHeader('X-Frappe-Site-Name', 'frontend');
        proxyReq.setHeader('Host', 'frontend'); 

        // 3. Störende Header vom Browser entfernen
        // Wenn ERPNext sieht, dass die Anfrage von "localhost" oder deiner Domain kommt,
        // blockiert es sie manchmal. Wir tun so, als käme sie von "intern".
        proxyReq.removeHeader('Origin');
        proxyReq.removeHeader('Referer');
        
        // 4. Cookies entfernen
        // Wenn du noch eingeloggt warst, stört das Session-Cookie den API-Token.
        proxyReq.removeHeader('Cookie');

        console.log(`Proxy Anfrage an: ${ERP_URL}${req.url} (Site: frontend)`);
    },
    onError: (err, req, res) => {
        console.error('Proxy Fehler:', err);
        res.status(500).send('Proxy Error: ' + err.message);
    }
}));


// Healthcheck (damit Coolify weiß, dass er läuft)
app.get('/health', (req, res) => res.send('Proxy is running OK'));

app.listen(PORT, () => {
    console.log(`🛡️  Proxy läuft auf Port ${PORT}`);
    console.log(`Allowed Origin: ${ALLOWED_ORIGIN}`);
});
