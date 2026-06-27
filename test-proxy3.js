import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  secure: false,
  onProxyReq: (proxyReq, req, res) => {
    console.log(`Proxying to: ${proxyReq.protocol}//${proxyReq.host}${proxyReq.path}`);
  }
}));

app.listen(8082, () => console.log('Proxy running on 8082'));
