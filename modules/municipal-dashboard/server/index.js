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
	{ id: 'RPT-1038', area: 'khayelitsha', street: 'Mew Way', category: 'Electricity outage', location: 'Ward 7', latitude: -34.041, longitude: 18.674, status: 'resolved', resolvedHours: 12.5, reason: 'Planned substation maintenance', loggedAt: new Date(Date.now() - 29 * 3600000).toISOString(), updates: [{ message: 'Power restored after planned substation maintenance.', createdAt: new Date(Date.now() - 16.5 * 3600000).toISOString() }], community: { confirmed: 3, unresolved: 0, comments: [{ name: 'Lebo', message: 'Power is back on for our street.', createdAt: new Date(Date.now() - 15 * 3600000).toISOString() }] }, photos: [] },
	{ id: 'RPT-1037', area: 'khayelitsha', street: 'Walter Sisulu Drive', category: 'Street light', location: 'Site B', latitude: -34.035, longitude: 18.667, status: 'in_progress', priority: 'normal', loggedAt: new Date(Date.now() - 20 * 3600000).toISOString(), updates: [], photos: [] },
	{ id: 'RPT-1036', area: 'delft', street: 'The Hague Avenue', category: 'Water leak', location: 'The Hague', latitude: -33.981, longitude: 18.644, status: 'received', priority: 'high', loggedAt: new Date(Date.now() - 23 * 3600000).toISOString(), photos: [] },
	{ id: 'RPT-1035', area: 'mitchells-plain', street: 'AZ Berman Drive', category: 'Pothole', location: 'Mitchells Plain', latitude: -34.052, longitude: 18.605, status: 'resolved', resolvedHours: 24, priority: 'normal', loggedAt: new Date(Date.now() - 51 * 3600000).toISOString(), photos: [] },
	{ id: 'RPT-1034', area: 'sandton', street: 'Rivonia Road', category: 'Electricity outage', location: 'Sandton', latitude: -26.107, longitude: 28.056, status: 'in_progress', priority: 'high', reason: 'Unplanned network fault under investigation', loggedAt: new Date(Date.now() - 7.2 * 3600000).toISOString(), updates: [{ message: 'A field crew has been dispatched to investigate the feeder fault.', createdAt: new Date(Date.now() - 1.2 * 3600000).toISOString() }], community: { confirmed: 0, unresolved: 1, comments: [] }, photos: [] },
	{ id: 'RPT-1033', area: 'parkhurst', street: 'Sixth Street', category: 'Street light', location: 'Parkhurst', latitude: -26.124, longitude: 28.013, status: 'received', priority: 'normal', loggedAt: new Date(Date.now() - 15 * 3600000).toISOString(), photos: [] },
	{ id: 'RPT-1032', area: 'sandton', street: 'Grayston Drive', category: 'Water leak', location: 'Sandton Central', latitude: -26.107, longitude: 28.062, status: 'resolved', resolvedHours: 8, priority: 'high', loggedAt: new Date(Date.now() - 33 * 3600000).toISOString(), updates: [], photos: [] },
];

const users = [];
const sessions = new Map();
const municipalitySessions = new Map();
const notificationBroadcasts = [];
const communityMessages = [
	{ id: 'msg_1', areaId: 'sandton', author: 'Municipality', role: 'official', message: 'Please share updates about the Rivonia Road electricity outage here.', createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
];

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
	{ id: 'soweto', name: 'Soweto', level: 'neighbourhood', parentId: 'johannesburg', subtitle: 'City of Johannesburg', latitude: -26.25, longitude: 27.86, zoom: 12 },
	{ id: 'randburg', name: 'Randburg', level: 'neighbourhood', parentId: 'johannesburg', subtitle: 'City of Johannesburg', latitude: -26.09, longitude: 27.99, zoom: 13 },
	{ id: 'roodepoort', name: 'Roodepoort', level: 'neighbourhood', parentId: 'johannesburg', subtitle: 'City of Johannesburg', latitude: -26.16, longitude: 27.87, zoom: 13 },
	{ id: 'ekurhuleni', name: 'Ekurhuleni', level: 'municipality', parentId: 'gauteng', subtitle: 'East Rand metro', latitude: -26.18, longitude: 28.25, zoom: 10 },
	{ id: 'germiston', name: 'Germiston', level: 'neighbourhood', parentId: 'ekurhuleni', subtitle: 'East Rand', latitude: -26.22, longitude: 28.17, zoom: 14 },
	{ id: 'kempton-park', name: 'Kempton Park', level: 'neighbourhood', parentId: 'ekurhuleni', subtitle: 'East Rand', latitude: -26.10, longitude: 28.23, zoom: 14 },
	{ id: 'midrand', name: 'Midrand', level: 'municipality', parentId: 'gauteng', subtitle: 'Johannesburg north', latitude: -25.99, longitude: 28.13, zoom: 12 },
	{ id: 'pretoria', name: 'Pretoria', level: 'municipality', parentId: 'gauteng', subtitle: 'City of Tshwane', latitude: -25.747, longitude: 28.229, zoom: 10 },
	{ id: 'centurion', name: 'Centurion', level: 'neighbourhood', parentId: 'pretoria', subtitle: 'Region 4', latitude: -25.86, longitude: 28.19, zoom: 13 },
	{ id: 'eastern-cape', name: 'Eastern Cape', level: 'province', parentId: 'all', subtitle: 'Province overview', latitude: -32.3, longitude: 26.5, zoom: 7 },
	{ id: 'buffalo-city', name: 'Buffalo City', level: 'municipality', parentId: 'eastern-cape', subtitle: 'East London metro', latitude: -32.97, longitude: 27.87, zoom: 10 },
	{ id: 'east-london', name: 'East London', level: 'neighbourhood', parentId: 'buffalo-city', subtitle: 'Metro area', latitude: -32.97, longitude: 27.87, zoom: 13 },
	{ id: 'gqeberha', name: 'Gqeberha', level: 'municipality', parentId: 'eastern-cape', subtitle: 'Nelson Mandela Bay', latitude: -33.96, longitude: 25.60, zoom: 10 },
	{ id: 'summerstrand', name: 'Summerstrand', level: 'neighbourhood', parentId: 'gqeberha', subtitle: 'Gqeberha suburb', latitude: -34.02, longitude: 25.67, zoom: 14 },
	{ id: 'mthatha', name: 'Mthatha', level: 'municipality', parentId: 'eastern-cape', subtitle: 'King Sabata Dalindyebo', latitude: -31.59, longitude: 28.78, zoom: 11 },
	{ id: 'mthatha-central', name: 'Mthatha Central', level: 'neighbourhood', parentId: 'mthatha', subtitle: 'Municipal area', latitude: -31.59, longitude: 28.78, zoom: 14 },
	{ id: 'free-state', name: 'Free State', level: 'province', parentId: 'all', subtitle: 'Province overview', latitude: -29.1, longitude: 26.2, zoom: 7 },
	{ id: 'mangaung', name: 'Mangaung', level: 'municipality', parentId: 'free-state', subtitle: 'Bloemfontein metro', latitude: -29.12, longitude: 26.22, zoom: 10 },
	{ id: 'bloemfontein', name: 'Bloemfontein', level: 'neighbourhood', parentId: 'mangaung', subtitle: 'Metro area', latitude: -29.12, longitude: 26.22, zoom: 13 },
	{ id: 'kwazulu-natal', name: 'KwaZulu-Natal', level: 'province', parentId: 'all', subtitle: 'Province overview', latitude: -29.0, longitude: 30.8, zoom: 7 },
	{ id: 'ethekwini', name: 'eThekwini', level: 'municipality', parentId: 'kwazulu-natal', subtitle: 'Durban metro', latitude: -29.86, longitude: 31.02, zoom: 10 },
	{ id: 'durban', name: 'Durban', level: 'neighbourhood', parentId: 'ethekwini', subtitle: 'Metro area', latitude: -29.86, longitude: 31.02, zoom: 13 },
	{ id: 'pietermaritzburg', name: 'Pietermaritzburg', level: 'municipality', parentId: 'kwazulu-natal', subtitle: 'Msunduzi municipality', latitude: -29.60, longitude: 30.38, zoom: 11 },
	{ id: 'umhlanga', name: 'Umhlanga', level: 'neighbourhood', parentId: 'ethekwini', subtitle: 'Durban north', latitude: -29.73, longitude: 31.09, zoom: 14 },
	{ id: 'newcastle', name: 'Newcastle', level: 'municipality', parentId: 'amajuba', subtitle: 'Amajuba district', latitude: -27.76, longitude: 29.93, zoom: 11 },
	{ id: 'newcastle-central', name: 'Newcastle Central', level: 'neighbourhood', parentId: 'newcastle', subtitle: 'Municipal area', latitude: -27.76, longitude: 29.93, zoom: 14 },
	{ id: 'umhlathuze', name: 'uMhlathuze', level: 'municipality', parentId: 'king-cetshwayo', subtitle: 'Richards Bay district', latitude: -28.78, longitude: 32.04, zoom: 11 },
	{ id: 'richards-bay', name: 'Richards Bay', level: 'neighbourhood', parentId: 'umhlathuze', subtitle: 'Municipal area', latitude: -28.78, longitude: 32.04, zoom: 14 },
	{ id: 'limpopo', name: 'Limpopo', level: 'province', parentId: 'all', subtitle: 'Province overview', latitude: -23.9, longitude: 29.45, zoom: 7 },
	{ id: 'polokwane', name: 'Polokwane', level: 'municipality', parentId: 'capricorn', subtitle: 'Capricorn district', latitude: -23.90, longitude: 29.45, zoom: 11 },
	{ id: 'polokwane-central', name: 'Polokwane Central', level: 'neighbourhood', parentId: 'polokwane', subtitle: 'Metro area', latitude: -23.90, longitude: 29.45, zoom: 14 },
	{ id: 'thulamela', name: 'Thulamela', level: 'municipality', parentId: 'vhembe', subtitle: 'Vhembe district', latitude: -22.95, longitude: 30.48, zoom: 10 },
	{ id: 'thohoyandou', name: 'Thohoyandou', level: 'neighbourhood', parentId: 'thulamela', subtitle: 'Municipal area', latitude: -22.95, longitude: 30.48, zoom: 14 },
	{ id: 'mopani', name: 'Mopani', level: 'district', parentId: 'limpopo', subtitle: 'District municipality', latitude: -23.83, longitude: 30.16, zoom: 9 },
	{ id: 'tzaneen', name: 'Tzaneen', level: 'neighbourhood', parentId: 'mopani', subtitle: 'Municipal area', latitude: -23.83, longitude: 30.16, zoom: 14 },
	{ id: 'mpumalanga', name: 'Mpumalanga', level: 'province', parentId: 'all', subtitle: 'Province overview', latitude: -25.6, longitude: 30.6, zoom: 7 },
	{ id: 'mbombela', name: 'Mbombela', level: 'municipality', parentId: 'ehlanzeni', subtitle: 'City of Mbombela', latitude: -25.47, longitude: 30.98, zoom: 11 },
	{ id: 'nelspruit', name: 'Mbombela Central', level: 'neighbourhood', parentId: 'mbombela', subtitle: 'Metro area', latitude: -25.47, longitude: 30.98, zoom: 14 },
	{ id: 'emalahleni', name: 'eMalahleni', level: 'municipality', parentId: 'nkangala', subtitle: 'Nkangala district', latitude: -25.87, longitude: 29.23, zoom: 11 },
	{ id: 'emalahleni-central', name: 'eMalahleni Central', level: 'neighbourhood', parentId: 'emalahleni', subtitle: 'Witbank metro area', latitude: -25.87, longitude: 29.23, zoom: 14 },
	{ id: 'steve-tshwete', name: 'Steve Tshwete', level: 'municipality', parentId: 'nkangala', subtitle: 'Middelburg district', latitude: -25.78, longitude: 29.46, zoom: 11 },
	{ id: 'middelburg', name: 'Middelburg', level: 'neighbourhood', parentId: 'steve-tshwete', subtitle: 'Municipal area', latitude: -25.78, longitude: 29.46, zoom: 14 },
	{ id: 'govan-mbeki', name: 'Govan Mbeki', level: 'municipality', parentId: 'gert-sibande', subtitle: 'Highveld district', latitude: -26.52, longitude: 29.19, zoom: 10 },
	{ id: 'secunda', name: 'Secunda', level: 'neighbourhood', parentId: 'govan-mbeki', subtitle: 'Municipal area', latitude: -26.52, longitude: 29.19, zoom: 14 },
	{ id: 'north-west', name: 'North West', level: 'province', parentId: 'all', subtitle: 'Province overview', latitude: -26.7, longitude: 25.3, zoom: 7 },
	{ id: 'matlosana', name: 'Matlosana', level: 'municipality', parentId: 'dr-kenneth-kaunda', subtitle: 'Klerksdorp metro', latitude: -26.86, longitude: 26.67, zoom: 11 },
	{ id: 'klerksdorp', name: 'Klerksdorp', level: 'neighbourhood', parentId: 'matlosana', subtitle: 'Metro area', latitude: -26.86, longitude: 26.67, zoom: 14 },
	{ id: 'bojanala', name: 'Bojanala', level: 'district', parentId: 'north-west', subtitle: 'District municipality', latitude: -25.67, longitude: 27.24, zoom: 10 },
	{ id: 'rustenburg', name: 'Rustenburg', level: 'neighbourhood', parentId: 'bojanala', subtitle: 'Metro area', latitude: -25.67, longitude: 27.24, zoom: 13 },
	{ id: 'northern-cape', name: 'Northern Cape', level: 'province', parentId: 'all', subtitle: 'Province overview', latitude: -29.0, longitude: 22.0, zoom: 7 },
	{ id: 'sol-plaatje', name: 'Sol Plaatje', level: 'municipality', parentId: 'frances-baard', subtitle: 'Kimberley municipality', latitude: -28.73, longitude: 24.77, zoom: 11 },
	{ id: 'kimberley', name: 'Kimberley', level: 'neighbourhood', parentId: 'sol-plaatje', subtitle: 'Metro area', latitude: -28.73, longitude: 24.77, zoom: 14 },
	{ id: 'western-cape-overberg', name: 'Overberg', level: 'district', parentId: 'western-cape', subtitle: 'District municipality', latitude: -34.42, longitude: 19.23, zoom: 9 },
	{ id: 'george', name: 'George', level: 'municipality', parentId: 'garden-route', subtitle: 'Garden Route', latitude: -33.96, longitude: 22.46, zoom: 11 },
	{ id: 'george-central', name: 'George Central', level: 'neighbourhood', parentId: 'george', subtitle: 'Garden Route', latitude: -33.96, longitude: 22.46, zoom: 14 },
	{ id: 'stellenbosch', name: 'Stellenbosch', level: 'municipality', parentId: 'cape-winelands', subtitle: 'Cape Winelands', latitude: -33.93, longitude: 18.86, zoom: 12 },
	{ id: 'stellenbosch-central', name: 'Stellenbosch Central', level: 'neighbourhood', parentId: 'stellenbosch', subtitle: 'Cape Winelands', latitude: -33.93, longitude: 18.86, zoom: 14 },
	{ id: 'alfred-nzo', name: 'Alfred Nzo', level: 'district', parentId: 'eastern-cape', subtitle: 'District municipality', latitude: -30.95, longitude: 28.70, zoom: 8 },
	{ id: 'amathole', name: 'Amathole', level: 'district', parentId: 'eastern-cape', subtitle: 'District municipality', latitude: -32.55, longitude: 27.45, zoom: 8 },
	{ id: 'chris-hani', name: 'Chris Hani', level: 'district', parentId: 'eastern-cape', subtitle: 'District municipality', latitude: -31.80, longitude: 26.90, zoom: 8 },
	{ id: 'joe-gqabi', name: 'Joe Gqabi', level: 'district', parentId: 'eastern-cape', subtitle: 'District municipality', latitude: -30.80, longitude: 26.90, zoom: 8 },
	{ id: 'or-tambo', name: 'OR Tambo', level: 'district', parentId: 'eastern-cape', subtitle: 'District municipality', latitude: -31.40, longitude: 29.20, zoom: 8 },
	{ id: 'sarah-baartman', name: 'Sarah Baartman', level: 'district', parentId: 'eastern-cape', subtitle: 'District municipality', latitude: -33.40, longitude: 25.80, zoom: 8 },
	{ id: 'fezile-dabi', name: 'Fezile Dabi', level: 'district', parentId: 'free-state', subtitle: 'District municipality', latitude: -26.95, longitude: 26.80, zoom: 8 },
	{ id: 'lejweleputswa', name: 'Lejweleputswa', level: 'district', parentId: 'free-state', subtitle: 'District municipality', latitude: -28.50, longitude: 26.20, zoom: 8 },
	{ id: 'thabo-mofutsanyana', name: 'Thabo Mofutsanyana', level: 'district', parentId: 'free-state', subtitle: 'District municipality', latitude: -28.60, longitude: 28.50, zoom: 8 },
	{ id: 'xhariep', name: 'Xhariep', level: 'district', parentId: 'free-state', subtitle: 'District municipality', latitude: -29.80, longitude: 25.80, zoom: 8 },
	{ id: 'sedibeng', name: 'Sedibeng', level: 'district', parentId: 'gauteng', subtitle: 'District municipality', latitude: -26.70, longitude: 28.00, zoom: 9 },
	{ id: 'west-rand', name: 'West Rand', level: 'district', parentId: 'gauteng', subtitle: 'District municipality', latitude: -26.20, longitude: 27.50, zoom: 9 },
	{ id: 'amajuba', name: 'Amajuba', level: 'district', parentId: 'kwazulu-natal', subtitle: 'District municipality', latitude: -27.75, longitude: 30.00, zoom: 8 },
	{ id: 'harry-gwala', name: 'Harry Gwala', level: 'district', parentId: 'kwazulu-natal', subtitle: 'District municipality', latitude: -30.20, longitude: 29.90, zoom: 8 },
	{ id: 'ilembe', name: 'iLembe', level: 'district', parentId: 'kwazulu-natal', subtitle: 'District municipality', latitude: -29.35, longitude: 31.10, zoom: 8 },
	{ id: 'king-cetshwayo', name: 'King Cetshwayo', level: 'district', parentId: 'kwazulu-natal', subtitle: 'District municipality', latitude: -28.80, longitude: 31.90, zoom: 8 },
	{ id: 'ugu', name: 'Ugu', level: 'district', parentId: 'kwazulu-natal', subtitle: 'District municipality', latitude: -30.65, longitude: 30.40, zoom: 8 },
	{ id: 'umgungundlovu', name: 'uMgungundlovu', level: 'district', parentId: 'kwazulu-natal', subtitle: 'District municipality', latitude: -29.60, longitude: 30.40, zoom: 8 },
	{ id: 'umkhanyakude', name: 'uMkhanyakude', level: 'district', parentId: 'kwazulu-natal', subtitle: 'District municipality', latitude: -27.80, longitude: 32.10, zoom: 8 },
	{ id: 'umzinyathi', name: 'uMzinyathi', level: 'district', parentId: 'kwazulu-natal', subtitle: 'District municipality', latitude: -28.50, longitude: 30.20, zoom: 8 },
	{ id: 'uthukela', name: 'uThukela', level: 'district', parentId: 'kwazulu-natal', subtitle: 'District municipality', latitude: -28.50, longitude: 29.50, zoom: 8 },
	{ id: 'zululand', name: 'Zululand', level: 'district', parentId: 'kwazulu-natal', subtitle: 'District municipality', latitude: -27.80, longitude: 31.50, zoom: 8 },
	{ id: 'vhembe', name: 'Vhembe', level: 'district', parentId: 'limpopo', subtitle: 'District municipality', latitude: -22.80, longitude: 30.30, zoom: 8 },
	{ id: 'capricorn', name: 'Capricorn', level: 'district', parentId: 'limpopo', subtitle: 'District municipality', latitude: -23.90, longitude: 29.45, zoom: 8 },
	{ id: 'sekhukhune', name: 'Sekhukhune', level: 'district', parentId: 'limpopo', subtitle: 'District municipality', latitude: -24.90, longitude: 30.20, zoom: 8 },
	{ id: 'waterberg', name: 'Waterberg', level: 'district', parentId: 'limpopo', subtitle: 'District municipality', latitude: -24.70, longitude: 27.90, zoom: 8 },
	{ id: 'ehlanzeni', name: 'Ehlanzeni', level: 'district', parentId: 'mpumalanga', subtitle: 'District municipality', latitude: -25.40, longitude: 31.00, zoom: 8 },
	{ id: 'nkangala', name: 'Nkangala', level: 'district', parentId: 'mpumalanga', subtitle: 'District municipality', latitude: -25.80, longitude: 29.30, zoom: 8 },
	{ id: 'gert-sibande', name: 'Gert Sibande', level: 'district', parentId: 'mpumalanga', subtitle: 'District municipality', latitude: -26.50, longitude: 30.00, zoom: 8 },
	{ id: 'dr-kenneth-kaunda', name: 'Dr Kenneth Kaunda', level: 'district', parentId: 'north-west', subtitle: 'District municipality', latitude: -26.80, longitude: 26.60, zoom: 8 },
	{ id: 'dr-ruth-segomotsi-mompati', name: 'Dr Ruth Segomotsi Mompati', level: 'district', parentId: 'north-west', subtitle: 'District municipality', latitude: -26.90, longitude: 24.70, zoom: 8 },
	{ id: 'ngaka-modiri-molema', name: 'Ngaka Modiri Molema', level: 'district', parentId: 'north-west', subtitle: 'District municipality', latitude: -25.85, longitude: 25.65, zoom: 8 },
	{ id: 'frances-baard', name: 'Frances Baard', level: 'district', parentId: 'northern-cape', subtitle: 'District municipality', latitude: -28.70, longitude: 24.80, zoom: 8 },
	{ id: 'john-taolo-gaetsewe', name: 'John Taolo Gaetsewe', level: 'district', parentId: 'northern-cape', subtitle: 'District municipality', latitude: -27.00, longitude: 23.00, zoom: 8 },
	{ id: 'namakwa', name: 'Namakwa', level: 'district', parentId: 'northern-cape', subtitle: 'District municipality', latitude: -29.50, longitude: 17.90, zoom: 8 },
	{ id: 'pixley-ka-seme', name: 'Pixley ka Seme', level: 'district', parentId: 'northern-cape', subtitle: 'District municipality', latitude: -30.00, longitude: 23.00, zoom: 8 },
	{ id: 'zf-mgcawu', name: 'ZF Mgcawu', level: 'district', parentId: 'northern-cape', subtitle: 'District municipality', latitude: -28.50, longitude: 21.80, zoom: 8 },
	{ id: 'cape-winelands', name: 'Cape Winelands', level: 'district', parentId: 'western-cape', subtitle: 'District municipality', latitude: -33.70, longitude: 19.30, zoom: 8 },
	{ id: 'central-karoo', name: 'Central Karoo', level: 'district', parentId: 'western-cape', subtitle: 'District municipality', latitude: -32.20, longitude: 22.00, zoom: 8 },
	{ id: 'garden-route', name: 'Garden Route', level: 'district', parentId: 'western-cape', subtitle: 'District municipality', latitude: -33.80, longitude: 22.30, zoom: 8 },
	{ id: 'west-coast', name: 'West Coast', level: 'district', parentId: 'western-cape', subtitle: 'District municipality', latitude: -32.50, longitude: 18.50, zoom: 8 },
];

const childAreaIds = (areaId) => areas.filter((area) => area.parentId === areaId).flatMap((area) => [area.id, ...childAreaIds(area.id)]);
const parentAreaIds = (areaId) => { const area = areas.find((item) => item.id === areaId); return area?.parentId ? [area.parentId, ...parentAreaIds(area.parentId)] : []; };
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
app.get('/api/v1/community/messages', (req, res) => { const area = req.query.area ?? 'all'; const scope = area === 'all' ? [...reports.map((report) => report.area), 'all'] : [area, ...childAreaIds(area), ...parentAreaIds(area)]; res.json({ data: communityMessages.filter((message) => scope.includes(message.areaId) || message.areaId === 'all') }); });
app.post('/api/v1/community/messages', (req, res) => { const area = req.body.area; if (!area || !areas.some((item) => item.id === area)) return res.status(400).json({ error: 'A valid service area is required.' }); if (!req.body.message?.trim()) return res.status(400).json({ error: 'A message is required.' }); const municipality = municipalitySessions.get(req.headers.authorization?.replace('Bearer ', '')); if (municipality) { const municipalityScope = [municipality.areaId, ...childAreaIds(municipality.areaId)]; if (!municipalityScope.includes(area)) return res.status(403).json({ error: 'That area is outside your municipality scope.' }); } const message = { id: `msg_${Date.now()}`, areaId: area, author: municipality ? 'Municipality' : (req.body.name?.trim() || 'Resident'), role: municipality ? 'official' : 'resident', message: req.body.message.trim(), createdAt: new Date().toISOString() }; communityMessages.unshift(message); res.status(201).json({ data: message }); });
app.get('/api/v1/citizen/reports/:id/community', (req, res) => { const report = reports.find((item) => item.id === req.params.id); if (!report) return res.status(404).json({ error: 'Report not found' }); res.json({ data: report.community ?? { confirmed: 0, unresolved: 0, comments: [] } }); });
app.post('/api/v1/citizen/reports/:id/comments', (req, res) => { const report = reports.find((item) => item.id === req.params.id); if (!report) return res.status(404).json({ error: 'Report not found' }); if (!req.body.message?.trim()) return res.status(400).json({ error: 'A message is required.' }); report.community ??= { confirmed: 0, unresolved: 0, comments: [] }; const comment = { name: req.body.name?.trim() || 'Resident', message: req.body.message.trim(), createdAt: new Date().toISOString() }; report.community.comments.unshift(comment); res.status(201).json({ data: comment }); });
app.post('/api/v1/citizen/reports/:id/verify', (req, res) => { const report = reports.find((item) => item.id === req.params.id); if (!report) return res.status(404).json({ error: 'Report not found' }); report.community ??= { confirmed: 0, unresolved: 0, comments: [] }; if (req.body.verdict === 'resolved') report.community.confirmed += 1; else if (req.body.verdict === 'still_not_resolved') { report.community.unresolved += 1; report.status = 'in_progress'; report.updates = [{ message: 'Residents have reported that this issue may still be unresolved.', createdAt: new Date().toISOString() }, ...(report.updates ?? [])]; } else return res.status(400).json({ error: 'Unsupported verification verdict.' }); res.json({ data: report.community }); });
app.post('/api/v1/citizen/reports', upload.array('photos', 3), (req, res) => {
	const area = areas.find((item) => item.id === req.body.area) ?? areas[1];
	const report = { id: `RPT-${1043 + reports.length}`, area: area.id, street: req.body.street ?? 'Unspecified street', category: req.body.category ?? 'Other', location: req.body.location ?? area.name, latitude: Number(req.body.latitude) || area.latitude, longitude: Number(req.body.longitude) || area.longitude, status: 'received', resolvedHours: null, reason: '', priority: 'normal', loggedAt: new Date().toISOString(), updates: [], photos: (req.files ?? []).map((file) => ({ name: file.originalname, size: file.size, type: file.mimetype, path: `/uploads/${file.filename}` })) };
	reports.unshift(report);
	res.status(201).json({ data: report });
});
app.patch('/api/v1/citizen/reports/:id/status', requireMunicipality, (req, res) => {
	const report = reports.find((item) => item.id === req.params.id);
	if (!report || !reportsForArea(req.municipality.areaId).includes(report)) return res.status(404).json({ error: 'Report not found in your jurisdiction.' });
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
	const reportViews = scopedReports.map((report) => ({ ...report, areaName: areas.find((area) => area.id === report.area)?.name ?? report.area, confirmed: report.community?.confirmed ?? 0, unresolved: report.community?.unresolved ?? 0 }));
	const clusters = Object.values(scopedReports.filter((report) => report.status !== 'resolved').reduce((groups, report) => { const key = `${report.area}|${report.category}|${report.street}`.toLowerCase(); groups[key] ??= { id: `cluster_${Object.keys(groups).length + 1}`, areaName: areas.find((area) => area.id === report.area)?.name ?? report.area, area: report.area, category: report.category, street: report.street, reportCount: 0, reportIds: [], confirmed: 0, unresolved: 0, latestUpdate: report.updates?.[0]?.message ?? '' }; groups[key].reportCount += 1; groups[key].reportIds.push(report.id); groups[key].confirmed += report.community?.confirmed ?? 0; groups[key].unresolved += report.community?.unresolved ?? 0; return groups; }, {}));
	res.json({ data: { generatedAt: new Date().toISOString(), scope: _req.municipality.areaId, totalReports: scopedReports.length, openReports: scopedReports.filter((report) => report.status !== 'resolved').length, resolvedReports: scopedReports.filter((report) => report.status === 'resolved').length, registeredUsers: scopedUsers.length, notificationBroadcasts: notificationBroadcasts.filter((broadcast) => broadcast.areaId === _req.municipality.areaId).length, byArea, byCategory, clusters, reports: reportViews } });
});
app.post('/api/v1/municipality/notifications/broadcast', requireMunicipality, (req, res) => {
	if (!req.body.subject || !req.body.message) return res.status(400).json({ error: 'Subject and message are required.' });
	const scopeAreaIds = [req.municipality.areaId, ...childAreaIds(req.municipality.areaId)];
	const recipientCount = users.filter((user) => scopeAreaIds.includes(user.preferredArea)).length;
	const broadcast = { id: `broadcast_${Date.now()}`, areaId: req.municipality.areaId, subject: req.body.subject, message: req.body.message, recipientCount, status: 'queued', createdAt: new Date().toISOString() };
	notificationBroadcasts.unshift(broadcast);
	communityMessages.unshift({ id: `msg_${Date.now()}_official`, areaId: req.municipality.areaId, author: 'Municipality', role: 'official', message: `${req.body.subject}: ${req.body.message}`, createdAt: broadcast.createdAt });
	res.status(202).json({ data: broadcast });
});
app.post('/api/v1/workflow/route', (req, res) => res.status(202).json({ data: { reportId: req.body.reportId ?? null, department: req.body.department ?? 'Operations', status: 'queued' } }));
app.get('/api/v1/reporting/transparency', (req, res) => { const scopedReports = reportsForArea(req.query.area); res.json({ data: { reportingPeriod: 'current', totalReports: scopedReports.length, resolutionRate: scopedReports.length ? Math.round((scopedReports.filter((item) => item.status === 'resolved').length / scopedReports.length) * 100) : 0 } }); });
app.use('/uploads', express.static(uploadDirectory));
app.use((error, _req, res, next) => { if (error instanceof multer.MulterError) return res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Each image must be 5MB or smaller.' : 'You can upload a maximum of 3 images.' }); if (error) return res.status(400).json({ error: 'Only image files are accepted.' }); next(error); });
app.listen(port, () => console.log(`Municipal Dashboard API listening on http://localhost:${port}`));
