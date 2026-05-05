import { createServer } from 'http';
import { createApp } from './app.js';
import { initSocket } from './lib/socket.js';
import { serverLogger } from './lib/logger.js';

const PORT = process.env.PORT || 3000;
const app = createApp();
const httpServer = createServer(app);

initSocket(httpServer);

httpServer.listen(Number(PORT), '0.0.0.0', () => {
  serverLogger.info(`KitchenAsty server running on http://0.0.0.0:${PORT}`);
});
