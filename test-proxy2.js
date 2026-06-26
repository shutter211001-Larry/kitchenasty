import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
app.use('/api', createProxyMiddleware({
  target: 'https://api.pizzastudio26.com',
  changeOrigin: true,
  secure: false,
  pathRewrite: {
    '^/api': '/api' // force adding /api back
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`Proxy Response Status: ${proxyRes.statusCode} for ${req.url}`);
  },
  onError: (err, req, res) => {
    console.log(`Proxy Error: ${err.message}`);
  }
}));

app.listen(8081, () => console.log('Proxy running on 8081'));
