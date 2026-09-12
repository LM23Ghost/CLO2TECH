import cors from 'cors';
import express from 'express';

const app = express();
const port = process.env.MUNICIPAL_API_PORT || 4003;
app.use(cors());
app.use(express.json());

const reports = [
	{ id: 'RPT-1042', category: 'Water leak', location: 'Mfuleni North', status: 'in_progress', priority: 'high', createdAt: 'Today, 08:42' },
	{ id: 'RPT-1041', category: 'Pothole', location: 'Voortrekker Road', status: 'received', priority: 'normal', createdAt: 'Today, 08:16' },
	{ id: 'RPT-1038', category: 'Power outage', location: 'Ward 7', status: 'resolved', priority: 'high', createdAt: 'Yesterday, 16:30' },
	{ id: 'RPT-1037', category: 'Street light', location: 'Khayelitsha Site B', status: 'in_progress', priority: 'normal', createdAt: 'Yesterday, 14:12' },
];

app.get('/api/v1/health', (_req, res) => res.json({ service: 'municipal-dashboard', status: 'ok' }));
app.get('/api/v1/citizen/reports', (_req, res) => res.json({ data: reports }));
app.post('/api/v1/citizen/reports', (req, res) => {
	const report = { id: `RPT-${1043 + reports.length}`, category: req.body.category ?? 'Other', location: req.body.location ?? 'Unspecified location', status: 'received', priority: 'normal', createdAt: 'Just now' };
	reports.unshift(report);
	res.status(201).json({ data: report });
});
app.patch('/api/v1/citizen/reports/:id/status', (req, res) => {
	const report = reports.find((item) => item.id === req.params.id);
	if (!report) return res.status(404).json({ error: 'Report not found' });
	report.status = req.body.status ?? report.status;
	res.json({ data: report });
});
app.get('/api/v1/dashboard/summary', (_req, res) => res.json({ data: { open: reports.filter((item) => item.status !== 'resolved').length, inProgress: reports.filter((item) => item.status === 'in_progress').length, resolved: reports.filter((item) => item.status === 'resolved').length, averageResolutionHours: 18.4 } }));
app.get('/api/v1/dashboard/heatmap', (_req, res) => res.json({ data: reports.filter((item) => item.status !== 'resolved').map((item, index) => ({ id: item.id, x: 18 + index * 17, y: 28 + (index % 3) * 19, category: item.category })) }));
app.post('/api/v1/workflow/route', (req, res) => res.status(202).json({ data: { reportId: req.body.reportId ?? null, department: req.body.department ?? 'Operations', status: 'queued' } }));
app.get('/api/v1/reporting/transparency', (_req, res) => res.json({ data: { reportingPeriod: 'current', totalReports: reports.length, resolutionRate: Math.round((reports.filter((item) => item.status === 'resolved').length / reports.length) * 100) } }));
app.listen(port, () => console.log(`Municipal Dashboard API listening on http://localhost:${port}`));
