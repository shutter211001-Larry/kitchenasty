import express from 'express';
import cors from 'cors';
import request from 'supertest';

const app = express();
app.use(cors({
  origin: (origin, callback) => callback(null, false) // Deny
}));
app.get('/', (req, res) => res.json({ ok: true }));

request(app)
  .options('/')
  .set('Origin', 'http://hacker.com')
  .set('Access-Control-Request-Method', 'GET')
  .end((err, res) => {
    console.log(`Status: ${res.status}`);
    console.log(`Headers: ${JSON.stringify(res.headers)}`);
  });
