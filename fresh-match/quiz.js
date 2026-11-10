import { FACE_Q, BODY_Q, INTENT_Q } from "./quizQuestions.js";
import { productBySlug } from "./catalog.js";
import {
  buildFace,
  buildBody,
  buildHero,
  buildPlaybook,
  buildInsight,
  ritualSections,
  partnerNotes,
  formatPartnerBrief,
  summarizeAnswers,
} from "./quizEngine.js";

export const PATHS = [
  { v: "skin", t: "Face, body, and hair", s: "How you wash, and the products you use every day" },
];

function wantsHair(answers) {
  const swaps = answers.swaps;
  if (!swaps || !Array.isArray(swaps)) return true;
  if (swaps.includes("auto") || swaps.length === 0) return true;
  return swaps.includes("shampoo") || swaps.includes("conditioner");
}

export function questionsFor(path, answers = {}) {
  const bodyQs = BODY_Q.filter((q) => q.id !== "hairType" || wantsHair(answers));
  return [...FACE_Q, ...bodyQs, INTENT_Q];
}

export function labeledAnswers(answers = {}, path) {
  return questionsFor(path, answers)
    .map((q) => {
      const raw = answers[q.id];
      if (raw == null || raw === "") return null;
      if (Array.isArray(raw) && raw.length === 0) return null;
      const values = Array.isArray(raw) ? raw : [raw];
      const labels = values.map((v) => q.options.find((o) => o.v === v)?.label || v);
      return { id: q.id, section: q.section, q: q.q, a: labels.join(" · ") };
    })
    .filter(Boolean);
}

function addSlugs(list, into) {
  (list || []).forEach((p) => {
    if (p?.slug && productBySlug(p.slug)) into.push(p.slug);
  });
}

export function runMatch(path, answers) {
  const face = buildFace(answers);
  const body = buildBody(answers);
  const supp = null;
  const hero = buildHero(answers, "skin", face, body, supp);
  const collected = [];
  if (face) {
    addSlugs(face.am, collected);
    addSlugs(face.pm, collected);
    addSlugs(face.weekly, collected);
  }
  addSlugs(body, collected);
  if (supp) {
    addSlugs(supp.daily, collected);
    addSlugs(supp.targeted, collected);
  }
  const slugs = [...new Set(collected)];
  const startSlugs = [...new Set((hero.items || []).map((p) => p.slug).filter((slug) => productBySlug(slug)))];
  const playbook = buildPlaybook(answers, "skin", hero, face, body, supp);
  const insight = buildInsight(answers, "skin", hero.items);
  const ritual = ritualSections(face, body, supp);
  const notes = partnerNotes(answers, "skin", playbook);
  const summary = summarizeAnswers(answers, "skin");
  return {
    slugs,
    startSlugs: startSlugs.length ? startSlugs : slugs.slice(0, 4),
    summary,
    hero,
    playbook,
    insight,
    ritual,
    notes,
    brief: formatPartnerBrief({ summary, hero, ritual, notes }),
  };
}

function fromBase64Url(str) {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const b64 = String(str || "").replace(/-/g, "+").replace(/_/g, "/") + pad;
  return decodeURIComponent(escape(atob(b64)));
}

export function readMatchFromLocation(loc = window.location) {
  try {
    const hash = loc.hash || "";
    const m = hash.match(/[#&]m=([^&]+)/);
    if (!m || !m[1]) return null;
    const data = JSON.parse(fromBase64Url(decodeURIComponent(m[1])));
    if (!data || data.v !== 1 || !data.path || typeof data.ans !== "object") return null;
    return { path: data.path, ans: data.ans || {}, name: typeof data.name === "string" ? data.name : "" };
  } catch {
    return null;
  }
}

export function hasQuizResults(person) {
  const a = person?.match?.answers;
  return !!(a && typeof a === "object" && Object.keys(a).length);
}

/** Rebuild the full match from saved answers, or fall back to what was stored. */
export function hydrateMatch(person) {
  const match = person?.match;
  if (!match) return null;
  if (hasQuizResults(person) && match.path) {
    try {
      return { ...runMatch(match.path, match.answers), savedAt: match.savedAt };
    } catch {
      /* use stored fields */
    }
  }
  return {
    slugs: match.slugs || [],
    startSlugs: match.startSlugs || [],
    summary: match.summary || "",
    hero: match.hero || null,
    ritual: match.ritual || [],
    notes: match.notes || [],
    insight: match.insight || "",
    brief: match.brief || "",
    savedAt: match.savedAt,
  };
}

export const PRIYA_QUIZ = {
  path: "both",
  answers: {
    skinType: "combo",
    concern: "dehydration",
    also: ["aging"],
    climate: "city",
    makeup: "sometimes",
    extras: ["lips"],
    depth: "full",
    swaps: ["auto", "deo"],
    bodySkin: "normal",
    bodyExtras: [],
    hairType: "normalHair",
    approach: "both",
    goals: ["immune"],
    lifestyle: ["stressed"],
    suppDepth: "balanced",
    intent: "starter",
  },
};

export { FACE, BODY, SUPP } from "./ringana-products.js";
export { supplementShareLines } from "./disclosures.js";
