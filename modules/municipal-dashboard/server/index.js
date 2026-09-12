import cors from 'cors';
import crypto from 'node:crypto';
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
	{ id: 'RPT-1042', area: 'mfuleni', street: 'Mfuleni North', category: 'Water leak', location: 'Mfuleni North', latitude: -33.997, longitude: 18.684, status: 'in_progress', priority: 'high', loggedAt: new Date(Date.now() - 2.4 * 3600000).toISOString(), photos: [] },
	{ id: 'RPT-1041', area: 'bellville-south', street: 'Voortrekker Road', category: 'Pothole', location: 'Bellville South', latitude: -33.912, longitude: 18.631, status: 'received', priority: 'normal', loggedAt: new Date(Date.now() - 4.1 * 3600000).toISOString(), photos: [] },
	{ id: 'RPT-1038', area: 'khayelitsha', street: 'Mew Way', category: 'Electricity outage', location: 'Ward 7', latitude: -34.041, longitude: 18.674, status: 'resolved', resolvedHours: 12.5, reason: 'Planned substation maintenance', loggedAt: new Date(Date.now() - 29 * 3600000).toISOString(), updates: [{ message: 'Power restored after planned substation maintenance.', createdAt: new Date(Date.now() - 16.5 * 3600000).toISOString() }], photos: [] },
	{ id: 'RPT-1037', area: 'khayelitsha', street: 'Walter Sisulu Drive', category: 'Street light', location: 'Site B', latitude: -34.035, longitude: 18.667, status: 'in_progress', priority: 'normal', loggedAt: new Date(Date.now() - 20 * 3600000).toISOString(), updates: [], photos: [] },
	{ id: 'RPT-1036', area: 'delft', street: 'The Hague Avenue', category: 'Water leak', location: 'The Hague', latitude: -33.981, longitude: 18.644, status: 'received', priority: 'high', loggedAt: new Date(Date.now() - 23 * 3600000).toISOString(), photos: [] },
	{ id: 'RPT-1035', area: 'mitchells-plain', street: 'AZ Berman Drive', category: 'Pothole', location: 'Mitchells Plain', latitude: -34.052, longitude: 18.605, status: 'resolved', resolvedHours: 24, priority: 'normal', loggedAt: new Date(Date.now() - 51 * 3600000).toISOString(), photos: [] },
	{ id: 'RPT-1034', area: 'sandton', street: 'Rivonia Road', category: 'Electricity outage', location: 'Sandton', latitude: -26.107, longitude: 28.056, status: 'in_progress', priority: 'high', reason: 'Unplanned network fault under investigation', loggedAt: new Date(Date.now() - 7.2 * 3600000).toISOString(), updates: [{ message: 'A field crew has been dispatched to investigate the feeder fault.', createdAt: new Date(Date.now() - 1.2 * 3600000).toISOString() }], photos: [] },
	{ id: 'RPT-1033', area: 'parkhurst', street: 'Sixth Street', category: 'Street light', location: 'Parkhurst', latitude: -26.124, longitude: 28.013, status: 'received', priority: 'normal', loggedAt: new Date(Date.now() - 15 * 3600000).toISOString(), photos: [] },
	{ id: 'RPT-1032', area: 'sandton', street: 'Grayston Drive', category: 'Water leak', location: 'Sandton Central', latitude: -26.107, longitude: 28.062, status: 'resolved', resolvedHours: 8, priority: 'high', loggedAt: new Date(Date.now() - 33 * 3600000).toISOString(), updates: [], photos: [] },
];

const users = [];
const sessions = new Map();
const municipalitySessions = new Map();
const notificationBroadcasts = [];

const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => ({ salt, hash: crypto.scryptSync(password, salt, 64).toString('hex') });
const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, phone: user.phone, preferredArea: user.preferredArea });
const getUser = (req) => sessions.get(req.headers.authorization?.replace('Bearer ', ''));
const requireUser = (req, res, next) => { const user = getUser(req); if (!user) return res.status(401).json({ error: 'Please sign in to continue.' }); req.user = user; next(); };
const municipalityEmail = process.env.MUNICIPALITY_WORK_EMAIL || 'municipality@cloud2tech.local';
const municipalityPassword = process.env.MUNICIPALITY_WORK_PASSWORD || 'demo-municipality';
const configuredMunicipalityAreas = (process.env.MUNICIPALITY_WORK_AREAS || 'gauteng').split(',').map((area) => area.trim()).filter(Boolean);
const requireMunicipality = (req, res, next) => { const session = municipalitySessions.get(req.headers.authorization?.replace('Bearer ', '')); if (!session) return res.status(401).json({ error: 'Municipality work-account access is required.' }); req.municipality = session; next(); };

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
app.get('/api/v1/municipality/auth/options', (_req, res) => res.json({ data: { areas: areas.filter((area) => configuredMunicipalityAreas.includes(area.id)) } }));
app.post('/api/v1/auth/signup', (req, res) => {
	const { name, email, password, phone, preferredArea = 'all' } = req.body;
	if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required.' });
	if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
	if (users.some((user) => user.email.toLowerCase() === email.toLowerCase())) return res.status(409).json({ error: 'An account with this email already exists.' });
	const credentials = hashPassword(password);
	const user = { id: `usr_${Date.now()}`, name, email: email.toLowerCase(), phone: phone ?? '', preferredArea: areas.some((area) => area.id === preferredArea) ? preferredArea : 'all', ...credentials };
	users.push(user);
	const token = crypto.randomUUID();
	sessions.set(token, user);
	res.status(201).json({ data: { token, user: publicUser(user) } });
});
app.post('/api/v1/auth/login', (req, res) => {
	const user = users.find((item) => item.email === req.body.email?.toLowerCase());
	if (!user || hashPassword(req.body.password ?? '', user.salt).hash !== user.hash) return res.status(401).json({ error: 'Email or password is incorrect.' });
	const token = crypto.randomUUID();
	sessions.set(token, user);
	res.json({ data: { token, user: publicUser(user) } });
});
app.post('/api/v1/municipality/auth/login', (req, res) => {
	if (req.body.email?.toLowerCase() !== municipalityEmail.toLowerCase() || req.body.password !== municipalityPassword) return res.status(401).json({ error: 'Municipality work email or password is incorrect.' });
	if (!configuredMunicipalityAreas.includes(req.body.area)) return res.status(403).json({ error: 'That work account is not assigned to this service area.' });
	const token = crypto.randomUUID();
	municipalitySessions.set(token, { email: municipalityEmail, role: 'municipality', areaId: req.body.area });
	res.json({ data: { token, user: { email: municipalityEmail, role: 'municipality', areaId: req.body.area } } });
});
app.get('/api/v1/auth/me', requireUser, (req, res) => res.json({ data: publicUser(req.user) }));
app.patch('/api/v1/auth/profile', requireUser, (req, res) => {
	if (req.body.preferredArea && areas.some((area) => area.id === req.body.preferredArea)) req.user.preferredArea = req.body.preferredArea;
	if (typeof req.body.name === 'string' && req.body.name.trim()) req.user.name = req.body.name.trim();
	if (typeof req.body.phone === 'string') req.user.phone = req.body.phone.trim();
	res.json({ data: publicUser(req.user) });
});
app.get('/api/v1/citizen/reports', (req, res) => res.json({ data: reportsForArea(req.query.area) }));
app.post('/api/v1/citizen/reports', upload.array('photos', 3), (req, res) => {
	const area = areas.find((item) => item.id === req.body.area) ?? areas[1];
	const report = { id: `RPT-${1043 + reports.length}`, area: area.id, street: req.body.street ?? 'Unspecified street', category: req.body.category ?? 'Other', location: req.body.location ?? area.name, latitude: area.latitude, longitude: area.longitude, status: 'received', resolvedHours: null, reason: '', priority: 'normal', loggedAt: new Date().toISOString(), updates: [], photos: (req.files ?? []).map((file) => ({ name: file.originalname, size: file.size, type: file.mimetype, path: `/uploads/${file.filename}` })) };
	reports.unshift(report);
	res.status(201).json({ data: report });
});
app.patch('/api/v1/citizen/reports/:id/status', (req, res) => {
	const report = reports.find((item) => item.id === req.params.id);
	if (!report) return res.status(404).json({ error: 'Report not found' });
	report.status = req.body.status ?? report.status;
	if (typeof req.body.reason === 'string') report.reason = req.body.reason.trim();
	if (report.status === 'resolved' && !report.resolvedHours) report.resolvedHours = Number(req.body.resolvedHours) || 18.4;
	if (typeof req.body.message === 'string' && req.body.message.trim()) report.updates = [{ message: req.body.message.trim(), createdAt: new Date().toISOString() }, ...(report.updates ?? [])];
	res.json({ data: report });
});
app.post('/api/v1/municipality/reports/:id/updates', requireMunicipality, (req, res) => {
	const report = reports.find((item) => item.id === req.params.id);
	if (!report || !reportsForArea(req.municipality.areaId).includes(report)) return res.status(404).json({ error: 'Report not found in your jurisdiction.' });
	if (!req.body.message?.trim()) return res.status(400).json({ error: 'An update message is required.' });
	if (req.body.reason !== undefined) report.reason = String(req.body.reason).trim();
	if (req.body.status) report.status = req.body.status;
	if (report.status === 'resolved' && !report.resolvedHours) report.resolvedHours = Number(req.body.resolvedHours) || 18.4;
	const update = { message: req.body.message.trim(), createdAt: new Date().toISOString() };
	report.updates = [update, ...(report.updates ?? [])];
	res.status(201).json({ data: { report, update } });
});
app.get('/api/v1/dashboard/summary', (req, res) => {
	const scopedReports = reportsForArea(req.query.area);
	const resolvedReports = scopedReports.filter((item) => item.status === 'resolved' && item.resolvedHours);
	const averageResolutionHours = resolvedReports.length ? Math.round((resolvedReports.reduce((total, item) => total + item.resolvedHours, 0) / resolvedReports.length) * 10) / 10 : 0;
	res.json({ data: { open: scopedReports.filter((item) => item.status !== 'resolved').length, inProgress: scopedReports.filter((item) => item.status === 'in_progress').length, resolved: scopedReports.filter((item) => item.status === 'resolved').length, averageResolutionHours } });
});
app.get('/api/v1/dashboard/heatmap', (req, res) => res.json({ data: reportsForArea(req.query.area).filter((item) => item.status !== 'resolved').map((item) => ({ id: item.id, latitude: item.latitude, longitude: item.longitude, category: item.category, street: item.street })) }));
app.get('/api/v1/municipality/research', requireMunicipality, (_req, res) => {
	const scopedReports = reportsForArea(_req.municipality.areaId);
	const scopeAreaIds = [_req.municipality.areaId, ...childAreaIds(_req.municipality.areaId)];
	const scopedUsers = users.filter((user) => scopeAreaIds.includes(user.preferredArea));
	const byArea = areas.filter((area) => (area.level === 'province' || area.level === 'municipality') && reportsForArea(area.id).some((report) => scopedReports.includes(report))).map((area) => ({ name: area.name, level: area.level, reports: reportsForArea(area.id).filter((report) => scopedReports.includes(report)).length, open: reportsForArea(area.id).filter((report) => scopedReports.includes(report) && report.status !== 'resolved').length }));
	const byCategory = [...new Set(scopedReports.map((report) => report.category))].map((category) => ({ category, count: scopedReports.filter((report) => report.category === category).length, resolved: scopedReports.filter((report) => report.category === category && report.status === 'resolved').length }));
	res.json({ data: { generatedAt: new Date().toISOString(), scope: _req.municipality.areaId, totalReports: scopedReports.length, openReports: scopedReports.filter((report) => report.status !== 'resolved').length, resolvedReports: scopedReports.filter((report) => report.status === 'resolved').length, registeredUsers: scopedUsers.length, notificationBroadcasts: notificationBroadcasts.filter((broadcast) => broadcast.areaId === _req.municipality.areaId).length, byArea, byCategory, reports: scopedReports.map((report) => ({ ...report, areaName: areas.find((area) => area.id === report.area)?.name ?? report.area })) } });
});
app.post('/api/v1/municipality/notifications/broadcast', requireMunicipality, (req, res) => {
	if (!req.body.subject || !req.body.message) return res.status(400).json({ error: 'Subject and message are required.' });
	const scopeAreaIds = [req.municipality.areaId, ...childAreaIds(req.municipality.areaId)];
	const recipientCount = users.filter((user) => scopeAreaIds.includes(user.preferredArea)).length;
	const broadcast = { id: `broadcast_${Date.now()}`, areaId: req.municipality.areaId, subject: req.body.subject, message: req.body.message, recipientCount, status: 'queued', createdAt: new Date().toISOString() };
	notificationBroadcasts.unshift(broadcast);
	res.status(202).json({ data: broadcast });
});
app.post('/api/v1/workflow/route', (req, res) => res.status(202).json({ data: { reportId: req.body.reportId ?? null, department: req.body.department ?? 'Operations', status: 'queued' } }));
app.get('/api/v1/reporting/transparency', (req, res) => { const scopedReports = reportsForArea(req.query.area); res.json({ data: { reportingPeriod: 'current', totalReports: scopedReports.length, resolutionRate: scopedReports.length ? Math.round((scopedReports.filter((item) => item.status === 'resolved').length / scopedReports.length) * 100) : 0 } }); });
app.use('/uploads', express.static(uploadDirectory));
app.use((error, _req, res, next) => { if (error instanceof multer.MulterError) return res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Each image must be 5MB or smaller.' : 'You can upload a maximum of 3 images.' }); if (error) return res.status(400).json({ error: 'Only image files are accepted.' }); next(error); });
app.listen(port, () => console.log(`Municipal Dashboard API listening on http://localhost:${port}`));
