import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
app.use('/api', createProxyMiddleware({
  target: 'https://api.pizzastudio26.com',
  changeOrigin: true,
  secure: false,
  onProxyReq: (proxyReq, req, res) => {
    console.log(`Proxying to: ${proxyReq.protocol}//${proxyReq.host}${proxyReq.path}`);
  }
}));

app.listen(8082, () => console.log('Proxy running on 8082'));
