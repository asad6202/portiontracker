require('dotenv').config();
const http = require('http');
const { handler } = require('./netlify/functions/analyze-meal-photo');

const PORT = Number(process.env.PORT) || 4000;

function collectBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname.replace(/\/$/, '') || '/';

  if (path === '/' || path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'portion-track-backend' }));
    return;
  }

  const isAnalyzeRoute =
    path === '/analyze-meal-photo' ||
    path === '/.netlify/functions/analyze-meal-photo';

  if (!isAnalyzeRoute) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  try {
    const body = await collectBody(req);
    const result = await handler({
      httpMethod: req.method,
      path,
      headers: req.headers,
      body,
    });

    res.writeHead(result.statusCode, result.headers);
    res.end(result.body);
  } catch (err) {
    console.error('[server] Error:', err.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

server.listen(PORT, () => {
  console.log(`Portion tracker API running at http://localhost:${PORT}`);
  console.log(`POST http://localhost:${PORT}/analyze-meal-photo`);
});
