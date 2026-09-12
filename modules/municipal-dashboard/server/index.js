import cors from 'cors';
import express from 'express';

const app = express();
const port = process.env.MUNICIPAL_API_PORT || 4003;
app.use(cors());
app.use(express.json());
app.get('/api/v1/health', (_req, res) => res.json({ service: 'municipal-dashboard', status: 'ok' }));
app.post('/api/v1/citizen/reports', (req, res) => res.status(201).json({ data: { id: `report_${Date.now()}`, category: req.body.category ?? 'other', status: 'received' } }));
app.get('/api/v1/dashboard/summary', (_req, res) => res.json({ data: { open: 0, inProgress: 0, resolved: 0, averageResolutionHours: 0 } }));
app.get('/api/v1/dashboard/heatmap', (_req, res) => res.json({ data: [] }));
app.post('/api/v1/workflow/route', (req, res) => res.status(202).json({ data: { reportId: req.body.reportId ?? null, status: 'queued' } }));
app.get('/api/v1/reporting/transparency', (_req, res) => res.json({ data: { reportingPeriod: 'current', totalReports: 0, resolutionRate: 0 } }));
app.listen(port, () => console.log(`Municipal Dashboard API listening on http://localhost:${port}`));
