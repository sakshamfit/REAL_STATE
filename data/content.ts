export const COMPANY = {
  name: "Rudra Constructions & Suppliers",
  short: "RUDRA",
  tagline: "Engineering Trust. Constructing Excellence.",
  promise: "Building the future with strength, integrity & innovation.",
  phone: "+91 8099588978",
  phoneHref: "tel:+918099588978",
  email: "rudraconstructionsupplier14@gmail.com",
  emailHref: "mailto:rudraconstructionsupplier14@gmail.com",
  location: "Patna, Bihar · India",
  founded: 2025,
};

export type Service = {
  id: string;
  index: string;
  title: string;
  tagline: string;
  description: string;
  points: string[];
};

export const SERVICES: Service[] = [
  {
    id: "civil",
    index: "01",
    title: "Civil & Structural",
    tagline: "Foundations · Frames · RCC",
    description:
      "High-rise structural frames, RCC works, heavy foundations and load-bearing systems — engineered to exacting standards.",
    points: ["Structural frames", "RCC & foundation works", "Heavy civil construction"],
  },
  {
    id: "residential",
    index: "02",
    title: "Residential",
    tagline: "Homes · Apartments · Housing",
    description:
      "Homes, apartments and planned housing layouts — from individual residences to complete residential communities.",
    points: ["Individual homes", "Multi-storey apartments", "Housing layouts"],
  },
  {
    id: "commercial",
    index: "03",
    title: "Commercial",
    tagline: "Offices · Retail · Mixed-use",
    description:
      "Offices, retail and mixed-use complexes built for performance, longevity and operational efficiency.",
    points: ["Office complexes", "Retail spaces", "Mixed-use development"],
  },
  {
    id: "infrastructure",
    index: "04",
    title: "Infrastructure",
    tagline: "Roads · Bridges · Public works",
    description:
      "Roads, bridges and public infrastructure that connect communities and keep regions moving.",
    points: ["Roads & highways", "Bridges & culverts", "Civic infrastructure"],
  },
  {
    id: "solar",
    index: "05",
    title: "Solar & Renewable",
    tagline: "Ground-mount · Rooftop · Energy",
    description:
      "Ground-mounted and rooftop solar installations, and renewable-energy integration for a cleaner grid.",
    points: ["Ground-mounted solar", "Rooftop solar", "Energy integration"],
  },
  {
    id: "renovation",
    index: "06",
    title: "Renovation & Retrofit",
    tagline: "Reinforce · Modernize · Restore",
    description:
      "Reinforcement, modernization and material upgrades that extend the life of existing structures.",
    points: ["Structural retrofitting", "Modernization", "Material upgrades"],
  },
];

export const PROCESS = [
  {
    index: "01",
    title: "Requirement Analysis",
    desc: "Site assessment, feasibility and requirement mapping — we scan the ground truth before we break it.",
  },
  {
    index: "02",
    title: "Design & Planning",
    desc: "Structural design, drawings and detailed planning coordinated across engineering disciplines.",
  },
  {
    index: "03",
    title: "Procurement",
    desc: "Certified materials sourced through our own supply chain — from cement and steel to MEP systems.",
  },
  {
    index: "04",
    title: "Execution",
    desc: "Disciplined on-site execution with skilled crews, clear milestones and transparent reporting.",
  },
  {
    index: "05",
    title: "Quality & Safety",
    desc: "Inspection, testing and safety protocols at every stage — quality is checked, not assumed.",
  },
];

export const TIMELINE = [
  {
    year: "2025",
    title: "Founded",
    body: "Rudra Constructions & Suppliers is established — built on civil & structural engineering, material supply and an uncompromising delivery standard.",
  },
  {
    year: "Capabilities",
    title: "Capabilities Expand",
    body: "Full verticals go live: civil construction, infrastructure, solar & renewable energy, and certified building-material supply.",
  },
  {
    year: "Reach",
    title: "Regional Expansion",
    body: "Presence spreads across Bihar, the North-East and beyond — with government and institutional partners trusting Rudra at scale.",
  },
  {
    year: "Future",
    title: "The Road Ahead",
    body: "Larger infrastructure projects, advanced construction technology, renewable energy and strategic partnerships.",
  },
];

export const TRUST_PILLARS = [
  {
    key: "quality",
    title: "Quality",
    body: "Certified materials and tested workmanship on every pour, weld and finish.",
  },
  {
    key: "safety",
    title: "Safety",
    body: "Strict on-site safety protocols protecting people from day one to handover.",
  },
  {
    key: "compliance",
    title: "Compliance",
    body: "Industry standards, statutory approvals and auditable documentation.",
  },
  {
    key: "sustainability",
    title: "Sustainability",
    body: "Eco-friendly construction practices and renewable-energy integration.",
  },
];

export const CLIENTS = [
  { name: "Panchayati Raj", org: "Bihar Govt." },
  { name: "Aashray Foundation", org: "Development Partner" },
  { name: "Sehgal Foundation", org: "Development Partner" },
  { name: "Srijjan", org: "Development Partner" },
  { name: "WOTER", org: "Development Partner" },
  { name: "GVT", org: "Development Partner" },
  { name: "Building Construction Department", org: "Bihar Govt." },
  { name: "Bihar State Building Corporation Ltd.", org: "State PSU" },
  { name: "Aroh Foundation", org: "Development Partner" },
  { name: "Bihar Animal & Fisheries Resource Dept.", org: "Bihar Govt." },
];

/** States where the client has documented presence. GeoJSON names are matched exactly. */
export type Presence = {
  geoName: string;
  label: string;
  tier: 1 | 2; // 1 = primary presence, 2 = presence
  blurb: string;
  cities?: { name: string; lat: number; lon: number }[];
};

export const PRESENCE: Presence[] = [
  {
    geoName: "Bihar",
    label: "Bihar",
    tier: 1,
    blurb: "Strong regional presence — HQ and primary operations.",
    cities: [
      { name: "Patna", lat: 25.5941, lon: 85.1376 },
      { name: "Bettiah", lat: 26.8023, lon: 84.4986 },
    ],
  },
  {
    geoName: "Assam",
    label: "Assam",
    tier: 2,
    blurb: "Active operations across the North-East corridor.",
    cities: [
      { name: "Biswanath", lat: 26.7267, lon: 93.15 },
      { name: "Jorhat", lat: 26.7509, lon: 94.2037 },
    ],
  },
  { geoName: "Uttar Pradesh", label: "Uttar Pradesh", tier: 2, blurb: "Presence for projects and material supply." },
  { geoName: "Jharkhand", label: "Jharkhand", tier: 2, blurb: "Presence for projects and material supply." },
  { geoName: "Odisha", label: "Odisha", tier: 2, blurb: "Presence for projects and material supply." },
  { geoName: "Meghalaya", label: "Meghalaya", tier: 2, blurb: "Presence for projects and material supply." },
  { geoName: "Tripura", label: "Tripura", tier: 2, blurb: "Presence for projects and material supply." },
  { geoName: "Arunachal Pradesh", label: "Arunachal Pradesh", tier: 2, blurb: "Presence for projects and material supply." },
  { geoName: "Haryana", label: "Haryana", tier: 2, blurb: "Presence for projects and material supply." },
  { geoName: "Punjab", label: "Punjab", tier: 2, blurb: "Presence for projects and material supply." },
  { geoName: "Jammu and Kashmir", label: "Jammu & Kashmir", tier: 2, blurb: "Presence for projects and material supply." },
];

export const NAV_LINKS = [
  { label: "Work", href: "#work" },
  { label: "Services", href: "#services" },
  { label: "Process", href: "#process" },
  { label: "Presence", href: "#presence" },
  { label: "Contact", href: "#contact" },
];

/**
 * Future project database — when the client provides real project data,
 * append entries here (or move to /public/projects.json) and markers,
 * routes and panels generate automatically.
 */
export type ProjectRecord = {
  state: string;
  city: string;
  project: string;
  type: string;
  year: number;
  lat: number;
  lon: number;
  description?: string;
  image?: string;
};

export const PROJECTS: ProjectRecord[] = [];
