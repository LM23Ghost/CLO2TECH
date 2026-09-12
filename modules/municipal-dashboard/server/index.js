import cors from 'cors';
import express from 'express';
import fs from 'node:fs';
import multer from 'multer';
import path from 'node:path';

const app = express();
const port = process.env.MUNICIPAL_API_PORT || 4003;
app.use(cors());
app.use(express.json());

const uploadDirectory = path.join(process.cwd(), 'server', 'uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });
const upload = multer({
	dest: uploadDirectory,
	limits: { files: 3, fileSize: 5 * 1024 * 1024 },
	fileFilter: (_req, file, callback) => callback(null, file.mimetype.startsWith('image/')),
});

const reports = [
	{ id: 'RPT-1042', area: 'Mfuleni', street: 'Mfuleni North', category: 'Water leak', location: 'Mfuleni North', latitude: -33.997, longitude: 18.684, status: 'in_progress', priority: 'high', createdAt: 'Today, 08:42', photos: [] },
	{ id: 'RPT-1041', area: 'Bellville South', street: 'Voortrekker Road', category: 'Pothole', location: 'Bellville South', latitude: -33.912, longitude: 18.631, status: 'received', priority: 'normal', createdAt: 'Today, 08:16', photos: [] },
	{ id: 'RPT-1038', area: 'Khayelitsha', street: 'Mew Way', category: 'Power outage', location: 'Ward 7', latitude: -34.041, longitude: 18.674, status: 'resolved', priority: 'high', createdAt: 'Yesterday, 16:30', photos: [] },
	{ id: 'RPT-1037', area: 'Khayelitsha', street: 'Walter Sisulu Drive', category: 'Street light', location: 'Site B', latitude: -34.035, longitude: 18.667, status: 'in_progress', priority: 'normal', createdAt: 'Yesterday, 14:12', photos: [] },
	{ id: 'RPT-1036', area: 'Delft', street: 'The Hague Avenue', category: 'Water leak', location: 'The Hague', latitude: -33.981, longitude: 18.644, status: 'received', priority: 'high', createdAt: 'Yesterday, 13:25', photos: [] },
	{ id: 'RPT-1035', area: 'Mitchells Plain', street: 'AZ Berman Drive', category: 'Pothole', location: 'Mitchells Plain', latitude: -34.052, longitude: 18.605, status: 'resolved', priority: 'normal', createdAt: 'Yesterday, 11:10', photos: [] },
];

const areas = [
	{ id: 'all', name: 'All service areas', subtitle: 'Municipal overview', latitude: -34.0, longitude: 18.65, zoom: 11 },
	{ id: 'Khayelitsha', name: 'Khayelitsha', subtitle: 'Wards 10-11', latitude: -34.038, longitude: 18.67, zoom: 13 },
	{ id: 'Mfuleni', name: 'Mfuleni', subtitle: 'Wards 5-6', latitude: -33.999, longitude: 18.684, zoom: 13 },
	{ id: 'Delft', name: 'Delft', subtitle: 'Wards 12-13', latitude: -33.978, longitude: 18.642, zoom: 13 },
	{ id: 'Bellville South', name: 'Bellville South', subtitle: 'Ward 23', latitude: -33.916, longitude: 18.63, zoom: 13 },
	{ id: 'Mitchells Plain', name: 'Mitchells Plain', subtitle: 'Wards 80-82', latitude: -34.052, longitude: 18.606, zoom: 13 },
];

const reportsForArea = (area) => area && area !== 'all' ? reports.filter((report) => report.area === area) : reports;

app.get('/api/v1/health', (_req, res) => res.json({ service: 'municipal-dashboard', status: 'ok' }));
app.get('/api/v1/areas', (_req, res) => res.json({ data: areas }));
app.get('/api/v1/citizen/reports', (req, res) => res.json({ data: reportsForArea(req.query.area) }));
app.post('/api/v1/citizen/reports', upload.array('photos', 3), (req, res) => {
	const area = areas.find((item) => item.id === req.body.area) ?? areas[1];
	const report = { id: `RPT-${1043 + reports.length}`, area: area.id, street: req.body.street ?? 'Unspecified street', category: req.body.category ?? 'Other', location: req.body.location ?? area.name, latitude: area.latitude, longitude: area.longitude, status: 'received', priority: 'normal', createdAt: 'Just now', photos: (req.files ?? []).map((file) => ({ name: file.originalname, size: file.size, type: file.mimetype, path: `/uploads/${file.filename}` })) };
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
app.get('/api/v1/dashboard/heatmap', (req, res) => res.json({ data: reportsForArea(req.query.area).filter((item) => item.status !== 'resolved').map((item) => ({ id: item.id, latitude: item.latitude, longitude: item.longitude, category: item.category, street: item.street })) }));
app.post('/api/v1/workflow/route', (req, res) => res.status(202).json({ data: { reportId: req.body.reportId ?? null, department: req.body.department ?? 'Operations', status: 'queued' } }));
app.get('/api/v1/reporting/transparency', (req, res) => { const scopedReports = reportsForArea(req.query.area); res.json({ data: { reportingPeriod: 'current', totalReports: scopedReports.length, resolutionRate: scopedReports.length ? Math.round((scopedReports.filter((item) => item.status === 'resolved').length / scopedReports.length) * 100) : 0 } }); });
app.use('/uploads', express.static(uploadDirectory));
app.use((error, _req, res, next) => { if (error instanceof multer.MulterError) return res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Each image must be 5MB or smaller.' : 'You can upload a maximum of 3 images.' }); if (error) return res.status(400).json({ error: 'Only image files are accepted.' }); next(error); });
app.listen(port, () => console.log(`Municipal Dashboard API listening on http://localhost:${port}`));
