// Shared presentation helpers for the single-page Notes document
// (used by the live study workspace and the demo workspace).
export type NotesSectionKind = "intro" | "takeaway" | "practice" | "point";

export function sectionKind(heading: string, kind?: string | null): NotesSectionKind {
  if (kind === "practice" || /^\s*प्रैक्टिस/.test(heading)) return "practice";
  if (/^\s*निचोड़/.test(heading)) return "takeaway";
  if (/^\s*मुख्य विचार/.test(heading)) return "intro";
  return "point";
}

const LEAD_RE = /(उदाहरण|टिप|ट्रिक|नोट|याद रखें|ध्यान दें|मतलब|परिभाषा)\s*[:：]/g;

// Splits text into plain and emphasised parts so labels like "उदाहरण:" render bold/colored.
export function emphasizeLeads(text: string): { text: string; strong: boolean }[] {
  const parts: { text: string; strong: boolean }[] = [];
  let last = 0;
  for (const m of text.matchAll(LEAD_RE)) {
    const i = m.index;
    if (i > last) parts.push({ text: text.slice(last, i), strong: false });
    parts.push({ text: m[0], strong: true });
    last = i + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), strong: false });
  return parts;
}

// Demo data stores practice items as one "1) ... 2) ..." string; split into items.
export function splitPracticeItems(text: string): string[] {
  const parts = text.split(/(?=\d+\)\s)/).map((p) => p.trim()).filter(Boolean);
  return parts.length > 1 ? parts.map((p) => p.replace(/^\d+\)\s*/, "")) : [text];
}

// Box headings read naturally with a trailing colon ("निचोड़:").
export function boxHeading(heading: string): string {
  return /[:：]\s*$/.test(heading) ? heading : `${heading}:`;
}
