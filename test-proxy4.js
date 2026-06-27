import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
app.use(createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  secure: false,
  pathFilter: ['/api', '/uploads'],
  onProxyRes: (proxyRes, req, res) => {
    console.log(`Proxy Response Status: ${proxyRes.statusCode} for ${req.url}`);
  }
}));

app.listen(8083, () => console.log('Proxy running on 8083'));
