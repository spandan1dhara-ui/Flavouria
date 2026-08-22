"""AI recipe generation + AI recipes flowing through shopping lists."""
import time

import pytest


# ---------------- POST /api/recipes/ai-generate ----------------
class TestAiGenerate:
    def test_requires_auth(self, api, anon):
        r = anon.post(f"{api}/recipes/ai-generate", json={"query": "Shorshe Ilish"})
        assert r.status_code == 401, r.text[:300]

    def test_empty_query_400(self, api, admin_client):
        r = admin_client.post(f"{api}/recipes/ai-generate", json={"query": "   "})
        assert r.status_code == 400, r.text[:300]

    @pytest.mark.parametrize("dish", ["Shorshe Ilish", "Aloo Posto"])
    def test_generates_regional_indian_dish(self, api, admin_client, dish):
        r = admin_client.post(f"{api}/recipes/ai-generate", json={"query": dish}, timeout=120)
        assert r.status_code == 200, r.text[:400]
        rec = r.json().get("recipe")
        assert rec, r.text[:300]
        assert isinstance(rec["id"], str) and rec["id"].startswith("ai-"), rec["id"]
        assert rec["title"] and isinstance(rec["title"], str)
        assert rec["source"] == "ai"
        assert rec["thumbnail"] is None
        assert isinstance(rec["servings"], int) and rec["servings"] >= 1
        assert isinstance(rec["cook_time"], int) and rec["cook_time"] >= 0
        assert rec.get("cuisine")

    def test_repeat_call_is_cached_and_fast(self, api, admin_client):
        dish = "Chingri Malai Curry"
        first = admin_client.post(f"{api}/recipes/ai-generate", json={"query": dish}, timeout=120)
        assert first.status_code == 200, first.text[:400]
        id1 = first.json()["recipe"]["id"]
        t0 = time.time()
        second = admin_client.post(f"{api}/recipes/ai-generate", json={"query": dish.lower()}, timeout=120)
        elapsed = time.time() - t0
        assert second.status_code == 200, second.text[:400]
        assert second.json()["recipe"]["id"] == id1, "cache should return same recipe id"
        assert elapsed < 10, f"cached call took {elapsed:.1f}s (expected fast)"


# ---------------- Regression: community lookup still works ----------------
class TestLookupRegression:
    @pytest.mark.parametrize("q,expected", [
        ("plain rice", "Steamed Plain Rice"),
        ("mutton kosha", "Kolkata Mutton Kosha"),
    ])
    def test_lookup_returns_seeded_recipe(self, api, anon, q, expected):
        r = anon.get(f"{api}/recipes/lookup", params={"q": q})
        assert r.status_code == 200, r.text[:300]
        titles = [x["title"] for x in r.json()["results"]]
        assert expected in titles, titles


# ---------------- AI recipe inside shopping lists ----------------
class TestAiRecipeInShoppingList:
    created = []

    @pytest.fixture(scope="class")
    def ai_recipe_doc(self, api, admin_client):
        r = admin_client.post(f"{api}/recipes/ai-generate", json={"query": "Shorshe Ilish"}, timeout=120)
        assert r.status_code == 200, r.text[:400]
        return r.json()["recipe"]

    @pytest.fixture(scope="class")
    def seeded_recipe_id(self, api, anon):
        r = anon.get(f"{api}/recipes/lookup", params={"q": "plain rice"})
        assert r.status_code == 200
        res = [x for x in r.json()["results"] if x["title"] == "Steamed Plain Rice"]
        assert res, r.text[:300]
        return res[0]["id"]

    @pytest.fixture(scope="class", autouse=True)
    def cleanup(self, api, admin_client):
        yield
        for lid in TestAiRecipeInShoppingList.created:
            admin_client.delete(f"{api}/shopping-lists/{lid}")

    def test_mixed_list_with_ai_recipe_scales(self, api, admin_client, ai_recipe_doc, seeded_recipe_id):
        pax = ai_recipe_doc["servings"] + ai_recipe_doc["servings"] // 2  # 1.5x when servings=4 -> 6
        payload = {"name": "TEST_ai_mixed", "items": [
            {"recipe_id": ai_recipe_doc["id"], "pax": pax},
            {"recipe_id": seeded_recipe_id, "pax": 2},
        ]}
        r = admin_client.post(f"{api}/shopping-lists", json=payload, timeout=60)
        assert r.status_code == 200, r.text[:400]
        lst = r.json()["list"]
        TestAiRecipeInShoppingList.created.append(lst["id"])

        titles = [x["title"] for x in lst["recipes"]]
        assert ai_recipe_doc["title"] in titles, titles
        assert len(lst["recipes"]) == 2, lst["recipes"]
        assert lst["shopping_list"], "shopping list should not be empty"
        for item in lst["shopping_list"]:
            assert item.get("name")

        # persistence check
        g = admin_client.get(f"{api}/shopping-lists/{lst['id']}")
        assert g.status_code == 200
        assert g.json()["list"]["shopping_list"] == lst["shopping_list"]

    def test_scaling_factor_applied(self, api, admin_client, ai_recipe_doc):
        base = ai_recipe_doc["servings"]
        r1 = admin_client.post(f"{api}/shopping-lists", json={
            "name": "TEST_ai_base", "items": [{"recipe_id": ai_recipe_doc["id"], "pax": base}]}, timeout=60)
        r2 = admin_client.post(f"{api}/shopping-lists", json={
            "name": "TEST_ai_double", "items": [{"recipe_id": ai_recipe_doc["id"], "pax": base * 2}]}, timeout=60)
        assert r1.status_code == 200 and r2.status_code == 200, (r1.text[:200], r2.text[:200])
        l1, l2 = r1.json()["list"], r2.json()["list"]
        TestAiRecipeInShoppingList.created += [l1["id"], l2["id"]]

        def numeric(lst):
            out = {}
            for i in lst["shopping_list"]:
                try:
                    out[i["name"]] = float(str(i.get("quantity", "")).strip())
                except ValueError:
                    continue
            return out

        a, b = numeric(l1), numeric(l2)
        shared = [k for k in a if k in b and a[k] > 0]
        assert shared, f"no numeric quantities to compare: {l1['shopping_list']}"
        for k in shared:
            assert b[k] == pytest.approx(a[k] * 2, rel=0.15), f"{k}: {a[k]} -> {b[k]} (expected 2x)"

    def test_cooking_guide_for_ai_list(self, api, admin_client, ai_recipe_doc):
        r = admin_client.post(f"{api}/shopping-lists", json={
            "name": "TEST_ai_guide", "items": [{"recipe_id": ai_recipe_doc["id"], "pax": 4}]}, timeout=60)
        assert r.status_code == 200, r.text[:300]
        lid = r.json()["list"]["id"]
        TestAiRecipeInShoppingList.created.append(lid)

        g = admin_client.post(f"{api}/shopping-lists/{lid}/cooking-guide", timeout=180)
        assert g.status_code == 200, g.text[:400]
        guide = g.json()["cooking_guide"]
        steps = guide.get("steps") if isinstance(guide, dict) else guide
        assert isinstance(steps, list) and len(steps) > 0, guide

        t0 = time.time()
        g2 = admin_client.post(f"{api}/shopping-lists/{lid}/cooking-guide", timeout=180)
        elapsed = time.time() - t0
        assert g2.status_code == 200
        assert g2.json()["cooking_guide"] == guide, "cached guide should match"
        assert elapsed < 10, f"cached cooking-guide took {elapsed:.1f}s"

    def test_unknown_recipe_id_404(self, api, admin_client):
        r = admin_client.post(f"{api}/shopping-lists", json={
            "items": [{"recipe_id": "ai-does-not-exist", "pax": 2}]})
        assert r.status_code == 404, r.text[:300]
