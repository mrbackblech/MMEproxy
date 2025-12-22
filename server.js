const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Konfiguration
const ERP_URL = process.env.ERP_URL; // http://backend...:8000
const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "*";

// 1. CORS erlauben
app.use(cors({ origin: ALLOWED_ORIGIN, credentials: true }));

// 2. JSON Parser aktivieren (Damit wir die Daten lesen können)
app.use(express.json());

// 3. Manuelle Proxy-Funktion für POST (Formular)
app.post('/api/*', async (req, res) => {
    try {
        // Die Ziel-URL zusammenbauen (z.B. http://backend:8000/api/resource/Lead)
        // req.path enthält z.B. "/api/resource/Lead"
        const targetUrl = `${ERP_URL}${req.path}`;
        
        console.log(`🚀 Sende POST an: ${targetUrl}`);

        // Wir machen einen ganz frischen Fetch-Call (Server-to-Server)
        // Das garantiert, dass keine "Expect"-Header vom Browser mitschleifen.
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Authorization': `token ${API_KEY}:${API_SECRET}`,
                'Content-Type': 'application/json',
                'X-Frappe-Site-Name': 'frontend',
                'Host': 'frontend'
            },
            body: JSON.stringify(req.body) // Wir nehmen die Daten und packen sie neu ein
        });

        // Antwort vom ERPNext lesen
        const data = await response.json();

        // Statuscode und Daten an den Browser zurückgeben
        res.status(response.status).json(data);

    } catch (error) {
        console.error("🔥 Fehler beim POST:", error);
        res.status(500).json({ error: error.message });
    }
});

// 4. Manuelle Proxy-Funktion für GET (Projekte laden)
app.get('/api/*', async (req, res) => {
    try {
        const targetUrl = `${ERP_URL}${req.originalUrl}`; // originalUrl enthält auch ?fields=...
        console.log(`🔍 Sende GET an: ${targetUrl}`);

        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'Authorization': `token ${API_KEY}:${API_SECRET}`,
                'Content-Type': 'application/json',
                'X-Frappe-Site-Name': 'frontend',
                'Host': 'frontend'
            }
        });

        const data = await response.json();
        res.status(response.status).json(data);

    } catch (error) {
        console.error("🔥 Fehler beim GET:", error);
        res.status(500).json({ error: error.message });
    }
});

// Statische Dateien (Frontend)
app.use(express.static('dist')); 

app.listen(PORT, () => {
    console.log(`🛡️  Manueller Proxy läuft auf Port ${PORT}`);
});
