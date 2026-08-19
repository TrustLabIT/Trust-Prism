// TrustMark taxonomy — assets are classified by the JOB they do, not media type.
// 4 domains → sub-modules → types. This is the source of truth the backend validates against;
// the frontend keeps a matching copy for rendering, and /api/taxonomy serves this to clients.

const DOMAINS = [
  {
    id: "foundation", name: "Brand Foundation", color: "#16624C", tint: "#E4F2ED",
    note: "The identity system itself — the source of truth everything else is built from.",
    test: "Would it still exist if you ran zero campaigns this year?",
    subs: [
      { id: "logo", name: "Logo System", types: ["2D Primary", "3D Lockup", "Symbol Only", "Monochrome", "Reversed", "Co-brand Lockup"] },
      { id: "colourtype", name: "Colour & Typography", types: ["Colour Palette", "Typeface Package", "Type Hierarchy Sheet"] },
      { id: "photo", name: "Corporate Photography", types: ["Leadership Portrait", "Facility Photography", "Equipment Photography", "Staff Photography"] },
      { id: "graphic", name: "Graphic Language", types: ["Icon Set", "Illustration Style", "Background Motif"] },
      { id: "guidelines", name: "Brand Guidelines", types: ["Brand Book", "Co-branding Rules", "Do & Don't Sheet"] },
    ],
  },
  {
    id: "demand", name: "Demand Generation", color: "#B98604", tint: "#FDF3D6",
    note: "Everything produced to win a customer — consumer, referring doctor or corporate.",
    test: "Is its job to persuade someone outside the company to choose TrustLab?",
    subs: [
      { id: "digital", name: "Digital Media", types: ["Social Post", "Social Story", "Web Banner", "Email Creative", "WhatsApp Creative", "App Store Asset", "In-clinic Screen Loop"] },
      { id: "print", name: "Print Media", types: ["Pamphlet", "Leaflet", "Package Flyer", "Poster", "Press Ad", "Dangler", "Tent Card"] },
      { id: "ooh", name: "Out-of-Home", types: ["Hoarding", "Unipole", "Bus Shelter", "Standee", "Backlit Panel", "Vehicle Branding"] },
      { id: "motion", name: "Motion & Audio", types: ["Campaign Film", "Reel", "Testimonial", "Animated Explainer", "Radio Spot"] },
      { id: "trade", name: "Trade & Referral", types: ["Doctor Detailer", "Test Menu", "Rate Card", "Corporate Tie-up Kit", "Camp Kit"] },
      { id: "masters", name: "Source Masters", types: ["Layered Source", "Vector Master", "Packaged Artwork"] },
    ],
  },
  {
    id: "collateral", name: "Corporate Collateral", color: "#2D6DA8", tint: "#E6EFF7",
    note: "Applied identity — the brand as it appears while the business simply operates.",
    test: "Does it identify, deliver or run the service rather than sell it?",
    subs: [
      { id: "stationery", name: "Stationery", types: ["Letterhead", "Envelope", "Visiting Card", "Folder", "Compliment Slip", "Invoice Cover"] },
      { id: "documents", name: "Document Templates", types: ["Report Sheet", "Report Cover", "Requisition Form", "Consent Form", "Presentation Master", "Certificate Template"] },
      { id: "credentials", name: "Credentials & Uniform", types: ["ID Card", "Lanyard", "Lab Coat", "Field Uniform", "Name Badge"] },
      { id: "merch", name: "Merchandise", types: ["Carry Bag", "T-shirt", "Cap", "Pen", "Diary", "Gifting Item"] },
      { id: "packaging", name: "Packaging & Labels", types: ["Collection Kit", "Specimen Label", "Barcode Label", "Transport Box"] },
      { id: "environment", name: "Environment & Signage", types: ["Branch Fascia", "Reception Backdrop", "Wayfinding", "Door Vinyl", "Floor Graphic"] },
    ],
  },
  {
    id: "compliance", name: "Compliance & Accreditation", color: "#7A4A86", tint: "#F1E9F3",
    note: "Marks and certificates with legal usage conditions and hard expiry dates.",
    test: "Is it an accreditation mark or a regulatory certificate?",
    subs: [
      { id: "marks", name: "Accreditation Marks", types: ["NABL Mark", "ISO Mark", "Partner Mark"] },
      { id: "certs", name: "Certificates & Licences", types: ["Accreditation Certificate", "Licence", "Scope Document"] },
    ],
  },
];

const CHANNELS = ["Digital", "Print", "Out-of-Home", "Motion & Audio", "Physical Goods", "Source File"];
const STATUSES = ["Draft", "In review", "Approved", "Live", "Expired", "Archived"];
const DISTS = ["Public", "Partner-shareable", "Internal only"];
const AUDIENCES = ["Consumer", "Referring doctor", "Corporate", "Staff"];
const CAMPAIGNS = ["Always-on", "Father's Day 2026", "TrustWell Care Plans", "Preventive Health Drive", "Diabetes Awareness"];
const SERVICES = ["General", "Preventive", "Cardiac", "Diabetes", "Wellness packages", "Home collection"];
const GEOS = ["All centres", "Anantapur", "Hyderabad — Begumpet", "Kurnool"];
const LANGS = ["English", "Telugu", "Hindi"];
const SPECS = ["RGB", "CMYK + bleed", "Vector", "Print-ready"];

// lookups
const domain = (id) => DOMAINS.find((d) => d.id === id) || null;
const subOf = (dId, sId) => { const d = domain(dId); return d ? d.subs.find((s) => s.id === sId) || null : null; };

// validate a (domain, sub, type) triple is a real path in the taxonomy
function validPath(dId, sId, type) {
  const s = subOf(dId, sId);
  return !!(s && s.types.includes(type));
}

module.exports = {
  DOMAINS, CHANNELS, STATUSES, DISTS, AUDIENCES, CAMPAIGNS, SERVICES, GEOS, LANGS, SPECS,
  domain, subOf, validPath,
};
