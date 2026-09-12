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
	{ id: 'RPT-1042', area: 'mfuleni', street: 'Mfuleni North', category: 'Water leak', location: 'Mfuleni North', latitude: -33.997, longitude: 18.684, status: 'in_progress', priority: 'high', createdAt: 'Today, 08:42', photos: [] },
	{ id: 'RPT-1041', area: 'bellville-south', street: 'Voortrekker Road', category: 'Pothole', location: 'Bellville South', latitude: -33.912, longitude: 18.631, status: 'received', priority: 'normal', createdAt: 'Today, 08:16', photos: [] },
	{ id: 'RPT-1038', area: 'khayelitsha', street: 'Mew Way', category: 'Power outage', location: 'Ward 7', latitude: -34.041, longitude: 18.674, status: 'resolved', resolvedHours: 12.5, priority: 'high', createdAt: 'Yesterday, 16:30', photos: [] },
	{ id: 'RPT-1037', area: 'khayelitsha', street: 'Walter Sisulu Drive', category: 'Street light', location: 'Site B', latitude: -34.035, longitude: 18.667, status: 'in_progress', priority: 'normal', createdAt: 'Yesterday, 14:12', photos: [] },
	{ id: 'RPT-1036', area: 'delft', street: 'The Hague Avenue', category: 'Water leak', location: 'The Hague', latitude: -33.981, longitude: 18.644, status: 'received', priority: 'high', createdAt: 'Yesterday, 13:25', photos: [] },
	{ id: 'RPT-1035', area: 'mitchells-plain', street: 'AZ Berman Drive', category: 'Pothole', location: 'Mitchells Plain', latitude: -34.052, longitude: 18.605, status: 'resolved', resolvedHours: 24, priority: 'normal', createdAt: 'Yesterday, 11:10', photos: [] },
	{ id: 'RPT-1034', area: 'sandton', street: 'Rivonia Road', category: 'Pothole', location: 'Sandton', latitude: -26.107, longitude: 28.056, status: 'in_progress', priority: 'normal', createdAt: 'Today, 07:52', photos: [] },
	{ id: 'RPT-1033', area: 'parkhurst', street: 'Sixth Street', category: 'Street light', location: 'Parkhurst', latitude: -26.124, longitude: 28.013, status: 'received', priority: 'normal', createdAt: 'Yesterday, 17:45', photos: [] },
	{ id: 'RPT-1032', area: 'sandton', street: 'Grayston Drive', category: 'Water leak', location: 'Sandton Central', latitude: -26.107, longitude: 28.062, status: 'resolved', resolvedHours: 8, priority: 'high', createdAt: 'Yesterday, 12:20', photos: [] },
];

const areas = [
	{ id: 'all', name: 'All service areas', level: 'overview', parentId: null, subtitle: 'Municipal overview', latitude: -29.5, longitude: 24.5, zoom: 5 },
	{ id: 'western-cape', name: 'Western Cape', level: 'province', parentId: 'all', subtitle: 'Province overview', latitude: -33.9, longitude: 18.6, zoom: 9 },
	{ id: 'cape-town', name: 'Cape Town', level: 'municipality', parentId: 'western-cape', subtitle: 'City of Cape Town', latitude: -33.93, longitude: 18.62, zoom: 10 },
	{ id: 'khayelitsha', name: 'Khayelitsha', level: 'neighbourhood', parentId: 'cape-town', subtitle: 'Wards 10-11', latitude: -34.038, longitude: 18.67, zoom: 13 },
	{ id: 'mfuleni', name: 'Mfuleni', level: 'neighbourhood', parentId: 'cape-town', subtitle: 'Wards 5-6', latitude: -33.999, longitude: 18.684, zoom: 13 },
	{ id: 'delft', name: 'Delft', level: 'neighbourhood', parentId: 'cape-town', subtitle: 'Wards 12-13', latitude: -33.978, longitude: 18.642, zoom: 13 },
	{ id: 'bellville-south', name: 'Bellville South', level: 'neighbourhood', parentId: 'cape-town', subtitle: 'Ward 23', latitude: -33.916, longitude: 18.63, zoom: 13 },
	{ id: 'mitchells-plain', name: 'Mitchells Plain', level: 'neighbourhood', parentId: 'cape-town', subtitle: 'Wards 80-82', latitude: -34.052, longitude: 18.606, zoom: 13 },
	{ id: 'gauteng', name: 'Gauteng', level: 'province', parentId: 'all', subtitle: 'Province overview', latitude: -26.27, longitude: 28.1, zoom: 8 },
	{ id: 'johannesburg', name: 'Johannesburg', level: 'municipality', parentId: 'gauteng', subtitle: 'City of Johannesburg', latitude: -26.204, longitude: 28.047, zoom: 10 },
	{ id: 'sandton', name: 'Sandton', level: 'neighbourhood', parentId: 'johannesburg', subtitle: 'Region E', latitude: -26.107, longitude: 28.056, zoom: 13 },
	{ id: 'parkhurst', name: 'Parkhurst', level: 'neighbourhood', parentId: 'johannesburg', subtitle: 'Region E', latitude: -26.124, longitude: 28.013, zoom: 14 },
	{ id: 'pretoria', name: 'Pretoria', level: 'municipality', parentId: 'gauteng', subtitle: 'City of Tshwane', latitude: -25.747, longitude: 28.229, zoom: 10 },
	{ id: 'centurion', name: 'Centurion', level: 'neighbourhood', parentId: 'pretoria', subtitle: 'Region 4', latitude: -25.86, longitude: 28.19, zoom: 13 },
];

const childAreaIds = (areaId) => areas.filter((area) => area.parentId === areaId).flatMap((area) => [area.id, ...childAreaIds(area.id)]);
const reportsForArea = (area) => area && area !== 'all' ? reports.filter((report) => [area, ...childAreaIds(area)].includes(report.area)) : reports;

app.get('/api/v1/health', (_req, res) => res.json({ service: 'municipal-dashboard', status: 'ok' }));
app.get('/api/v1/areas', (_req, res) => res.json({ data: areas }));
app.get('/api/v1/citizen/reports', (req, res) => res.json({ data: reportsForArea(req.query.area) }));
app.post('/api/v1/citizen/reports', upload.array('photos', 3), (req, res) => {
	const area = areas.find((item) => item.id === req.body.area) ?? areas[1];
	const report = { id: `RPT-${1043 + reports.length}`, area: area.id, street: req.body.street ?? 'Unspecified street', category: req.body.category ?? 'Other', location: req.body.location ?? area.name, latitude: area.latitude, longitude: area.longitude, status: 'received', resolvedHours: null, priority: 'normal', createdAt: 'Just now', photos: (req.files ?? []).map((file) => ({ name: file.originalname, size: file.size, type: file.mimetype, path: `/uploads/${file.filename}` })) };
	reports.unshift(report);
	res.status(201).json({ data: report });
});
app.patch('/api/v1/citizen/reports/:id/status', (req, res) => {
	const report = reports.find((item) => item.id === req.params.id);
	if (!report) return res.status(404).json({ error: 'Report not found' });
	report.status = req.body.status ?? report.status;
	if (report.status === 'resolved' && !report.resolvedHours) report.resolvedHours = Number(req.body.resolvedHours) || 18.4;
	res.json({ data: report });
});
app.get('/api/v1/dashboard/summary', (req, res) => {
	const scopedReports = reportsForArea(req.query.area);
	const resolvedReports = scopedReports.filter((item) => item.status === 'resolved' && item.resolvedHours);
	const averageResolutionHours = resolvedReports.length ? Math.round((resolvedReports.reduce((total, item) => total + item.resolvedHours, 0) / resolvedReports.length) * 10) / 10 : 0;
	res.json({ data: { open: scopedReports.filter((item) => item.status !== 'resolved').length, inProgress: scopedReports.filter((item) => item.status === 'in_progress').length, resolved: scopedReports.filter((item) => item.status === 'resolved').length, averageResolutionHours } });
});
app.get('/api/v1/dashboard/heatmap', (req, res) => res.json({ data: reportsForArea(req.query.area).filter((item) => item.status !== 'resolved').map((item) => ({ id: item.id, latitude: item.latitude, longitude: item.longitude, category: item.category, street: item.street })) }));
app.post('/api/v1/workflow/route', (req, res) => res.status(202).json({ data: { reportId: req.body.reportId ?? null, department: req.body.department ?? 'Operations', status: 'queued' } }));
app.get('/api/v1/reporting/transparency', (req, res) => { const scopedReports = reportsForArea(req.query.area); res.json({ data: { reportingPeriod: 'current', totalReports: scopedReports.length, resolutionRate: scopedReports.length ? Math.round((scopedReports.filter((item) => item.status === 'resolved').length / scopedReports.length) * 100) : 0 } }); });
app.use('/uploads', express.static(uploadDirectory));
app.use((error, _req, res, next) => { if (error instanceof multer.MulterError) return res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Each image must be 5MB or smaller.' : 'You can upload a maximum of 3 images.' }); if (error) return res.status(400).json({ error: 'Only image files are accepted.' }); next(error); });
app.listen(port, () => console.log(`Municipal Dashboard API listening on http://localhost:${port}`));
