const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');

// MIME types for serving static files
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // API endpoint to save day data
    if (req.method === 'POST' && req.url.startsWith('/api/save/')) {
        const dayMatch = req.url.match(/\/api\/save\/day(\d+)/);
        if (dayMatch) {
            const dayNum = dayMatch[1];
            let body = '';

            req.on('data', chunk => {
                body += chunk.toString();
            });

            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    const filePath = path.join(DATA_DIR, `day${dayNum}.json`);
                    
                    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: `Day ${dayNum} saved successfully` }));
                    console.log(`✅ Saved day${dayNum}.json`);
                } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: error.message }));
                    console.error(`❌ Error saving day${dayNum}:`, error.message);
                }
            });
            return;
        }
    }

    // API endpoint to load day data
    if (req.method === 'GET' && req.url.startsWith('/api/load/')) {
        const dayMatch = req.url.match(/\/api\/load\/day(\d+)/);
        if (dayMatch) {
            const dayNum = dayMatch[1];
            const filePath = path.join(DATA_DIR, `day${dayNum}.json`);
            
            try {
                if (fs.existsSync(filePath)) {
                    const data = fs.readFileSync(filePath, 'utf8');
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(data);
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ day: parseInt(dayNum), date: '', checkpoints: [] }));
                }
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
            return;
        }
    }

    // Serve static files
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, filePath);

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'text/plain';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log(`\n🚀 Travel Planner Server running at http://localhost:${PORT}`);
    console.log(`📁 Data directory: ${DATA_DIR}\n`);
});
