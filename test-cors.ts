import express from 'express';
import cors from 'cors';
import request from 'supertest';

const app = express();
app.use(cors({
  origin: (origin, callback) => callback(null, false)
}));
app.get('/', (req, res) => res.json({ ok: true }));

request(app)
  .get('/')
  .set('Origin', 'http://hacker.com')
  .end((err, res) => {
    console.log(`Status: ${res.status}`);
    console.log(`Headers: ${JSON.stringify(res.headers)}`);
  });
