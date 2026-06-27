import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  secure: false,
  onProxyRes: (proxyRes, req, res) => {
    console.log(`Proxy Response Status: ${proxyRes.statusCode}`);
  },
  onError: (err, req, res) => {
    console.log(`Proxy Error: ${err.message}`);
  }
}));

app.listen(8080, () => console.log('Proxy running on 8080'));
