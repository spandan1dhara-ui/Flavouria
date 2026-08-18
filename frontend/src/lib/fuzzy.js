import Fuse from "fuse.js";
import { api } from "./api";

let fusePromise = null;

async function loadFuse() {
  try {
    const { data } = await api.get("/search-terms", { timeout: 4000 });
    return new Fuse(data.terms || [], {
      threshold: 0.4,
      distance: 100,
      minMatchCharLength: 3,
      includeScore: true,
    });
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
export async function correctQuery(q) {
  const raw = (q || "").trim();
  if (!raw) return raw;
  let fuse = null;
  try {
    fuse = await Promise.race([
      getFuse(),
      new Promise((resolve) => setTimeout(() => resolve(null), 4000)),
    ]);
  } catch {
    fuse = null;
  }
  if (!fuse) return raw;
  const corrected = raw.split(/\s+/).map((tok) => {
    if (tok.length < 4) return tok;
    const res = fuse.search(tok, { limit: 1 });
    if (res.length && res[0].item) return res[0].item;
    return tok;
  });
  return corrected.join(" ");
}
