const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Konfiguration (ENV Variablen aus Coolify)
// Wir nutzen wieder den offiziellen Nginx Port 8090
const ERP_URL = process.env.ERP_URL || "http://100.78.117.19:8090";
const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "*";

// 1. CORS erlauben
app.use(cors({ origin: ALLOWED_ORIGIN, credentials: true }));

// 2. Body Parser aktivieren (Wichtig für den Nginx Fix)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 3. Proxy Konfiguration
app.use('/api', createProxyMiddleware({
    target: ERP_URL,
    changeOrigin: true,
    
    onProxyReq: (proxyReq, req, res) => {
        // Authentifizierung
        proxyReq.setHeader('Authorization', `token ${API_KEY}:${API_SECRET}`);

        // WICHTIG: Das Backend braucht diesen Header, da Nginx ihn nicht mehr setzt!
        proxyReq.setHeader('X-Frappe-Site-Name', 'frontend');
        proxyReq.setHeader('Host', 'frontend');


        // C. Störende Header entfernen
        proxyReq.removeHeader('Origin');
        proxyReq.removeHeader('Referer');
        proxyReq.removeHeader('Cookie');
        proxyReq.removeHeader('Expect'); // Der 417-Killer

        // D. Body "restreamen" (Daten neu schreiben)
        // Da wir oben 'bodyParser' nutzen, wurde der Stream bereits "konsumiert".
        // Wir müssen ihn hier für Nginx neu schreiben.
        if (req.body && Object.keys(req.body).length > 0) {
            const bodyData = JSON.stringify(req.body);
            
            // Content-Length korrigieren (damit Nginx nicht wartet oder abbricht)
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.setHeader('Content-Type', 'application/json');
            
            // Daten senden
            proxyReq.write(bodyData);
        }
        
        console.log(`📡 Proxy -> Nginx (${ERP_URL}): ${req.method} ${req.url}`);
    },
    onError: (err, req, res) => {
        console.error('🔥 Proxy Error:', err);
        res.status(500).json({ error: 'Proxy Error', details: err.message });
    }
}));

app.get('/health', (req, res) => res.send('Proxy OK'));

app.listen(PORT, () => {
    console.log(`🛡️  Proxy läuft auf Port ${PORT}`);
});
