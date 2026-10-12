export type IncidentCategory =
  | 'Roads'
  | 'Potholes'
  | 'Garbage'
  | 'Streetlights'
  | 'Water'
  | 'Drainage'
  | 'Traffic signals'
  | 'Public safety'
  | 'Noise'
  | 'Construction'
  | 'Pollution'
  | 'Parks'
  | 'Public transport'
  | 'Other';

export type IncidentStatus =
  | 'Reported'
  | 'Acknowledged'
  | 'Assigned'
  | 'In Progress'
  | 'Resolved'
  | 'Closed';

export type IncidentSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface IncidentUpdate {
  status: IncidentStatus;
  timestamp: string;
  note: string;
}

export interface CivicIncidentItem {
  id: string; // e.g., 'CP-2026-481902'
  title: string;
  category: IncidentCategory;
  description: string;
  location: string;
  city: string;
  coordinates: { lat: number; lng: number };
  createdAt: string;
  updatedAt: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  source: string;
  photoUrl?: string;
  assignedDepartment?: string;
  updates: IncidentUpdate[];
}

const DEFAULT_INCIDENTS: CivicIncidentItem[] = [
  {
    id: 'CP-2026-104921',
    title: 'Severe road surface damage & potholes on MI Road',
    category: 'Potholes',
    description: 'Multiple large road depressions following monsoon runoff causing heavy vehicular slowdown near Ajmeri Gate intersection.',
    location: 'MI Road, near Ajmeri Gate, Jaipur',
    city: 'Jaipur',
    coordinates: { lat: 26.9168, lng: 75.8193 },
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    status: 'In Progress',
    severity: 'High',
    source: 'Citizen Telematics Feed',
    assignedDepartment: 'Jaipur Nagar Nigam (JNN) PWD',
    updates: [
      { status: 'Reported', timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), note: 'Issue logged via Citizen Report portal.' },
      { status: 'Acknowledged', timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), note: 'Validated by Municipal GIS Operations Desk.' },
      { status: 'Assigned', timestamp: new Date(Date.now() - 3600000 * 2.5).toISOString(), note: 'Assigned to Central Road Maintenance Depot Crew #4.' },
      { status: 'In Progress', timestamp: new Date(Date.now() - 3600000 * 1).toISOString(), note: 'Cold mix patch operations active on northbound lane.' },
    ],
  },
  {
    id: 'CP-2026-218490',
    title: 'Faulty traffic signal controller at Queens Road Junction',
    category: 'Traffic signals',
    description: 'Amber phase blinking continuously causing gridlock between Vaishali Nagar and Khatipura Road.',
    location: 'Queens Road Junction, Vaishali Nagar, Jaipur',
    city: 'Jaipur',
    coordinates: { lat: 26.9061, lng: 75.7485 },
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    status: 'Assigned',
    severity: 'Medium',
    source: 'Jaipur Traffic Police Liaison',
    assignedDepartment: 'Jaipur Smart City Mobility Cell',
    updates: [
      { status: 'Reported', timestamp: new Date(Date.now() - 3600000 * 12).toISOString(), note: 'Logged by Traffic Cell Sensor.' },
      { status: 'Acknowledged', timestamp: new Date(Date.now() - 3600000 * 8).toISOString(), note: 'Verified by CCTV operations room.' },
      { status: 'Assigned', timestamp: new Date(Date.now() - 3600000 * 3).toISOString(), note: 'Electronics technician dispatched with replacement timer.' },
    ],
  },
  {
    id: 'CP-2026-391082',
    title: 'Stormwater drain blockage and standing water on Tonk Road',
    category: 'Drainage',
    description: 'Underpass silt accumulation creating stagnant pool after precipitation.',
    location: 'Tonk Road Underpass, Gopalpura Flyover, Jaipur',
    city: 'Jaipur',
    coordinates: { lat: 26.8624, lng: 75.7952 },
    createdAt: new Date(Date.now() - 3600000 * 26).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    status: 'Resolved',
    severity: 'Critical',
    source: 'Civic Sensor Telemetry',
    assignedDepartment: 'Drainage & Disaster Response Wing',
    updates: [
      { status: 'Reported', timestamp: new Date(Date.now() - 3600000 * 26).toISOString(), note: 'Automated runoff level alert triggered.' },
      { status: 'Acknowledged', timestamp: new Date(Date.now() - 3600000 * 24).toISOString(), note: 'Field officer confirmed 20cm water depth.' },
      { status: 'In Progress', timestamp: new Date(Date.now() - 3600000 * 12).toISOString(), note: 'Heavy duty pump deployed.' },
      { status: 'Resolved', timestamp: new Date(Date.now() - 3600000 * 6).toISOString(), note: 'Drainage channel desilted and cleared for free flow.' },
    ],
  },
  {
    id: 'CP-2026-583912',
    title: 'Solid waste container overflow near Jawahar Circle',
    category: 'Garbage',
    description: 'Secondary collection bin overflowing on service lane causing sanitary concern.',
    location: 'JLN Marg, Jawahar Circle, Malviya Nagar, Jaipur',
    city: 'Jaipur',
    coordinates: { lat: 26.8439, lng: 75.8016 },
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: 'Acknowledged',
    severity: 'Medium',
    source: 'Citizen Direct Submission',
    assignedDepartment: 'Solid Waste Management Division',
    updates: [
      { status: 'Reported', timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), note: 'Submitted with photo via mobile reporting portal.' },
      { status: 'Acknowledged', timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), note: 'Scheduled for evening compactor truck route.' },
    ],
  },
  {
    id: 'CP-2026-481920',
    title: 'Metro Phase-2 Ducting & Surface Trenching — Road Closed',
    category: 'Construction',
    description: 'Underground utility trenching and civil excavation work. Northbound carriage way completely closed from B2 Bypass to Jawahar Circle.',
    location: 'Tonk Road at B2 Bypass Junction, Jaipur',
    city: 'Jaipur',
    coordinates: { lat: 26.8521, lng: 75.7942 },
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: 'In Progress',
    severity: 'Critical',
    source: 'Jaipur Development Authority (JDA) PWD Notice',
    assignedDepartment: 'JDA Engineering Wing & Traffic Police',
    updates: [
      { status: 'Reported', timestamp: new Date(Date.now() - 3600000 * 8).toISOString(), note: 'Excavation permit #JDA-2026-78 issued.' },
      { status: 'In Progress', timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), note: 'Barricading active; traffic diverted to JLN Marg.' },
    ],
  },
];

const STORAGE_KEY = 'citypulse_civic_incidents_v2';

export function getCivicIncidents(cityName?: string): CivicIncidentItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const stored: CivicIncidentItem[] = raw ? JSON.parse(raw) : [];
    const all = [...stored, ...DEFAULT_INCIDENTS];
    // Deduplicate by ID
    const map = new Map<string, CivicIncidentItem>();
    for (const item of all) {
      if (!map.has(item.id)) map.set(item.id, item);
    }
    const combined = Array.from(map.values());
    if (cityName) {
      return combined.filter(
        (inc) => inc.city.toLowerCase() === cityName.toLowerCase() || inc.location.toLowerCase().includes(cityName.toLowerCase())
      );
    }
    return combined;
  } catch {
    return DEFAULT_INCIDENTS;
  }
}

export function getIncidentById(id: string): CivicIncidentItem | null {
  const all = getCivicIncidents();
  const trimmed = id.trim().toUpperCase();
  return all.find((inc) => inc.id.toUpperCase() === trimmed) || null;
}

export function reportCivicIssue(params: {
  title: string;
  category: IncidentCategory;
  description: string;
  location: string;
  city: string;
  coordinates: { lat: number; lng: number };
  photoUrl?: string;
  severity?: IncidentSeverity;
}): CivicIncidentItem {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  const now = new Date().toISOString();
  const id = `CP-2026-${randomNum}`;

  const newIncident: CivicIncidentItem = {
    id,
    title: params.title,
    category: params.category,
    description: params.description,
    location: params.location,
    city: params.city,
    coordinates: params.coordinates,
    createdAt: now,
    updatedAt: now,
    status: 'Reported',
    severity: params.severity || 'Medium',
    source: 'Citizen Direct Submission',
    photoUrl: params.photoUrl,
    assignedDepartment: `Municipal ${params.category} Department`,
    updates: [
      {
        status: 'Reported',
        timestamp: now,
        note: 'Report submitted successfully. Municipal operations ticket generated.',
      },
    ],
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const stored: CivicIncidentItem[] = raw ? JSON.parse(raw) : [];
    stored.unshift(newIncident);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // LocalStorage fallback
  }

  return newIncident;
}
