// Procedural SVG thumbnails — no external images. Used as fallbacks for non-image
// masters and seeded records. Returned as SVG markup strings (render via dangerouslySetInnerHTML).

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const MARK = (s, cx, cy) => `
  <circle cx="${cx}" cy="${cy - 13 * s}" r="${7 * s}" fill="#F2B705"/>
  <path d="M${cx} ${cy - 4 * s} C${cx - 14 * s} ${cy - 4 * s} ${cx - 19 * s} ${cy + 14 * s} ${cx - 13 * s} ${cy + 22 * s}
           C${cx - 5 * s} ${cy + 16 * s} ${cx - 2 * s} ${cy + 6 * s} ${cx} ${cy - 4 * s}Z" fill="#1B8A6B"/>
  <path d="M${cx} ${cy - 4 * s} C${cx + 14 * s} ${cy - 4 * s} ${cx + 19 * s} ${cy + 14 * s} ${cx + 13 * s} ${cy + 22 * s}
           C${cx + 5 * s} ${cy + 16 * s} ${cx + 2 * s} ${cy + 6 * s} ${cx} ${cy - 4 * s}Z" fill="#12705A"/>
  <rect x="${cx - 1.6 * s}" y="${cy - 2 * s}" width="${3.2 * s}" height="${24 * s}" rx="${1.6 * s}" fill="#0E3F31"/>`;

const lines = (x, y, w, n, gap, c = "#D8E3DF", h = 3) =>
  Array.from({ length: n }, (_, i) => `<rect x="${x}" y="${y + i * gap}" width="${w * (i % 3 === 2 ? 0.62 : 1)}" height="${h}" rx="1.5" fill="${c}"/>`).join("");

const T = {};
T.logo2d = () => `<rect width="160" height="100" fill="#6B4CE0"/><path d="M0 62 C40 40 60 78 110 46 L160 30 L160 100 L0 100Z" fill="#3FBF9A" opacity=".9"/><text x="16" y="46" font-family="Helvetica" font-size="20" font-weight="700" fill="#3FE0B0">TrustLab</text><text x="16" y="64" font-family="Helvetica" font-size="15" font-weight="700" fill="#F2E24B">DIAGNOSTICS</text>`;
T.logo3d = () => `<rect width="160" height="100" fill="#fff"/>${MARK(0.85, 44, 42)}<text x="72" y="46" font-family="Helvetica" font-size="15" font-weight="700" fill="#12705A">TrustLab</text><text x="72" y="60" font-family="Helvetica" font-size="10" font-weight="700" fill="#E0A800">DIAGNOSTICS</text>`;
T.symbol = () => `<rect width="160" height="100" fill="#fff"/>${MARK(1.25, 80, 44)}`;
T.mono = () => `<rect width="160" height="100" fill="#F2F5F4"/><g style="filter:grayscale(1)"><circle cx="80" cy="31" r="9" fill="#5B6B78"/><path d="M80 44 C62 44 56 66 63 76 C73 69 77 57 80 44Z" fill="#8A9AA3"/><path d="M80 44 C98 44 104 66 97 76 C87 69 83 57 80 44Z" fill="#6E7E88"/><rect x="78" y="46" width="4" height="30" rx="2" fill="#3C4A52"/></g>`;
T.rev = () => `<rect width="160" height="100" fill="#0E3F31"/><circle cx="80" cy="31" r="9" fill="#F2B705"/><path d="M80 44 C62 44 56 66 63 76 C73 69 77 57 80 44Z" fill="#3FBF9A"/><path d="M80 44 C98 44 104 66 97 76 C87 69 83 57 80 44Z" fill="#2AA07E"/><rect x="78" y="46" width="4" height="30" rx="2" fill="#fff"/>`;
T.portrait = () => `<rect width="160" height="100" fill="#DDE7E3"/><rect x="52" y="0" width="56" height="100" fill="#C9D9D4"/><circle cx="80" cy="38" r="17" fill="#8C6A52"/><path d="M80 20 C68 20 64 30 66 38 C68 30 74 27 80 27 C86 27 92 30 94 38 C96 30 92 20 80 20Z" fill="#2A2118"/><path d="M52 100 C52 74 66 60 80 60 C94 60 108 74 108 100Z" fill="#20303A"/><path d="M74 62 L80 76 L86 62 L92 66 L80 88 L68 66Z" fill="#F5F7F6"/>`;
T.facility = () => `<rect width="160" height="100" fill="#E8F0EE"/><rect x="14" y="34" width="132" height="54" fill="#fff" stroke="#CBDAD5"/><rect x="14" y="24" width="132" height="12" fill="#12705A"/><rect x="26" y="46" width="30" height="30" rx="3" fill="#DDEDE7"/><rect x="64" y="46" width="30" height="30" rx="3" fill="#DDEDE7"/><rect x="102" y="46" width="30" height="30" rx="3" fill="#DDEDE7"/>${MARK(0.34, 80, 16)}`;
T.swatch = () => `<rect width="160" height="100" fill="#fff"/><rect x="14" y="20" width="30" height="60" rx="4" fill="#0E3F31"/><rect x="50" y="20" width="30" height="60" rx="4" fill="#1B8A6B"/><rect x="86" y="20" width="30" height="60" rx="4" fill="#F2B705"/><rect x="122" y="20" width="24" height="60" rx="4" fill="#E4F2ED"/>`;
T.type = () => `<rect width="160" height="100" fill="#fff"/><text x="20" y="66" font-family="Georgia" font-size="46" fill="#0E3F31">Aa</text><text x="88" y="44" font-family="Helvetica" font-size="11" font-weight="700" fill="#1B8A6B">Poppins</text><text x="88" y="62" font-family="Georgia" font-size="11" fill="#6B8078">Lora</text>`;
T.icons = () => `<rect width="160" height="100" fill="#fff"/><g fill="none" stroke="#12705A" stroke-width="2.4"><circle cx="42" cy="34" r="10"/><rect x="70" y="24" width="20" height="20" rx="4"/><path d="M110 44 l10-20 10 20Z"/><path d="M32 66h20M42 56v20"/><path d="M70 66c5-8 15-8 20 0-5 8-15 8-20 0Z"/><circle cx="120" cy="66" r="9"/></g>`;
T.book = () => `<rect width="160" height="100" fill="#F2F5F4"/><rect x="44" y="10" width="72" height="80" rx="3" fill="#0E3F31"/><rect x="44" y="10" width="6" height="80" fill="#0A2E23"/>${MARK(0.42, 84, 36)}<rect x="62" y="66" width="40" height="3" rx="1.5" fill="#3FBF9A"/><rect x="68" y="74" width="28" height="3" rx="1.5" fill="#2A6E5C"/>`;
T.hoarding = () => `<rect width="160" height="100" fill="#CFE0DA"/><rect x="6" y="12" width="148" height="62" rx="3" fill="#0E3F31"/><path d="M6 42 C40 26 70 60 110 38 L154 26 L154 74 L6 74Z" fill="#12705A"/><text x="16" y="34" font-family="Helvetica" font-size="10" font-weight="700" fill="#fff">Everything Else</text><text x="16" y="46" font-family="Helvetica" font-size="10" font-weight="700" fill="#F2B705">Depends on it.</text><rect x="34" y="74" width="6" height="20" fill="#94A8A2"/><rect x="120" y="74" width="6" height="20" fill="#94A8A2"/>`;
T.social = () => `<rect width="160" height="100" fill="#FBF4E2"/><rect x="0" y="0" width="160" height="16" fill="#F2B705"/><text x="10" y="38" font-family="Georgia" font-size="14" font-style="italic" fill="#12705A">Dad's Health</text><text x="10" y="52" font-family="Georgia" font-size="14" font-style="italic" fill="#12705A">Matters</text><g fill="#D9534F"><circle cx="96" cy="36" r="6"/><circle cx="114" cy="36" r="6"/><circle cx="132" cy="36" r="6"/></g><g fill="#3FBF9A"><circle cx="96" cy="54" r="6"/><circle cx="114" cy="54" r="6"/><circle cx="132" cy="54" r="6"/></g><rect x="10" y="76" width="44" height="13" rx="6.5" fill="#12705A"/>`;
T.banner = () => `<rect width="160" height="100" fill="#fff"/><rect x="8" y="18" width="144" height="26" rx="4" fill="#12705A"/><rect x="8" y="50" width="98" height="18" rx="4" fill="#E4F2ED"/><rect x="112" y="50" width="40" height="18" rx="4" fill="#F2B705"/><rect x="8" y="74" width="60" height="12" rx="4" fill="#EFF4F2"/>`;
T.pamphlet = () => `<rect width="160" height="100" fill="#EDF2F0"/><rect x="34" y="8" width="92" height="84" rx="3" fill="#fff" stroke="#D8E3DF"/><rect x="34" y="8" width="92" height="20" fill="#12705A"/>${MARK(0.3, 46, 17)}${lines(44, 36, 72, 7, 7)}<rect x="44" y="78" width="34" height="9" rx="4.5" fill="#F2B705"/>`;
T.standee = () => `<rect width="160" height="100" fill="#E8EEEC"/><rect x="58" y="6" width="44" height="88" rx="3" fill="#0E3F31"/>${MARK(0.32, 80, 20)}<rect x="66" y="40" width="28" height="4" rx="2" fill="#3FBF9A"/><rect x="66" y="48" width="20" height="4" rx="2" fill="#F2B705"/>${lines(66, 58, 28, 3, 7, "#2A6E5C", 2.5)}`;
T.video = () => `<rect width="160" height="100" fill="#12211D"/><path d="M0 70 C40 50 70 84 110 58 L160 44 L160 100 L0 100Z" fill="#17372E"/><circle cx="80" cy="46" r="18" fill="rgba(255,255,255,.14)"/><path d="M75 38 L91 46 L75 54Z" fill="#fff"/><rect x="12" y="84" width="136" height="3" rx="1.5" fill="rgba(255,255,255,.2)"/><rect x="12" y="84" width="48" height="3" rx="1.5" fill="#F2B705"/>`;
T.audio = () => `<rect width="160" height="100" fill="#0E3F31"/><g fill="#3FBF9A">${Array.from({ length: 22 }, (_, i) => { const h = 8 + Math.abs(Math.sin(i * 1.1)) * 44; return `<rect x="${12 + i * 6.4}" y="${50 - h / 2}" width="3.4" height="${h}" rx="1.7"/>`; }).join("")}</g>`;
T.detailer = () => `<rect width="160" height="100" fill="#EDF2F0"/><rect x="20" y="10" width="120" height="80" rx="3" fill="#fff" stroke="#D8E3DF"/><rect x="20" y="10" width="120" height="16" fill="#2D6DA8"/><circle cx="44" cy="48" r="13" fill="#FBEAE8"/>${lines(66, 38, 62, 5, 8)}<rect x="27" y="76" width="106" height="7" rx="3.5" fill="#E6EFF7"/>`;
T.ratecard = () => `<rect width="160" height="100" fill="#fff"/><rect x="16" y="12" width="128" height="14" fill="#0E3F31"/>${Array.from({ length: 5 }, (_, i) => `<rect x="16" y="${32 + i * 11}" width="128" height="8" fill="${i % 2 ? "#F4F7F6" : "#fff"}"/><rect x="22" y="${34 + i * 11}" width="52" height="4" rx="2" fill="#C7D6D1"/><rect x="112" y="${34 + i * 11}" width="26" height="4" rx="2" fill="#1B8A6B"/>`).join("")}`;
T.kit = () => `<rect width="160" height="100" fill="#EDF2F0"/><rect x="22" y="34" width="52" height="46" rx="4" fill="#12705A"/><rect x="22" y="34" width="52" height="10" fill="#0E3F31"/><rect x="82" y="46" width="26" height="34" rx="3" fill="#fff" stroke="#D8E3DF"/><rect x="114" y="52" width="24" height="28" rx="3" fill="#F2B705"/>${MARK(0.24, 48, 58)}`;
T.file = () => `<rect width="160" height="100" fill="#F4F7F6"/><path d="M56 16 h34 l16 16 v52 a4 4 0 0 1-4 4 H56 a4 4 0 0 1-4-4 V20 a4 4 0 0 1 4-4Z" fill="#fff" stroke="#CBDAD5"/><path d="M90 16 v16 h16Z" fill="#DDE7E3"/><text x="62" y="62" font-family="Helvetica" font-size="13" font-weight="700" fill="#7A4A86">PSD</text>`;
T.vector = () => `<rect width="160" height="100" fill="#F4F7F6"/><path d="M40 74 L80 26 L120 74Z" fill="none" stroke="#1B8A6B" stroke-width="2"/><g fill="#fff" stroke="#0E3F31" stroke-width="2"><rect x="36" y="70" width="8" height="8"/><rect x="76" y="22" width="8" height="8"/><rect x="116" y="70" width="8" height="8"/></g>`;
T.letterhead = () => `<rect width="160" height="100" fill="#EDF2F0"/><rect x="40" y="6" width="80" height="88" fill="#fff" stroke="#D8E3DF"/>${MARK(0.28, 52, 18)}<rect x="48" y="26" width="64" height="1.5" fill="#F2B705"/>${lines(48, 36, 64, 7, 7)}<rect x="40" y="86" width="80" height="8" fill="#E4F2ED"/>`;
T.envelope = () => `<rect width="160" height="100" fill="#EDF2F0"/><rect x="24" y="26" width="112" height="52" rx="3" fill="#fff" stroke="#D8E3DF"/><path d="M24 26 L80 60 L136 26" fill="none" stroke="#CBDAD5" stroke-width="2"/>${MARK(0.24, 40, 40)}`;
T.card = () => `<rect width="160" height="100" fill="#EDF2F0"/><rect x="26" y="26" width="108" height="52" rx="5" fill="#fff" stroke="#D8E3DF"/>${MARK(0.26, 42, 42)}<rect x="60" y="38" width="46" height="4" rx="2" fill="#0E3F31"/><rect x="60" y="46" width="34" height="3" rx="1.5" fill="#9FB2AB"/><rect x="26" y="70" width="108" height="8" fill="#12705A"/>`;
T.folder = () => `<rect width="160" height="100" fill="#EDF2F0"/><path d="M30 22 h34 l8 8 h58 a4 4 0 0 1 4 4 v44 a4 4 0 0 1-4 4 H30 a4 4 0 0 1-4-4 V26 a4 4 0 0 1 4-4Z" fill="#12705A"/>${MARK(0.3, 80, 50)}`;
T.report = () => `<rect width="160" height="100" fill="#EDF2F0"/><rect x="38" y="6" width="84" height="88" fill="#fff" stroke="#D8E3DF"/><rect x="38" y="6" width="84" height="14" fill="#0E3F31"/>${Array.from({ length: 6 }, (_, i) => `<rect x="44" y="${38 + i * 8}" width="34" height="3" rx="1.5" fill="#D8E3DF"/><rect x="84" y="${38 + i * 8}" width="14" height="3" rx="1.5" fill="#1B8A6B"/>`).join("")}<rect x="44" y="88" width="72" height="2" fill="#F2B705"/>`;
T.reportcover = () => `<rect width="160" height="100" fill="#EDF2F0"/><rect x="42" y="6" width="76" height="88" fill="#12705A"/>${MARK(0.4, 80, 34)}<rect x="56" y="62" width="48" height="3" rx="1.5" fill="#3FBF9A"/><rect x="64" y="70" width="32" height="3" rx="1.5" fill="#F2B705"/>`;
T.form = () => `<rect width="160" height="100" fill="#EDF2F0"/><rect x="38" y="6" width="84" height="88" fill="#fff" stroke="#D8E3DF"/><rect x="44" y="14" width="40" height="4" rx="2" fill="#0E3F31"/>${Array.from({ length: 6 }, (_, i) => `<rect x="44" y="${28 + i * 10}" width="24" height="3" rx="1.5" fill="#C7D6D1"/><rect x="72" y="${25 + i * 10}" width="44" height="9" rx="2" fill="#F4F7F6" stroke="#E2EAE7"/>`).join("")}`;
T.ppt = () => `<rect width="160" height="100" fill="#E8EEEC"/><rect x="14" y="16" width="132" height="70" rx="3" fill="#fff" stroke="#D8E3DF"/><rect x="14" y="16" width="132" height="16" fill="#0E3F31"/><rect x="24" y="42" width="52" height="34" rx="3" fill="#E4F2ED"/>${lines(86, 44, 50, 5, 7)}`;
T.idcard = () => `<rect width="160" height="100" fill="#EDF2F0"/><rect x="70" y="0" width="20" height="14" fill="#0E3F31"/><rect x="52" y="14" width="56" height="80" rx="6" fill="#fff" stroke="#D8E3DF"/><rect x="52" y="14" width="56" height="16" rx="6" fill="#12705A"/><circle cx="80" cy="48" r="12" fill="#DDE7E3"/><rect x="62" y="66" width="36" height="3.5" rx="1.75" fill="#0E3F31"/><rect x="62" y="82" width="36" height="7" rx="2" fill="#F2B705"/>`;
T.coat = () => `<rect width="160" height="100" fill="#EDF2F0"/><path d="M62 16 l-22 10 -6 26 12 4 4-14 v42 h60 v-42 l4 14 12-4 -6-26 -22-10 -18 12Z" fill="#fff" stroke="#CBDAD5" stroke-width="1.5"/>${MARK(0.2, 100, 40)}`;
T.tshirt = () => `<rect width="160" height="100" fill="#EDF2F0"/><path d="M62 14 l-24 12 8 16 10-4 v46 h48 v-46 l10 4 8-16 -24-12 -18 10Z" fill="#12705A"/>${MARK(0.26, 80, 50)}`;
T.bag = () => `<rect width="160" height="100" fill="#EDF2F0"/><path d="M64 24 a16 12 0 0 1 32 0" fill="none" stroke="#0E3F31" stroke-width="2.5"/><rect x="48" y="24" width="64" height="62" rx="3" fill="#1B8A6B"/>${MARK(0.3, 80, 52)}`;
T.label = () => `<rect width="160" height="100" fill="#EDF2F0"/><rect x="30" y="30" width="100" height="42" rx="4" fill="#fff" stroke="#D8E3DF"/><g fill="#0E3F31">${Array.from({ length: 22 }, (_, i) => `<rect x="${38 + i * 3.4}" y="38" width="${i % 3 ? 1.4 : 2.4}" height="18"/>`).join("")}</g><rect x="38" y="60" width="52" height="4" rx="2" fill="#9FB2AB"/>`;
T.kitbox = () => `<rect width="160" height="100" fill="#EDF2F0"/><path d="M40 34 l40-14 40 14 v42 l-40 14 -40-14Z" fill="#fff" stroke="#CBDAD5"/><path d="M40 34 l40 14 40-14" fill="none" stroke="#CBDAD5"/>${MARK(0.22, 58, 58)}`;
T.signage = () => `<rect width="160" height="100" fill="#D7E4E9"/><rect x="0" y="52" width="160" height="48" fill="#EAF0EE"/><rect x="16" y="24" width="128" height="26" rx="3" fill="#0E3F31"/>${MARK(0.26, 32, 37)}<text x="50" y="35" font-family="Helvetica" font-size="10" font-weight="700" fill="#fff">TrustLab</text><rect x="52" y="62" width="26" height="38" fill="#fff"/><rect x="86" y="62" width="26" height="38" fill="#fff"/>`;
T.backdrop = () => `<rect width="160" height="100" fill="#E4F2ED"/><rect x="10" y="10" width="140" height="60" rx="3" fill="#12705A"/><path d="M10 46 C46 32 74 62 116 42 L150 32 L150 70 L10 70Z" fill="#0E3F31"/>${MARK(0.36, 44, 34)}<rect x="10" y="70" width="140" height="6" fill="#B6C7C1"/>`;
T.wayfind = () => `<rect width="160" height="100" fill="#EDF2F0"/><rect x="26" y="26" width="108" height="20" rx="3" fill="#0E3F31"/><path d="M36 36 l10-6 v12Z" fill="#F2B705"/><rect x="52" y="34" width="52" height="4" rx="2" fill="#fff"/><rect x="26" y="52" width="108" height="20" rx="3" fill="#1B8A6B"/><rect x="52" y="60" width="42" height="4" rx="2" fill="#fff"/>`;
T.mark = () => `<rect width="160" height="100" fill="#fff"/><circle cx="80" cy="46" r="26" fill="none" stroke="#7A4A86" stroke-width="3"/><text x="80" y="52" text-anchor="middle" font-family="Helvetica" font-size="16" font-weight="700" fill="#7A4A86">NABL</text><text x="80" y="84" text-anchor="middle" font-family="Helvetica" font-size="7" fill="#8A7A90">ACCREDITED</text>`;
T.cert = () => `<rect width="160" height="100" fill="#F4F2F6"/><rect x="34" y="8" width="92" height="84" fill="#fff" stroke="#DCD2E0"/><rect x="44" y="20" width="72" height="4" rx="2" fill="#7A4A86"/>${lines(44, 34, 72, 5, 8, "#E0D6E4")}<circle cx="106" cy="76" r="11" fill="#F1E9F3" stroke="#7A4A86" stroke-width="1.5"/>`;
T.email = () => `<rect width="160" height="100" fill="#F4F7F6"/><rect x="24" y="18" width="112" height="66" rx="4" fill="#fff" stroke="#D8E3DF"/><rect x="24" y="18" width="112" height="18" rx="4" fill="#12705A"/><rect x="34" y="46" width="92" height="18" rx="3" fill="#E4F2ED"/><rect x="34" y="70" width="40" height="8" rx="4" fill="#F2B705"/>`;
T.whatsapp = () => `<rect width="160" height="100" fill="#DCE9E2"/><rect x="30" y="14" width="100" height="72" rx="8" fill="#fff" stroke="#CBDAD5"/><rect x="38" y="24" width="60" height="20" rx="6" fill="#EFF4F2"/><rect x="62" y="50" width="60" height="26" rx="6" fill="#D9F0DF"/>`;
T.appstore = () => `<rect width="160" height="100" fill="#0E3F31"/><rect x="56" y="10" width="48" height="80" rx="8" fill="#fff"/><rect x="60" y="20" width="40" height="52" rx="3" fill="#E4F2ED"/>${MARK(0.26, 80, 40)}<circle cx="80" cy="80" r="5" fill="#DDE7E3"/>`;
T.screen = () => `<rect width="160" height="100" fill="#EDF2F0"/><rect x="14" y="14" width="132" height="62" rx="4" fill="#0E3F31"/><path d="M14 52 C50 38 80 66 120 46 L146 36 L146 76 L14 76Z" fill="#12705A"/><rect x="70" y="80" width="20" height="10" fill="#B6C7C1"/>`;

export const thumbSvg = (name) => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice">${(T[name] || T.file)()}</svg>`;

export const fileBadge = (ext) => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice">
  <rect width="160" height="100" fill="#F4F7F6"/>
  <path d="M54 14 h36 l18 18 v54 a4 4 0 0 1-4 4 H54 a4 4 0 0 1-4-4 V18 a4 4 0 0 1 4-4Z" fill="#fff" stroke="#CBDAD5"/>
  <path d="M90 14 v18 h18Z" fill="#DDE7E3"/>
  <text x="80" y="66" text-anchor="middle" font-family="Helvetica" font-size="15" font-weight="700" fill="#12705A">${esc((ext || "FILE").slice(0, 5))}</text></svg>`;

export const brandmark = (s = 1.55, cx = 50, cy = 44) => `<svg viewBox="10 8 80 84">${MARK(s, cx, cy)}</svg>`;

// Best preview markup for an asset: real image preview, else a file badge / type thumb.
export function previewMarkup(a) {
  if (a.preview) return `<img src="${esc(a.preview)}" alt="${esc(a.name)}">`;
  if (a.master && a.master.mime && a.master.mime.startsWith("image/") && a.preview === null) return fileBadge(a.master.ext);
  if (a.master) return fileBadge(a.master.ext);
  if (a.thumb) return thumbSvg(a.thumb);
  return fileBadge("FILE");
}

// Map an asset type/channel to a procedural thumbnail name (for records without an image preview).
export function guessThumb(type, channel) {
  const t = (type || "").toLowerCase();
  const map = {
    hoarding: "hoarding", unipole: "hoarding", "bus shelter": "hoarding", standee: "standee",
    "social post": "social", "social story": "social", "web banner": "banner", "email creative": "email",
    "whatsapp creative": "whatsapp", "app store asset": "appstore", "in-clinic screen loop": "screen",
    pamphlet: "pamphlet", leaflet: "pamphlet", "package flyer": "pamphlet", poster: "pamphlet",
    letterhead: "letterhead", envelope: "envelope", "visiting card": "card", folder: "folder",
    "report sheet": "report", "report cover": "reportcover", "requisition form": "form", "consent form": "form",
    "presentation master": "ppt", "id card": "idcard", "lab coat": "coat", "field uniform": "coat",
    "carry bag": "bag", "t-shirt": "tshirt", "specimen label": "label", "barcode label": "label",
    "collection kit": "kitbox", "transport box": "kitbox", "branch fascia": "signage",
    "reception backdrop": "backdrop", wayfinding: "wayfind", "doctor detailer": "detailer",
    "rate card": "ratecard", "test menu": "ratecard", "camp kit": "kit", "corporate tie-up kit": "kit",
    "campaign film": "video", reel: "video", testimonial: "video", "animated explainer": "video",
    "radio spot": "audio", "nabl mark": "mark", "iso mark": "mark", "partner mark": "mark",
    "accreditation certificate": "cert", licence: "cert", "scope document": "cert",
    "2d primary": "logo2d", "3d lockup": "logo3d", "symbol only": "symbol", monochrome: "mono", reversed: "rev",
    "colour palette": "swatch", "typeface package": "type", "icon set": "icons", "brand book": "book",
    "leadership portrait": "portrait", "facility photography": "facility", "vector master": "vector",
    "layered source": "file", "packaged artwork": "file",
  };
  return map[t] || (channel === "Print" ? "pamphlet" : channel === "Physical Goods" ? "bag" : "banner");
}
