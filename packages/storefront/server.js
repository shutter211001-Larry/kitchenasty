import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

process.on('uncaughtException', (err) => {
  console.error('[Storefront] FATAL UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Storefront] FATAL UNHANDLED REJECTION:', reason);
  process.exit(1);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 80;

// For server-side proxying and SSR fetching, we strongly prefer the internal private URL (API_URL_PRIVATE).
// This bypasses Cloudflare WAF and DNS overhead, preventing 403 Forbidden errors when Railway IPs are blocked.
let API_URL;
if (process.env.API_URL_PRIVATE) {
  API_URL = process.env.API_URL_PRIVATE;
} else if (process.env.RAILWAY_ENVIRONMENT) {
  // If we are on Railway, default to the standard internal URL for the api-server
  // This saves the user from having to manually add API_URL_PRIVATE to every frontend service
  API_URL = 'http://api-server.railway.internal:3000';
} else {
  // Fallback to public URL (e.g. if hosted on Vercel or local)
  API_URL = process.env.VITE_API_URL_PUBLIC || 'http://localhost:3000';
}

// Ensure API_URL has a valid protocol to prevent 'Invalid URL' crashes
if (API_URL && !API_URL.startsWith('http://') && !API_URL.startsWith('https://')) {
  if (API_URL.includes('.railway.internal') || API_URL.includes('localhost') || API_URL.includes('127.0.0.1')) {
    API_URL = `http://${API_URL}`;
  } else {
    API_URL = `https://${API_URL}`;
  }
}
// Add default port for Railway internal if missing
if (API_URL.includes('.railway.internal') && !API_URL.match(/:\d+$/)) {
  API_URL = `${API_URL}:3000`;
}

console.log(`[Storefront] Starting server. Target API_URL is: ${API_URL}`);

// 1. Setup reverse proxy for API and Uploads (Replicating previous Nginx behavior)
// We use pathFilter so that http-proxy-middleware preserves the /api or /uploads prefix in the forwarded request.
const proxyOptions = {
  target: API_URL,
  changeOrigin: true,
  pathFilter: ['/api', '/uploads'], // Only proxy these paths, keeping the prefix intact
  secure: false, // Disable SSL verification for internal proxying if needed
};

// Fast healthcheck route for Railway to prevent timeouts
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Use the proxy globally so it can inspect all paths and filter them
app.use(createProxyMiddleware(proxyOptions));

// 2. Serve static files from the 'dist' directory, EXCEPT index.html
app.use(express.static(path.join(__dirname, 'dist'), { index: false }));

// 3. Catch-all route to serve index.html with dynamically injected SEO tags
app.use(async (req, res) => {
  try {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    let html = await fs.readFile(indexPath, 'utf-8');

    // Attempt to fetch settings from backend to dynamically render SEO tags
    try {
      const fetchUrl = new URL('/api/settings', API_URL).toString();
      const response = await fetch(fetchUrl, { signal: AbortSignal.timeout(3000) });
      
      if (response.ok) {
        const result = await response.json();
        const settings = result.data || {};
        
        const title = settings.siteTitle || '夏特點餐系統';
        const desc = settings.siteDescription || '專門提供美味手工披薩與線上點餐服務';
        const url = settings.storefrontUrl || `https://${req.get('host')}`;
        // Logo could be a relative URL (/uploads/...), we should make it absolute for OG:image
        let ogImage = '';
        if (settings.logo) {
            ogImage = settings.logo.startsWith('http') ? settings.logo : `${API_URL}${settings.logo}`;
        }

        // Replace placeholders in index.html
        html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
        html = html.replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${desc}" />`);
        html = html.replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${title}" />`);
        html = html.replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${desc}" />`);
        html = html.replace(/<meta property="og:url" content=".*?" \/>/, `<meta property="og:url" content="${url}" />`);
        
        if (ogImage) {
            // Inject og:image if missing
            if (html.includes('<meta property="og:image"')) {
                html = html.replace(/<meta property="og:image" content=".*?" \/>/, `<meta property="og:image" content="${ogImage}" />`);
            } else {
                html = html.replace('</head>', `    <meta property="og:image" content="${ogImage}" />\n  </head>`);
            }
        }
      }
    } catch (fetchErr) {
      console.warn('[Storefront] Failed to fetch settings for SEO rendering. Using default HTML.', fetchErr.message);
    }

    res.send(html);
  } catch (err) {
    console.error('[Storefront] Error serving index.html:', err);
    res.status(500).send('Server Error');
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`[Storefront] Node server listening on port ${port}`);
});
