import cors from 'cors';
import express from 'express';

const app = express();
const port = process.env.MUNICIPAL_API_PORT || 4003;
app.use(cors());
app.use(express.json());

const reports = [
	{ id: 'RPT-1042', area: 'Mfuleni', category: 'Water leak', location: 'Mfuleni North', status: 'in_progress', priority: 'high', createdAt: 'Today, 08:42' },
	{ id: 'RPT-1041', area: 'Bellville South', category: 'Pothole', location: 'Voortrekker Road', status: 'received', priority: 'normal', createdAt: 'Today, 08:16' },
	{ id: 'RPT-1038', area: 'Khayelitsha', category: 'Power outage', location: 'Ward 7', status: 'resolved', priority: 'high', createdAt: 'Yesterday, 16:30' },
	{ id: 'RPT-1037', area: 'Khayelitsha', category: 'Street light', location: 'Site B', status: 'in_progress', priority: 'normal', createdAt: 'Yesterday, 14:12' },
	{ id: 'RPT-1036', area: 'Delft', category: 'Water leak', location: 'The Hague Avenue', status: 'received', priority: 'high', createdAt: 'Yesterday, 13:25' },
	{ id: 'RPT-1035', area: 'Mitchells Plain', category: 'Pothole', location: 'AZ Berman Drive', status: 'resolved', priority: 'normal', createdAt: 'Yesterday, 11:10' },
];

const areas = [
	{ id: 'all', name: 'All service areas', subtitle: 'Municipal overview' },
	{ id: 'Khayelitsha', name: 'Khayelitsha', subtitle: 'Wards 10-11' },
	{ id: 'Mfuleni', name: 'Mfuleni', subtitle: 'Wards 5-6' },
	{ id: 'Delft', name: 'Delft', subtitle: 'Wards 12-13' },
	{ id: 'Bellville South', name: 'Bellville South', subtitle: 'Ward 23' },
	{ id: 'Mitchells Plain', name: 'Mitchells Plain', subtitle: 'Wards 80-82' },
];

const reportsForArea = (area) => area && area !== 'all' ? reports.filter((report) => report.area === area) : reports;

app.get('/api/v1/health', (_req, res) => res.json({ service: 'municipal-dashboard', status: 'ok' }));
app.get('/api/v1/areas', (_req, res) => res.json({ data: areas }));
app.get('/api/v1/citizen/reports', (req, res) => res.json({ data: reportsForArea(req.query.area) }));
app.post('/api/v1/citizen/reports', (req, res) => {
	const report = { id: `RPT-${1043 + reports.length}`, area: req.body.area ?? 'Khayelitsha', category: req.body.category ?? 'Other', location: req.body.location ?? 'Unspecified location', status: 'received', priority: 'normal', createdAt: 'Just now' };
	reports.unshift(report);
	res.status(201).json({ data: report });
});
app.patch('/api/v1/citizen/reports/:id/status', (req, res) => {
	const report = reports.find((item) => item.id === req.params.id);
	if (!report) return res.status(404).json({ error: 'Report not found' });
	report.status = req.body.status ?? report.status;
	res.json({ data: report });
});
app.get('/api/v1/dashboard/summary', (req, res) => {
	const scopedReports = reportsForArea(req.query.area);
	res.json({ data: { open: scopedReports.filter((item) => item.status !== 'resolved').length, inProgress: scopedReports.filter((item) => item.status === 'in_progress').length, resolved: scopedReports.filter((item) => item.status === 'resolved').length, averageResolutionHours: scopedReports.length ? 18.4 : 0 } });
});
app.get('/api/v1/dashboard/heatmap', (req, res) => res.json({ data: reportsForArea(req.query.area).filter((item) => item.status !== 'resolved').map((item, index) => ({ id: item.id, x: 18 + index * 17, y: 28 + (index % 3) * 19, category: item.category })) }));
app.post('/api/v1/workflow/route', (req, res) => res.status(202).json({ data: { reportId: req.body.reportId ?? null, department: req.body.department ?? 'Operations', status: 'queued' } }));
app.get('/api/v1/reporting/transparency', (req, res) => { const scopedReports = reportsForArea(req.query.area); res.json({ data: { reportingPeriod: 'current', totalReports: scopedReports.length, resolutionRate: scopedReports.length ? Math.round((scopedReports.filter((item) => item.status === 'resolved').length / scopedReports.length) * 100) : 0 } }); });
app.listen(port, () => console.log(`Municipal Dashboard API listening on http://localhost:${port}`));
