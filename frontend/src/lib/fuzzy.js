import Fuse from "fuse.js";
import { api } from "./api";

let fusePromise = null;

// Only accept a correction when Fuse is highly confident (lower score = closer).
// 0.4 was far too loose and mapped valid dishes to wrong words
// (e.g. "paella" -> "mozzarella", "posto" -> "potato").
const STRONG_MATCH_SCORE = 0.3;

async function loadFuse() {
  try {
    const { data } = await api.get("/search-terms", { timeout: 4000 });
    const terms = data.terms || [];
    const vocab = new Set(terms.map((t) => t.toLowerCase()));
    // Keep a moderate threshold to surface candidates, but gate on score below.
    const fuse = new Fuse(terms, {
      threshold: 0.4,
      distance: 100,
      minMatchCharLength: 3,
      includeScore: true,
    });
    return { fuse, vocab };
  } catch {
    return null; // don't cache failure; allow retry next time
  }
}

function getFuse() {
  if (!fusePromise) {
    fusePromise = loadFuse().then((f) => {
      if (!f) fusePromise = null; // reset so a later search can retry
      return f;
    });
  }
  return fusePromise;
}

// Fuzzy typo-correction, e.g. "biriyani" -> "biryani", "piza" -> "pizza".
// Never blocks search: if the vocabulary can't be fetched, returns the query unchanged.
// Only corrects genuine typos: a word already in the vocabulary is left untouched,
// and only very close matches (strong score) are accepted.
export async function correctQuery(q) {
  const raw = (q || "").trim();
  if (!raw) return raw;
  let loaded = null;
  try {
    loaded = await Promise.race([
      getFuse(),
      new Promise((resolve) => setTimeout(() => resolve(null), 4000)),
    ]);
  } catch {
    loaded = null;
  }
  if (!loaded) return raw;
  const { fuse, vocab } = loaded;
  const corrected = raw.split(/\s+/).map((tok) => {
    if (tok.length < 4) return tok;
    // Already a valid recipe term? Never "correct" it.
    if (vocab.has(tok.toLowerCase())) return tok;
    const res = fuse.search(tok, { limit: 1 });
    const best = res[0];
    // Only accept a strong, confident correction; otherwise keep the original word.
    if (best && best.item && typeof best.score === "number" && best.score <= STRONG_MATCH_SCORE) {
      return best.item;
    }
    return tok;
  });
  return corrected.join(" ");
}
