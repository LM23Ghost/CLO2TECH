import cors from 'cors';
import express from 'express';

const app = express();
const port = process.env.SME_API_PORT || 4001;
app.use(cors());
app.use(express.json());

app.get('/api/v1/health', (_req, res) => res.json({ service: 'sme-hub', status: 'ok' }));
app.post('/api/v1/auth/signup', (req, res) => res.status(201).json({ data: { message: 'Signup queued', email: req.body.email ?? null } }));
app.get('/api/v1/billing/subscriptions', (_req, res) => res.json({ data: [] }));
app.post('/api/v1/billing/checkout', (req, res) => res.status(201).json({ data: { plan: req.body.plan ?? 'monthly', status: 'pending' } }));
app.get('/api/v1/support/tickets', (_req, res) => res.json({ data: [] }));
app.post('/api/v1/support/tickets', (req, res) => res.status(201).json({ data: { id: `ticket_${Date.now()}`, title: req.body.title ?? 'Untitled ticket', status: 'open' } }));
app.get('/api/v1/onboarding/status', (_req, res) => res.json({ data: { microsoft365: 'not_started', backup: 'not_started' } }));
app.post('/api/v1/onboarding/start', (_req, res) => res.status(202).json({ data: { status: 'queued' } }));

app.listen(port, () => console.log(`SME Hub API listening on http://localhost:${port}`));
