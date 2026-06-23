import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = process.env.PORT || 80;

let appProcess = spawn('node', [path.join(__dirname, 'app.js')], {
  stdio: ['inherit', 'pipe', 'pipe']
});

let logBuffer = '';

appProcess.stdout.on('data', (data) => {
  const str = data.toString();
  console.log(str);
  logBuffer += str;
});

appProcess.stderr.on('data', (data) => {
  const str = data.toString();
  console.error(str);
  logBuffer += str;
});

appProcess.on('close', (code) => {
  console.log(`[Wrapper] App crashed with code ${code}. Starting diagnostic server on port ${port}...`);
  
  // Start a fallback server to display the crash logs
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`App Crashed!\n\nExit Code: ${code}\n\n--- CRASH LOGS ---\n\n${logBuffer}`);
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`[Wrapper] Diagnostic server listening on port ${port}`);
  });
});
