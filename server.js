const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
// body-parser brauchen wir hier NICHT mehr aktiv nutzen!

const app = express();
const PORT = process.env.PORT || 3000;

// Konfiguration (ENV Variablen aus Coolify)
const ERP_URL = process.env.ERP_URL; // http://backend-...:8000
const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "*";

// 1. CORS erlauben
app.use(cors({ origin: ALLOWED_ORIGIN, credentials: true }));

// WICHTIG: Kein app.use(bodyParser...) hier! 
// Wir wollen den Raw-Stream direkt weiterleiten.

// 2. Proxy Konfiguration
app.use('/api', createProxyMiddleware({
    target: ERP_URL,
    changeOrigin: true,
    
    onProxyReq: (proxyReq, req, res) => {
        // A. Authentifizierung
        proxyReq.setHeader('Authorization', `token ${API_KEY}:${API_SECRET}`);

        // B. Wichtige Header für ERPNext
        proxyReq.setHeader('Host', 'frontend');
        proxyReq.setHeader('X-Frappe-Site-Name', 'frontend');

        // C. Störende Header entfernen
        proxyReq.removeHeader('Origin');
        proxyReq.removeHeader('Referer');
        proxyReq.removeHeader('Cookie');
        
        // D. DER FIX FÜR 417:
        // Wir setzen ihn auf LEER (statt nur remove), das ist sicherer.
        proxyReq.setHeader('Expect', ''); 

        console.log(`📡 Proxy (Stream) -> Backend: ${req.method} ${req.url}`);
    },
    onError: (err, req, res) => {
        console.error('🔥 Proxy Error:', err);
        res.status(500).json({ error: 'Proxy Error', details: err.message });
    }
}));

// Nur für statische Dateien nutzen wir evtl. Parser, aber hier reicht static:
app.use(express.static('dist')); // Oder wo deine React-Dateien liegen

app.get('/health', (req, res) => res.send('Proxy OK'));

app.listen(PORT, () => {
    console.log(`🛡️  Proxy läuft auf Port ${PORT}`);
});
