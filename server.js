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
        const targetUrl = `${ERP_URL}${req.originalUrl}`;

        // Headers vorbereiten - Expect Header entfernen!
        const headers = {
            'Authorization': `token ${API_KEY}:${API_SECRET}`,
            'Content-Type': 'application/json',
            'X-Frappe-Site-Name': 'frontend',
            'Host': 'frontend'
        };

        // WICHTIG: Expect Header explizit entfernen
        // (wird sonst automatisch von fetch hinzugefügt)

        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: headers,
            // Expect Header verhindern
            signal: AbortSignal.timeout(30000) // Optional: Timeout
        });

        console.log(`📊 ERPNext Response Status: ${response.status}`);
        console.log(`📊 ERPNext Response Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);

        const data = await response.json();
        console.log(`📦 ERPNext Response Data: ${JSON.stringify(data).substring(0, 500)}...`);

        res.status(response.status).json(data);

    } catch (error) {
        console.error("🔥 Fehler beim GET:", error);
        console.error("🔥 Error Details:", error.stack);
        res.status(500).json({
            error: error.message,
            details: "Proxy konnte nicht mit ERPNext kommunizieren",
            timestamp: new Date().toISOString()
        });
    }
});

// 5. Manuelle Proxy-Funktion für PATCH (analog zu POST)
app.patch('/api/*', async (req, res) => {
    try {
        const targetUrl = `${ERP_URL}${req.path}`;
        const response = await fetch(targetUrl, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${API_KEY}:${API_SECRET}`,
                'Content-Type': 'application/json',
                'X-Frappe-Site-Name': 'frontend',
                'Host': 'frontend'
            },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error("🔥 Fehler beim PATCH:", error);
        res.status(500).json({ error: error.message });
    }
});

// 6. Manuelle Proxy-Funktion für PUT (analog zu POST)
app.put('/api/*', async (req, res) => {
    try {
        const targetUrl = `${ERP_URL}${req.path}`;
        const response = await fetch(targetUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${API_KEY}:${API_SECRET}`,
                'Content-Type': 'application/json',
                'X-Frappe-Site-Name': 'frontend',
                'Host': 'frontend'
            },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error("🔥 Fehler beim PUT:", error);
        res.status(500).json({ error: error.message });
    }
});

// Health-Check Endpoint für Debugging
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        config: {
            erpUrl: ERP_URL ? 'configured' : 'missing',
            apiKey: API_KEY ? 'configured' : 'missing',
            apiSecret: API_SECRET ? 'configured' : 'missing',
            frontendUrl: ALLOWED_ORIGIN
        }
    });
});

// Test-Endpoint für ERPNext Verbindung
app.get('/test-erpnext', async (req, res) => {
    try {
        const testUrl = `${ERP_URL}/api/method/frappe.auth.get_logged_user`;
        console.log(`🧪 Teste ERPNext Verbindung: ${testUrl}`);

        const response = await fetch(testUrl, {
            method: 'GET',
            headers: {
                'Authorization': `token ${API_KEY}:${API_SECRET}`,
                'Content-Type': 'application/json',
            }
        });

        const data = await response.text();
        res.json({
            status: response.status,
            erpUrl: ERP_URL,
            response: data.substring(0, 200)
        });

    } catch (error) {
        res.status(500).json({
            error: error.message,
            erpUrl: ERP_URL,
            stack: error.stack
        });
    }
});

// Statische Dateien (Frontend)
app.use(express.static('dist'));

app.listen(PORT, () => {
    console.log(`🛡️  Manueller Proxy läuft auf Port ${PORT}`);
    console.log(`🔧 ERP_URL: ${ERP_URL || 'NICHT GESETZT'}`);
    console.log(`🔑 API_KEY: ${API_KEY ? 'gesetzt' : 'NICHT GESETZT'}`);
    console.log(`🔒 API_SECRET: ${API_SECRET ? 'gesetzt' : 'NICHT GESETZT'}`);
});
// 5. Proxy für öffentliche Dateien (Bilder)  
app.get('/files/*', async (req, res) => {
    try {
        const targetUrl = `${ERP_URL}${req.originalUrl}`;
        console.log(`📁 Lade Datei: ${targetUrl}`);

        const response = await fetch(targetUrl, {
            method: 'GET',
            // Keine Authentifizierung für öffentliche Dateien
            headers: {
                'X-Frappe-Site-Name': 'frontend',
                'Host': 'frontend'
            }
        });

        // Stream die Datei direkt weiter
        if (response.ok) {
            // Headers weiterleiten
            for (const [key, value] of response.headers) {
                res.setHeader(key, value);
            }
            
            // Body als Buffer lesen und senden
            const buffer = await response.arrayBuffer();
            res.send(Buffer.from(buffer));
        } else {
            res.status(response.status).send(await response.text());
        }

    } catch (error) {
        console.error("🔥 Fehler beim Laden der Datei:", error);
        res.status(500).json({ error: error.message });
    }
});