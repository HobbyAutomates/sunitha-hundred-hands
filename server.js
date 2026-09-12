import express from 'express';
import fs from 'fs'; import path from 'path'; import crypto from 'crypto';
const app = express(); app.use(express.json({ limit: '1mb' }));
const DATA = process.env.DATA_DIR || '/data'; fs.mkdirSync(DATA, { recursive: true });
const ADMIN = process.env.ADMIN_KEY || crypto.randomBytes(8).toString('hex');
app.use(express.static('public', { extensions: ['html'] }));
app.post('/api/submit', (req, res) => {
  const b = req.body; if (!b || typeof b !== 'object' || !b.answers) return res.status(400).json({ error: 'bad payload' });
  const safe = String(b.name || 'anon').replace(/[^a-z0-9]+/gi, '-').slice(0, 40);
  const f = `${new Date().toISOString().replace(/[:.]/g, '-')}-${safe}.json`;
  fs.writeFileSync(path.join(DATA, f), JSON.stringify(b, null, 2)); res.json({ ok: true, file: f });
});
app.get('/api/list', (req, res) => {
  if (req.query.key !== ADMIN) return res.status(401).json({ error: 'unauthorized' });
  const items = fs.readdirSync(DATA).filter(f => f.endsWith('.json')).sort().map(f => ({ file: f, data: JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')) }));
  res.json(items);
});
app.get('/api/export', (req, res) => {
  if (req.query.key !== ADMIN) return res.status(401).send('unauthorized');
  const files = fs.readdirSync(DATA).filter(f => f.endsWith('.json')).sort();
  const out = files.map(f => { const d = JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
    return `## ${d.name || 'anon'} (${d.role || ''}) — ${d.submittedAt}\n` + Object.entries(d.answers || {}).map(([k, a]) => `${k.slice(1)}. ${a.question}\n   ${Array.isArray(a.answer) ? a.answer.join(', ') : a.answer}`).join('\n'); }).join('\n\n');
  res.type('text/plain').send(out || 'no responses yet');
});
app.listen(process.env.PORT || 3000, () => console.log('svam brief up; admin key', ADMIN));
