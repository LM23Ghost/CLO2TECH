import cors from 'cors';
import express from 'express';

const app = express();
const port = process.env.SCHOOL_API_PORT || 4002;
app.use(cors());
app.use(express.json());
app.get('/api/v1/health', (_req, res) => res.json({ service: 'school-platform', status: 'ok' }));
app.get('/api/v1/inventory/devices', (_req, res) => res.json({ data: [] }));
app.post('/api/v1/inventory/devices', (req, res) => res.status(201).json({ data: { id: `device_${Date.now()}`, label: req.body.label ?? null, condition: req.body.condition ?? 'received' } }));
app.get('/api/v1/edu365/tenants', (_req, res) => res.json({ data: [] }));
app.post('/api/v1/edu365/setup', (_req, res) => res.status(202).json({ data: { status: 'queued' } }));
app.get('/api/v1/device-management/policies', (_req, res) => res.json({ data: [] }));
app.post('/api/v1/device-management/sync', (_req, res) => res.status(202).json({ data: { status: 'queued' } }));
app.get('/api/v1/training/modules', (_req, res) => res.json({ data: [] }));
app.listen(port, () => console.log(`School Platform API listening on http://localhost:${port}`));
