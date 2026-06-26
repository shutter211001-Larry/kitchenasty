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

// The backend API URL for fetching dynamic settings
// If deployed in Railway with Internal Networking (Option A), this defaults to the internal URL
// If deployed with separate domains (Option B), VITE_API_URL should be set
const API_URL = process.env.VITE_API_URL_PUBLIC || process.env.API_URL_PRIVATE || 'http://api-server.railway.internal:3000';

console.log(`[Storefront] Starting server. Target API_URL is: ${API_URL}`);

// 1. Setup reverse proxy for API and Uploads (Replicating previous Nginx behavior)
// We only proxy if the request path starts with /api or /uploads AND VITE_API_URL is NOT set to an external domain
// Actually, if VITE_API_URL is set to an external domain, the frontend code will fetch directly from that domain, 
// so these proxy routes might not even be hit. But it's safe to always proxy them just in case.
const proxyOptions = {
  target: API_URL,
  changeOrigin: true,
  // Disable SSL verification for internal proxying if needed
  secure: false,
};

// Fast healthcheck route for Railway to prevent timeouts
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.use('/api', createProxyMiddleware(proxyOptions));
app.use('/uploads', createProxyMiddleware(proxyOptions));

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
        
        const title = settings.siteTitle || 'PizzaStudio - 線上點餐系統';
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
