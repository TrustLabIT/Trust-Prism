// ---------- Static constants ----------
export const palettes = [
  ["#4f46e5", "#7c3aed"], ["#0ea5e9", "#2563eb"], ["#f59e0b", "#ef4444"],
  ["#10b981", "#059669"], ["#ec4899", "#8b5cf6"], ["#14b8a6", "#0891b2"],
  ["#f43f5e", "#e11d48"], ["#6366f1", "#a855f7"], ["#22c55e", "#84cc16"],
];

export const TYPES = {
  image: "Image", video: "Video", banner: "Banner",
  pamphlet: "Pamphlet", design: "Design", document: "Document",
};

export const catLabel = {
  Videos: "Videos",
  Electronic: "Electronic media",
  Print: "Print media",
};

// Sub-classifications available under each top category
export const mediaTax = {
  Videos: ["Brand Film", "Demo & Explainer", "Social Video", "TV / Broadcast", "Reels / Shorts"],
  Electronic: ["Banners", "Social", "Email", "Images", "Presentations", "Documents", "Web / Landing"],
  Print: ["Pamphlets", "Flyers", "Billboards / OOH", "Packaging", "Posters", "Brochures"],
};

export const channels = [
  { n: "YouTube", c: "#ef4444", i: "▶" }, { n: "Meta / Facebook", c: "#1877f2", i: "f" },
  { n: "Instagram", c: "#e1306c", i: "◎" }, { n: "LinkedIn", c: "#0a66c2", i: "in" },
  { n: "TikTok", c: "#111827", i: "♪" }, { n: "Google Ads", c: "#0f9d58", i: "G" },
  { n: "Email", c: "#f59e0b", i: "✉" }, { n: "Website / Display", c: "#6366f1", i: "◈" },
];

export const roles = ["Super Admin", "Brand Manager", "Reviewer", "Content Editor", "Agency Contributor", "Viewer"];
export const initialAgencies = ["BrightWave Creative", "PixelForge Studio", "NorthStar Media"];

export const swatchData = [
  ["Indigo", "#4f46e5"], ["Violet", "#7c3aed"], ["Ink", "#12131a"],
  ["Sky", "#0ea5e9"], ["Amber", "#f59e0b"], ["Mist", "#f6f7f9"],
];

export const formatGroups = [
  { label: "Raster / photo", icon: "🖼", color: "#0ea5e9", ext: ["PNG", "JPG", "JPEG", "GIF", "WEBP", "AVIF", "HEIC", "TIFF", "BMP", "PSD", "PSB"] },
  { label: "Vector / illustration", icon: "✎", color: "#7c3aed", ext: ["SVG", "AI", "EPS", "PDF", "CDR", "WMF", "EMF"] },
  { label: "Design source files", icon: "✧", color: "#ec4899", ext: ["FIG", "SKETCH", "XD", "INDD", "IDML", "AFDESIGN", "AFPHOTO", "AFPUB", "STUDIO"] },
  { label: "RAW camera", icon: "📷", color: "#f59e0b", ext: ["RAW", "CR2", "CR3", "NEF", "ARW", "DNG", "RAF", "ORF", "RW2"] },
  { label: "Motion / video", icon: "▶", color: "#ef4444", ext: ["MP4", "MOV", "AVI", "MKV", "WEBM", "PRORES", "AEP", "PRPROJ", "MOGRT", "JSON (Lottie)"] },
  { label: "3D / AR", icon: "◆", color: "#14b8a6", ext: ["OBJ", "FBX", "GLB", "GLTF", "USDZ", "BLEND", "C4D", "MAX", "STL", "3DS"] },
  { label: "Audio", icon: "♪", color: "#8b5cf6", ext: ["MP3", "WAV", "AAC", "AIFF", "FLAC", "OGG"] },
  { label: "Documents / office", icon: "📄", color: "#64748b", ext: ["PDF", "DOCX", "PPTX", "XLSX", "KEY", "PAGES", "TXT"] },
  { label: "Fonts", icon: "A", color: "#0891b2", ext: ["OTF", "TTF", "WOFF", "WOFF2", "EOT"] },
  { label: "Archives & anything else", icon: "🗜", color: "#4f46e5", ext: ["ZIP", "RAR", "7Z", "+ any other format"] },
];

export const initialTemplates = [
  { n: "Instagram Post", k: "Social", r: "1080×1080" }, { n: "Instagram Story", k: "Social", r: "1080×1920" },
  { n: "Leaderboard Banner", k: "Banner", r: "728×90" }, { n: "Trifold Brochure", k: "Print", r: "A4" },
  { n: "Email Newsletter", k: "Email", r: "600px" }, { n: "Sales One-Pager", k: "Print", r: "A4" },
  { n: "LinkedIn Ad", k: "Social", r: "1200×627" }, { n: "Pitch Deck", k: "Presentation", r: "16:9" },
];

// Template editor
export const edColorPairs = [
  ["#4f46e5", "#7c3aed"], ["#0ea5e9", "#2563eb"], ["#f59e0b", "#ef4444"],
  ["#10b981", "#059669"], ["#ec4899", "#8b5cf6"], ["#12131a", "#3a3d4d"],
];
export const ncColorPairs = edColorPairs;

export const fmtSpec = {
  "Instagram Post": { r: "1080 × 1080 · 1:1", w: 330, h: 330, hs: 26, ss: 14 },
  "Instagram Story": { r: "1080 × 1920 · 9:16", w: 210, h: 373, hs: 24, ss: 13 },
  "LinkedIn Ad": { r: "1200 × 627 · 1.91:1", w: 380, h: 198, hs: 24, ss: 13 },
  "Leaderboard Banner": { r: "728 × 90 · display", w: 420, h: 120, hs: 20, ss: 12 },
  "Email Newsletter": { r: "600 px wide · email", w: 360, h: 230, hs: 23, ss: 13 },
  "Trifold Brochure": { r: "A4 · print", w: 300, h: 388, hs: 24, ss: 13 },
  "Sales One-Pager": { r: "A4 · print", w: 300, h: 388, hs: 24, ss: 13 },
  "Pitch Deck": { r: "16 : 9 · presentation", w: 380, h: 214, hs: 26, ss: 14 },
};

export const initialShares = [
  { n: "Q3 Launch — Press Kit", to: "external agencies", views: 1204, dls: 88, exp: "Expires in 12 days", perm: "Download", pw: true, wm: true },
  { n: "Retail Partner Portal", to: "franchise partners", views: 3420, dls: 512, exp: "No expiry", perm: "Download", pw: false, wm: false },
  { n: "Influencer Asset Pack", to: "creators", views: 876, dls: 203, exp: "Expires in 4 days", perm: "View only", pw: false, wm: true },
  { n: "Social Team — Monthly", to: "internal + contractors", views: 2210, dls: 640, exp: "No expiry", perm: "Download", pw: false, wm: false },
];

export const initialCollections = [
  { n: "Q3 Product Launch", c: 342, y: "2026", org: "Internal" }, { n: "Brand Evergreen", c: 588, y: "2026", org: "Internal" }, { n: "Social — Always On", c: 1204, y: "2026", org: "BrightWave Creative" },
  { n: "Print & OOH", c: 176, y: "2025", org: "PixelForge Studio" }, { n: "Sales Enablement", c: 263, y: "2025", org: "Internal" }, { n: "Event 2026", c: 88, y: "2024", org: "NorthStar Media" },
];

export const initialUsers = [
  { id: "u1", name: "Venkata C.", email: "vscherukuri@gmail.com", role: "Super Admin", type: "Internal", org: "Internal", scope: "all", status: "Active" },
  { id: "u2", name: "Priya S.", email: "priya@company.com", role: "Brand Manager", type: "Internal", org: "Internal", scope: "all", status: "Active" },
  { id: "u3", name: "Marcus L.", email: "marcus@company.com", role: "Reviewer", type: "Internal", org: "Internal", scope: "all", status: "Active" },
  { id: "u4", name: "Ana R.", email: "ana@company.com", role: "Content Editor", type: "Internal", org: "Internal", scope: "own", status: "Active" },
  { id: "u5", name: "Liam B.", email: "liam@brightwave.co", role: "Agency Contributor", type: "External", org: "BrightWave Creative", scope: "own", status: "Active" },
  { id: "u6", name: "Zoe T.", email: "zoe@brightwave.co", role: "Agency Contributor", type: "External", org: "BrightWave Creative", scope: "own", status: "Invited" },
  { id: "u7", name: "Ravi K.", email: "ravi@pixelforge.io", role: "Agency Contributor", type: "External", org: "PixelForge Studio", scope: "own", status: "Active" },
  { id: "u8", name: "Nadia H.", email: "nadia@northstar.media", role: "Agency Contributor", type: "External", org: "NorthStar Media", scope: "own", status: "Active" },
];

// ---------- Build assets (with derived fields + seeded outcomes) ----------
const _assetSeed = [
  { t: "image", n: "Hero — Summer Product Shot", st: "approved", tags: ["product", "lifestyle", "summer", "hero"], size: "4.2 MB", dim: "4000×2667", by: "Priya S.", dl: 842 },
  { t: "video", n: "Brand Anthem 30s Cut", st: "review", tags: ["video", "brand", "anthem", "broadcast"], size: "128 MB", dim: "1920×1080", by: "Studio Team", dl: 311 },
  { t: "banner", n: "Q3 Sale Leaderboard 728×90", st: "approved", tags: ["banner", "display", "sale", "q3"], size: "84 KB", dim: "728×90", by: "Marcus L.", dl: 1204 },
  { t: "pamphlet", n: "Product Brochure — Trifold", st: "draft", tags: ["print", "brochure", "trifold", "sales"], size: "9.1 MB", dim: "A4", by: "Design Team", dl: 97 },
  { t: "design", n: "Instagram Carousel Template", st: "approved", tags: ["social", "instagram", "template", "carousel"], size: "3.4 MB", dim: "1080×1080", by: "Ana R.", dl: 658 },
  { t: "image", n: "Team Portrait — Leadership", st: "approved", tags: ["people", "corporate", "headshot"], size: "5.8 MB", dim: "3000×2000", by: "Photo Desk", dl: 214 },
  { t: "banner", n: "Retargeting Banner 300×250", st: "approved", tags: ["banner", "display", "retargeting"], size: "62 KB", dim: "300×250", by: "Marcus L.", dl: 988 },
  { t: "video", n: "Product Demo — How it Works", st: "approved", tags: ["video", "demo", "tutorial", "product"], size: "212 MB", dim: "1920×1080", by: "Studio Team", dl: 540 },
  { t: "pamphlet", n: "Event Flyer — Launch Party", st: "review", tags: ["print", "flyer", "event", "launch"], size: "6.3 MB", dim: "A5", by: "Ana R.", dl: 45 },
  { t: "design", n: "Email Header — Newsletter", st: "approved", tags: ["email", "header", "newsletter"], size: "1.1 MB", dim: "600×200", by: "Design Team", dl: 733 },
  { t: "image", n: "Packaging Mockup — Front", st: "approved", tags: ["product", "packaging", "mockup"], size: "7.2 MB", dim: "3500×3500", by: "Priya S.", dl: 402 },
  { t: "document", n: "Brand Guidelines 2026.pdf", st: "approved", tags: ["brand", "guidelines", "reference"], size: "14 MB", dim: "PDF · 48pp", by: "Brand Team", dl: 1567 },
  { t: "banner", n: "Billboard — Highway 4000×1400", st: "review", tags: ["ooh", "billboard", "print", "large"], size: "48 MB", dim: "4000×1400", by: "Design Team", dl: 23 },
  { t: "design", n: "Pitch Deck Master", st: "approved", tags: ["presentation", "deck", "sales", "template"], size: "22 MB", dim: "16:9", by: "Marcus L.", dl: 611 },
  { t: "image", n: "Lifestyle — Outdoor Campaign", st: "draft", tags: ["lifestyle", "outdoor", "campaign"], size: "6.0 MB", dim: "4500×3000", by: "Photo Desk", dl: 12 },
  { t: "video", n: "Social Teaser 9:16", st: "approved", tags: ["social", "vertical", "teaser", "reels"], size: "64 MB", dim: "1080×1920", by: "Ana R.", dl: 820 },
];

const _assetDates = ["2026-07-10", "2026-06-22", "2026-06-01", "2026-05-18", "2026-05-02", "2026-04-15", "2026-03-30",
  "2025-12-11", "2025-11-20", "2025-10-05", "2025-09-14", "2025-08-01", "2025-06-25", "2024-12-19", "2024-10-08", "2024-07-30"];
const _assetOrgs = ["Internal", "BrightWave Creative", "PixelForge Studio", "BrightWave Creative", "NorthStar Media", "Internal",
  "PixelForge Studio", "BrightWave Creative", "NorthStar Media", "Internal", "PixelForge Studio", "Internal",
  "NorthStar Media", "BrightWave Creative", "PixelForge Studio", "NorthStar Media"];
const _assetClass = [
  ["Electronic", "Images"], ["Videos", "Brand Film"], ["Electronic", "Banners"], ["Print", "Pamphlets"],
  ["Electronic", "Social"], ["Electronic", "Images"], ["Electronic", "Banners"], ["Videos", "Demo & Explainer"],
  ["Print", "Flyers"], ["Electronic", "Email"], ["Print", "Packaging"], ["Electronic", "Documents"],
  ["Print", "Billboards / OOH"], ["Electronic", "Presentations"], ["Electronic", "Images"], ["Videos", "Social Video"],
];

// rows: [channel, impressions, views, clicks, engagements, conversions, spend, revenue, auto?]
const _seed = {
  1: [["YouTube", 0, 128000, 3400, 9800, 210, 4200, 21000, 1], ["Meta / Facebook", 540000, 96000, 5100, 14300, 180, 3800, 19800, 1]],
  2: [["Google Ads", 1240000, 0, 14800, 0, 640, 5200, 70400, 1], ["Website / Display", 420000, 0, 3900, 0, 150, 1600, 15000, 0]],
  4: [["Instagram", 210000, 0, 6200, 24000, 320, 2100, 35200, 1]],
  6: [["Google Ads", 880000, 0, 9700, 0, 410, 3100, 45100, 1]],
  7: [["YouTube", 0, 212000, 8800, 15600, 520, 6400, 62400, 1]],
  9: [["Email", 0, 88000, 12400, 0, 940, 0, 94000, 0]],
  15: [["TikTok", 0, 342000, 7200, 41000, 280, 2600, 30800, 1], ["Instagram", 180000, 64000, 3100, 18000, 120, 1400, 14400, 1]],
};

export function buildAssets() {
  const assets = _assetSeed.map((a, i) => ({
    ...a,
    date: _assetDates[i % _assetDates.length],
    year: _assetDates[i % _assetDates.length].slice(0, 4),
    org: _assetOrgs[i % _assetOrgs.length],
    cat: _assetClass[i % _assetClass.length][0],
    sub: _assetClass[i % _assetClass.length][1],
    outcomes: [],
  }));
  Object.entries(_seed).forEach(([idx, rows]) => {
    assets[idx].outcomes = rows.map((r, k) => ({
      channel: r[0], date: ["2026-07-15", "2026-07-08", "2026-06-20"][k % 3],
      impressions: r[1], views: r[2], clicks: r[3], engagements: r[4],
      conversions: r[5], spend: r[6], revenue: r[7], auto: !!r[8],
    }));
  });
  return assets;
}
