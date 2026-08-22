# Flavouria — Product Requirements & State

## Product
Recipe discovery platform. Core loop: Search → Top 3 → Choose → Cook.
Stack: React (frontend) + FastAPI (backend) + MongoDB. Routes prefixed `/api`.
Preview: REACT_APP_BACKEND_URL in /app/frontend/.env.

## Key architecture
- Search Top-3 are YouTube-derived recipe cards (embedded video + AI summary/ingredients/method), ranked by views/likes/comment sentiment.
- Community explore via `/api/explore` ("More Recipes"), relevance-scored.
- Fuzzy typo correction at SearchBar navigation time (`/app/frontend/src/lib/fuzzy.js`, Fuse.js).
- Auth: JWT + Emergent Google auth. Admin: admin@flavouria.com / Flavouria@2026.
- Integrations: YouTube Data API (YOUTUBE_API_KEY), Emergent LLM key (Claude Sonnet 4.6) for recipe analysis.

## Implemented (latest — June 2026)
- **Multi-recipe Shopping List builder** (`/plan-meal`, login-required): search → select recipe → set pax → Add to List → View List popup (edit pax / remove) → Generate My List. Backend consolidates ingredients across recipes (merge by name+unit, scale by pax/servings) and saves per-user. Access via Profile > Shopping Lists → `/shopping-lists/:id`. "Start Cooking" generates an AI combined step-by-step plan (Claude Sonnet 4.6, `cooking_guide.py`) shown in Cook Mode. Endpoints: `/api/recipes/lookup`, `/api/shopping-lists` (POST/GET/GET{id}/DELETE), `/api/shopping-lists/{id}/cooking-guide`. Helpers `parse_qty`/`consolidate_ingredients` in server.py. Seeded example dishes: Steamed Plain Rice, Kolkata Mutton Kosha, Bhindi Fry. `seed()` is now an idempotent top-up. Shopping-list quantities rounded sensibly on display (counts → whole, grams → rounded).
- **Fuzzy correction fix**: strong Fuse score (≤0.3) only; never overwrites a valid vocabulary word. Fixed paella→mozzarella, aloo posto→aloo potato.
- **Categories redesign** (`pages/Categories.jsx`, backend `/api/categories`): curated 6 cuisine groups — Oriental (Chinese/Japanese/Korean/Thai/Vietnamese), Mediterranean, Indian (Oriya/Marathi/Bengali/South Indian/North Indian/Assamese), Italian, French, Mexican. Removed Dessert + standalone Bengali. Subtitle moved below the search bar. Empty cuisines show "Explore" instead of "0 recipes".
- **YouTube compilation filter** (`backend/youtube_agent.py`): `_is_compilation()` + COMPILATION_PATTERNS drop listicle/multi-recipe videos (e.g. "6 Top French Recipes You Need to Cook"). Filter is unconditional and also applied on cache reads (self-heals stale cache).
- **Plan your Meal** (NEW): nav tab `/plan-meal` (`pages/PlanMeal.jsx`). User enters a dish + pax; backend `GET /api/meal-plan?q=&pax=` finds the best matching recipe and returns a shopping list with each ingredient scaled by pax/base_servings (`scale_quantity()` in server.py). Copy list + view-recipe link; friendly fraction display; not-found state. pax clamped 1..100 (backend) / 1..50 (UI).
- Navbar links `whitespace-nowrap` to prevent wrapping.

## Testing
- iteration_4.json: 125/125 backend passing; all Plan-your-Meal & Categories frontend flows pass. Compilation-filter robustness gaps found and since fixed (unconditional filter + cache-read filtering + number-less listicle patterns).
- Backend suite: /app/backend/tests/test_meal_plan.py, test_search.py.

## Backlog / P1
- Seed Mediterranean/French/Mexican recipes (currently 0 community recipes; explorable via YouTube).
- Optional: render mixed fractions ("1 1/2") end-to-end; share scale_quantity clamps between UI/backend.
- Known noise: anonymous 401s on /api/auth/me and /api/youtube/saved (harmless).
