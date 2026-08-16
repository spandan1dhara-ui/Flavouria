"""Search + ranking (Top 3) tests — /api/search, /api/suggest-dish, /api/categories"""
import pytest


DEMO_QUERIES = ["butter chicken", "momos", "pasta", "pizza", "chocolate cake",
                "masala dosa", "chicken curry", "spicy chicken rice"]


class TestSearchTopThree:
    def test_root_health(self, anon, api):
        r = anon.get(f"{api}/")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_chicken_biryani_exact_top3(self, anon, api):
        r = anon.get(f"{api}/search", params={"q": "chicken biryani"})
        assert r.status_code == 200
        data = r.json()
        assert data["count"] == 3, data
        titles = [x["title"] for x in data["results"]]
        assert len(data["results"]) == 3
        assert data["results"][0]["rank"] == 1
        assert "Hyderabadi" in titles[0], titles
        assert "Aloo" in titles[1] or "Bengali" in titles[1], titles
        assert "Awadhi" in titles[2], titles
        for i, res in enumerate(data["results"]):
            assert res["rank"] == i + 1
            assert isinstance(res.get("why_its_here"), str) and res["why_its_here"]
            assert res["status"] == "PUBLISHED"
            assert res.get("creator") and res["creator"].get("display_name")
            assert "score_breakdown" in res
        assert isinstance(data["search_id"], str)

    @pytest.mark.parametrize("q", DEMO_QUERIES)
    def test_demo_queries_return_three(self, anon, api, q):
        r = anon.get(f"{api}/search", params={"q": q})
        assert r.status_code == 200
        data = r.json()
        assert data["count"] == 3, f"{q} -> {data['count']} results"
        assert len({x["id"] for x in data["results"]}) == 3
        for res in data["results"]:
            assert res["why_its_here"]

    def test_no_mongo_object_id_leak(self, anon, api):
        r = anon.get(f"{api}/search", params={"q": "pizza"})
        assert '"_id"' not in r.text

    def test_zero_result_and_suggest(self, anon, api):
        r = anon.get(f"{api}/search", params={"q": "sushi burrito xyz"})
        assert r.status_code == 200
        assert r.json()["count"] == 0
        s = anon.post(f"{api}/suggest-dish", json={"query": "sushi burrito xyz"})
        assert s.status_code == 200
        assert s.json()["ok"] is True

    def test_search_select_tracking(self, anon, api):
        r = anon.get(f"{api}/search", params={"q": "pasta"})
        data = r.json()
        rid = data["results"][0]["id"]
        sel = anon.post(f"{api}/search/select", json={"search_id": data["search_id"], "recipe_id": rid})
        assert sel.status_code == 200
        assert sel.json()["ok"] is True


class TestSearchFilters:
    def test_spice_filter(self, anon, api):
        r = anon.get(f"{api}/search", params={"q": "momos", "spice": "mild"})
        assert r.status_code == 200
        for res in r.json()["results"]:
            assert res["spice_level"] == "mild", res["spice_level"]

    def test_diet_filter(self, anon, api):
        r = anon.get(f"{api}/search", params={"q": "momos", "diet": "Vegetarian"})
        assert r.status_code == 200
        for res in r.json()["results"]:
            assert res["diet"] == "Vegetarian"

    def test_max_time_filter(self, anon, api):
        r = anon.get(f"{api}/search", params={"q": "momos", "max_time": 30})
        assert r.status_code == 200
        for res in r.json()["results"]:
            assert res["cook_time"] <= 30

    def test_min_time_filter(self, anon, api):
        r = anon.get(f"{api}/search", params={"q": "momos", "min_time": 60})
        assert r.status_code == 200
        for res in r.json()["results"]:
            assert res["cook_time"] >= 60

    def test_difficulty_filter(self, anon, api):
        r = anon.get(f"{api}/search", params={"q": "momos", "difficulty": "Easy"})
        assert r.status_code == 200
        for res in r.json()["results"]:
            assert res["difficulty"] == "Easy"

    def test_cuisine_filter(self, anon, api):
        r = anon.get(f"{api}/search", params={"q": "", "cuisine": "Italian"})
        assert r.status_code == 200
        results = r.json()["results"]
        assert results
        for res in results:
            assert "italian" in res["cuisine"].lower()


class TestCategories:
    def test_categories(self, anon, api):
        r = anon.get(f"{api}/categories")
        assert r.status_code == 200
        cats = r.json()["categories"]
        assert len(cats) >= 2
        for c in cats:
            assert c["cuisine"]
            assert isinstance(c["count"], int) and c["count"] > 0
            assert isinstance(c["regions"], list)


class TestRecipeListAndDetail:
    def test_list_recipes(self, anon, api):
        r = anon.get(f"{api}/recipes", params={"limit": 5})
        assert r.status_code == 200
        d = r.json()
        assert d["total"] >= 30, d["total"]
        assert len(d["recipes"]) == 5
        for rec in d["recipes"]:
            assert rec["status"] == "PUBLISHED"
            assert rec.get("creator")

    def test_recipe_detail_anonymous(self, anon, api):
        slug = anon.get(f"{api}/search", params={"q": "pizza"}).json()["results"][0]["slug"]
        r = anon.get(f"{api}/recipes/{slug}")
        assert r.status_code == 200
        d = r.json()
        assert d["slug"] == slug
        assert d["ingredients"] and isinstance(d["ingredients"], list)
        assert d["instructions"] and isinstance(d["instructions"], list)
        assert d["my_rating"] is None
        assert d["is_saved"] is False

    def test_recipe_detail_404(self, anon, api):
        r = anon.get(f"{api}/recipes/no-such-recipe-xyz")
        assert r.status_code == 404
