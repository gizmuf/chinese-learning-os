import manifest from "../public/atlas/workshop-audio/manifest.json";
// Lightweight server-side allowlist: no glyph geometry or learner content.
const targets = new Map(manifest.recordings.map(r => [r.itemId + "-" + r.kind, r.kind]));
export function isAtlasListeningTarget(id: string) { return targets.has(id); }
