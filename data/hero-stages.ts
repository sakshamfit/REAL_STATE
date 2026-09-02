export const HERO_STAGES = [
  { at: 0, label: "SITE PREPARATION", sub: "Empty land · survey grid" },
  { at: 0.06, label: "FOUNDATION", sub: "Excavation & footing" },
  { at: 0.14, label: "STRUCTURE", sub: "Columns rise" },
  { at: 0.3, label: "FLOORS", sub: "Slabs stack up" },
  { at: 0.46, label: "FACADE", sub: "Glass wraps the frame" },
  { at: 0.62, label: "CORE & SERVICES", sub: "MEP cores complete" },
  { at: 0.76, label: "ROOF & COMMISSION", sub: "Building tops out" },
  { at: 0.9, label: "DELIVERED", sub: "Rudra engineering" },
  { at: 1.0001, label: "BUILD COMPLETE", sub: "Engineering trust. Constructing excellence." },
];

export function heroStageIndex(p: number) {
  let i = 0;
  for (let s = 0; s < HERO_STAGES.length; s++) if (p >= HERO_STAGES[s].at) i = s;
  return i;
}
