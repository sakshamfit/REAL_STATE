/**
 * ---------------------------------------------------------------------------
 * RUDRA CONSTRUCTIONS & SUPPLIERS — site content
 * ---------------------------------------------------------------------------
 * Everything the client can edit lives in this one file. No copy is buried in
 * components. Add / edit / remove entries here and the site updates.
 *
 * IMPORTANT: only content supplied by the client brief is present here.
 * We do NOT invent project names or project locations. The India map is driven
 * by `presence` (states + cities the client confirmed). When the client shares
 * a project database, fill `projects` below — the map markers, arcs and state
 * panels pick it up automatically.
 */

export const company = {
  name: "Rudra Constructions & Suppliers",
  shortName: "Rudra",
  tagline: "Engineering Trust. Constructing Excellence.",
  headline: "Building the future with strength, integrity & innovation.",
  founded: 2025,
  phone: "+91 80995 88978",
  phoneHref: "tel:+918099588978",
  email: "rudraconstructionsupplier14@gmail.com",
  emailHref: "mailto:rudraconstructionsupplier14@gmail.com",
  addresses: [
    { label: "Bihar", lines: ["Patna", "Bettiah", "Bihar, India"] },
    { label: "Assam", lines: ["Biswanath", "Jorhat", "Assam, India"] },
  ],
} as const;

export type ServiceKey =
  | "civil"
  | "residential"
  | "commercial"
  | "infrastructure"
  | "solar"
  | "renovation";

export type Service = {
  key: ServiceKey;
  index: string;
  title: string;
  kicker: string;
  summary: string;
  bullets: string[];
};

export const services: Service[] = [
  {
    key: "civil",
    index: "01",
    title: "Civil & Structural",
    kicker: "Frames that carry the load",
    summary:
      "Reinforced concrete and structural steel construction executed to specification — foundations, frames, slabs and finishes.",
    bullets: ["RCC & steel structures", "Foundations & substructure", "Structural finishing"],
  },
  {
    key: "residential",
    index: "02",
    title: "Residential",
    kicker: "Homes built to be lived in",
    summary:
      "Houses, apartments and housing developments delivered with clean detailing, durable materials and on-time handover.",
    bullets: ["Houses & apartments", "Housing developments", "Turnkey handover"],
  },
  {
    key: "commercial",
    index: "03",
    title: "Commercial",
    kicker: "Space that works as hard as you do",
    summary:
      "Offices, retail and institutional buildings — planned for footfall, services and long service life.",
    bullets: ["Offices & retail", "Institutional buildings", "Fit-out & services"],
  },
  {
    key: "infrastructure",
    index: "04",
    title: "Infrastructure",
    kicker: "Public works, built to last",
    summary:
      "Roads, bridges and public infrastructure executed for government and institutional clients across the region.",
    bullets: ["Roads & bridges", "Public works", "Government projects"],
  },
  {
    key: "solar",
    index: "05",
    title: "Solar & Renewable",
    kicker: "Energy that keeps giving",
    summary:
      "Rooftop and ground-mounted solar installations — structures, mounting, civil works and commissioning support.",
    bullets: ["Rooftop solar", "Ground-mount farms", "Mounting & civil works"],
  },
  {
    key: "renovation",
    index: "06",
    title: "Renovation & Retrofit",
    kicker: "New life for existing structures",
    summary:
      "Repair, restoration and retrofit of ageing buildings — strengthening, re-planning and modernisation.",
    bullets: ["Structural repair", "Retrofit & strengthening", "Modernisation"],
  },
];

export type TimelineItem = {
  year: string;
  title: string;
  text: string;
  points: string[];
};

/** Timeline from the client brief: founded 2025, capability build-out, expansion. */
export const timeline: TimelineItem[] = [
  {
    year: "2025",
    title: "Founded",
    text: "Rudra Constructions & Suppliers is established to deliver civil construction, infrastructure and material supply from one accountable team.",
    points: ["Single point of accountability", "Execution-first company"],
  },
  {
    year: "Now",
    title: "Capabilities expand",
    text: "Four working verticals run in parallel, sharing crews, plant and a common quality and safety standard.",
    points: ["Civil construction", "Infrastructure", "Solar energy", "Material supply"],
  },
  {
    year: "Next",
    title: "Regional expansion",
    text: "Presence grows across eastern and north-eastern India, working with government departments, foundations and private clients.",
    points: ["Bihar & Assam base", "Multi-state delivery", "Institutional clients"],
  },
  {
    year: "Future",
    title: "Built for what comes next",
    text: "Larger infrastructure projects, advanced construction technology, renewable energy and strategic partnerships.",
    points: ["Larger infrastructure", "Advanced construction tech", "Renewable energy", "Strategic partnerships"],
  },
];

export type ProcessStep = {
  index: string;
  title: string;
  text: string;
  outputs: string[];
};

/** Five-step execution model, as supplied by the client. */
export const process: ProcessStep[] = [
  {
    index: "01",
    title: "Requirement Analysis",
    text: "We study the brief, the site and the constraints before a single line is drawn — scope, loads, access, approvals and budget.",
    outputs: ["Site study", "Scope & feasibility"],
  },
  {
    index: "02",
    title: "Design & Planning",
    text: "Drawings, structural logic and a build sequence the site can actually follow, with quantities and a programme agreed up front.",
    outputs: ["Drawings & specs", "Programme & quantities"],
  },
  {
    index: "03",
    title: "Procurement",
    text: "Materials sourced, tested and delivered to site on schedule — supply is our own vertical, so nothing waits on a third party.",
    outputs: ["Certified materials", "Just-in-time delivery"],
  },
  {
    index: "04",
    title: "Execution",
    text: "Supervised crews build to the programme. Daily progress is tracked against the plan, not against a promise.",
    outputs: ["Supervised crews", "Progress against plan"],
  },
  {
    index: "05",
    title: "Quality & Safety",
    text: "Inspection at every stage, safety protocols on every shift, and documentation handed over with the structure.",
    outputs: ["Stage inspections", "Handover documentation"],
  },
];

export type TrustPillar = {
  title: string;
  text: string;
  metric: string;
};

export const trustPillars: TrustPillar[] = [
  {
    title: "Quality",
    metric: "Certified materials",
    text: "Materials sourced and tested before they reach site, with specification compliance checked at every stage of the pour and the frame.",
  },
  {
    title: "Safety",
    metric: "On-site protocols",
    text: "Safety protocols are part of the daily routine — briefed, supervised and recorded, from excavation through to the final fix.",
  },
  {
    title: "Compliance",
    metric: "Industry standards",
    text: "Work executed to applicable industry standards and client specifications, with documentation available for audit and handover.",
  },
  {
    title: "Sustainability",
    metric: "Eco-friendly construction",
    text: "Efficient material use, controlled waste and renewable energy capability, so the structure performs long after handover.",
  },
];

export const clients: string[] = [
  "Panchayati Raj — Bihar Govt.",
  "Aashray Foundation",
  "Sehgal Foundation",
  "Srijjan",
  "WOTER",
  "GVT",
  "Building Construction Department — Bihar Govt.",
  "Bihar State Building Corporation Ltd.",
  "Aroh Foundation",
  "Bihar Animal & Fisheries Resource Department",
];

export type PresenceTier = "projects" | "presence" | "reach";

export type PresenceCity = {
  name: string;
  lat: number;
  lon: number;
  note?: string;
};

/**
 * Project record — left empty on purpose.
 * The client brief confirms presence (states + cities) but no project-level
 * database. Populate this array when the client provides the data and the map
 * will render markers, arcs and detail panels automatically.
 *
 * Example entry:
 * {
 *   state: "Bihar", city: "Patna", name: "…", type: "Civil construction",
 *   year: "2025", lat: 25.61, lon: 85.14, image: "/projects/….jpg",
 *   description: "…"
 * }
 */
export type Project = {
  state: string;
  city: string;
  name: string;
  type: string;
  year: string;
  lat: number;
  lon: number;
  image?: string;
  description?: string;
};

export const projects: Project[] = [];

export type Presence = {
  /** must match the normalised state name used by the map geometry */
  state: string;
  tier: PresenceTier;
  presenceText: string;
  cities: PresenceCity[];
};

/** "Where we are" — states from the client brief, with confirmed cities. */
export const presence: Presence[] = [
  {
    state: "Bihar",
    tier: "projects",
    presenceText: "Strong regional presence",
    cities: [
      { name: "Patna", lat: 25.6093, lon: 85.1376, note: "Operations base" },
      { name: "Bettiah", lat: 26.8026, lon: 84.5016, note: "Operations base" },
    ],
  },
  {
    state: "Assam",
    tier: "projects",
    presenceText: "Strong regional presence",
    cities: [
      { name: "Biswanath", lat: 26.6975, lon: 93.1507 },
      { name: "Jorhat", lat: 26.7515, lon: 94.2037 },
    ],
  },
  { state: "Uttar Pradesh", tier: "presence", presenceText: "Project presence", cities: [] },
  { state: "Jharkhand", tier: "presence", presenceText: "Project presence", cities: [] },
  { state: "Odisha", tier: "presence", presenceText: "Project presence", cities: [] },
  { state: "Meghalaya", tier: "presence", presenceText: "Project presence", cities: [] },
  { state: "Tripura", tier: "presence", presenceText: "Project presence", cities: [] },
  { state: "Arunachal Pradesh", tier: "presence", presenceText: "Project presence", cities: [] },
  { state: "Haryana", tier: "presence", presenceText: "Project presence", cities: [] },
  { state: "Punjab", tier: "presence", presenceText: "Project presence", cities: [] },
  { state: "Jammu & Kashmir", tier: "presence", presenceText: "Project presence", cities: [] },
];

export const tierLabel: Record<PresenceTier, string> = {
  projects: "Strong presence",
  presence: "Project presence",
  reach: "Reach",
};

export const cta = {
  headline: "Let's build the future together",
  lines: ["Your vision.", "Our engineering.", "Built to last."],
  button: "Start a project",
};

export const heroStages = [
  { at: 0.0, label: "Empty land", note: "Every structure starts as a site" },
  { at: 0.14, label: "Foundation", note: "Excavation, footings and plinth" },
  { at: 0.3, label: "Structure rises", note: "Columns and the structural frame" },
  { at: 0.46, label: "Floors take shape", note: "Slabs poured level by level" },
  { at: 0.64, label: "Facade goes on", note: "Glazing and envelope" },
  { at: 0.82, label: "Complete", note: "Handover-ready building" },
] as const;

export const nav = [
  { id: "hero", label: "Home" },
  { id: "about", label: "About" },
  { id: "services", label: "What we do" },
  { id: "process", label: "How we build" },
  { id: "trust", label: "Quality" },
  { id: "clients", label: "Clients" },
  { id: "presence", label: "Presence" },
  { id: "contact", label: "Contact" },
] as const;
