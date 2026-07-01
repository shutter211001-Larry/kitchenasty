import { createServer } from 'http';
import { createApp } from './app.js';
import { initSocket } from './lib/socket.js';
import { serverLogger } from './lib/logger.js';

const PORT = process.env.PORT || 3000;
createApp().then(app => {
  const httpServer = createServer(app);

  initSocket(httpServer);

  const HOST = process.env.HOST || '::';

  httpServer.listen(Number(PORT), HOST, () => {
    serverLogger.info(`夏特點餐系統服務器已啟動：http://${HOST === '::' ? '[::]' : HOST}:${PORT}`);
  });
}).catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
