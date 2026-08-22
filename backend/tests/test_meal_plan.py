"""Tests for the new 'Plan your Meal' feature (GET /api/meal-plan),
the YouTube compilation filter (GET /api/youtube) and curated /api/categories."""
import re
import sys

import pytest

sys.path.insert(0, "/app/backend")
from server import scale_quantity  # noqa: E402
from youtube_agent import _is_compilation  # noqa: E402


# ---------------- scale_quantity() unit tests ----------------
class TestScaleQuantity:
    def test_integer_scaling(self):
        assert scale_quantity("600", 1.5) == "900"

    def test_decimal_result_trimmed(self):
        assert scale_quantity("3", 1.5) == "4.5"

    def test_fraction_input(self):
        assert scale_quantity("1/2", 2) == "1"

    def test_trailing_text_preserved(self):
        assert scale_quantity("2 large", 2) == "4 large"

    def test_non_numeric_untouched(self):
        assert scale_quantity("to taste", 3) == "to taste"

    def test_empty(self):
        assert scale_quantity("", 3) == ""
        assert scale_quantity(None, 3) is None or scale_quantity(None, 3) == ""


# ---------------- YouTube compilation regex unit tests ----------------
class TestCompilationRegex:
    @pytest.mark.parametrize("title", [
        "6 Top French Recipes You Need to Cook",
        "5 Easy Dinner Recipes",
        "Top 10 Indian Curries",
        "Best 5 Pasta Dishes",
        "Butter Chicken Compilation",
        "3 Ways to Make Eggs",
        "Recipes You Need To Try",
        "10 Recipes in 10 Minutes",
    ])
    def test_flags_compilations(self, title):
        assert _is_compilation(title), title

    @pytest.mark.parametrize("title", [
        "Butter Chicken Recipe | Restaurant Style",
        "Authentic Carbonara in 15 minutes",
        "How to Make Chicken Biryani at Home",
        "Coq au Vin - Classic French Recipe",
    ])
    def test_allows_single_dish(self, title):
        assert not _is_compilation(title), title


# ---------------- GET /api/meal-plan ----------------
class TestMealPlan:
    def test_butter_chicken_pax6_scaling(self, anon, api):
        r = anon.get(f"{api}/meal-plan", params={"q": "Butter Chicken", "pax": 6})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["found"] is True
        assert d["pax"] == 6
        assert d["base_servings"] == 4
        assert "butter chicken" in d["recipe"]["title"].lower()
        assert isinstance(d["shopping_list"], list) and len(d["shopping_list"]) > 0
        by_name = {i["name"].lower(): i for i in d["shopping_list"]}
        # factor = 6/4 = 1.5
        for name, item in by_name.items():
            base = item["base_quantity"]
            m = re.match(r"^\s*(\d+(?:\.\d+)?)", base or "")
            if m:
                expected = float(m.group(1)) * 1.5
                got = float(re.match(r"^\s*(\d+(?:\.\d+)?)", item["quantity"]).group(1))
                assert abs(got - expected) < 0.01, f"{name}: {base} -> {item['quantity']}"
        # explicit spot checks from the request
        chicken = next((v for k, v in by_name.items() if "chicken" in k), None)
        assert chicken is not None
        assert chicken["quantity"].startswith("900")
        butter = next((v for k, v in by_name.items() if k.strip() == "butter"), None)
        if butter and butter["base_quantity"].startswith("3"):
            assert butter["quantity"].startswith("4.5")

    def test_base_servings_pax_equals_base(self, anon, api):
        r6 = anon.get(f"{api}/meal-plan", params={"q": "Butter Chicken", "pax": 6}).json()
        base = r6["base_servings"]
        r = anon.get(f"{api}/meal-plan", params={"q": "Butter Chicken", "pax": base})
        assert r.status_code == 200
        d = r.json()
        assert d["found"] is True
        for item in d["shopping_list"]:
            assert item["quantity"] == item["base_quantity"], item

    @pytest.mark.parametrize("dish", ["Carbonara", "Chicken Biryani"])
    def test_other_known_dishes(self, anon, api, dish):
        r = anon.get(f"{api}/meal-plan", params={"q": dish, "pax": 4})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["found"] is True, d
        assert d["recipe"]["title"]
        assert d["recipe"]["slug"]
        assert len(d["shopping_list"]) > 0
        assert "_id" not in str(d)

    def test_unknown_dish_not_found(self, anon, api):
        r = anon.get(f"{api}/meal-plan", params={"q": "zzznotarealdish", "pax": 3})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["found"] is False
        assert d["pax"] == 3

    def test_empty_query(self, anon, api):
        r = anon.get(f"{api}/meal-plan", params={"q": "", "pax": 2})
        assert r.status_code == 200
        assert r.json()["found"] is False

    def test_pax_zero_clamped_to_one(self, anon, api):
        r = anon.get(f"{api}/meal-plan", params={"q": "Butter Chicken", "pax": 0})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["pax"] == 1
        base = d["base_servings"]
        chicken = next((i for i in d["shopping_list"] if "chicken" in i["name"].lower()), None)
        assert chicken is not None
        m = re.match(r"^\s*(\d+(?:\.\d+)?)", chicken["base_quantity"])
        if m:
            expected = float(m.group(1)) / base
            got = float(re.match(r"^\s*(\d+(?:\.\d+)?)", chicken["quantity"]).group(1))
            assert abs(got - expected) < 0.01

    def test_negative_pax(self, anon, api):
        r = anon.get(f"{api}/meal-plan", params={"q": "Butter Chicken", "pax": -5})
        assert r.status_code == 200, r.text
        assert r.json()["pax"] == 1

    def test_large_pax_clamped(self, anon, api):
        r = anon.get(f"{api}/meal-plan", params={"q": "Butter Chicken", "pax": 500})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["pax"] <= 100
        assert len(d["shopping_list"]) > 0

    def test_non_integer_pax_rejected_cleanly(self, anon, api):
        r = anon.get(f"{api}/meal-plan", params={"q": "Butter Chicken", "pax": "abc"})
        assert r.status_code == 422, r.status_code


# ---------------- GET /api/categories curation ----------------
class TestCategories:
    def test_exactly_six_curated_cuisines(self, anon, api):
        r = anon.get(f"{api}/categories")
        assert r.status_code == 200
        cats = r.json()["categories"]
        names = [c["cuisine"] for c in cats]
        assert names == ["Oriental", "Mediterranean", "Indian", "Italian", "French", "Mexican"], names
        assert "Dessert" not in names and "Bengali" not in names
        indian = next(c for c in cats if c["cuisine"] == "Indian")
        assert "Bengali" in indian["regions"]
        for c in cats:
            assert isinstance(c["count"], int)


# ---------------- GET /api/youtube compilation filter ----------------
class TestYouTubeNoCompilations:
    BAD = [
        re.compile(r"\b\d+\b.*\b(recipes|dishes|meals|ideas|dinners)\b", re.I),
        re.compile(r"\b(top|best)\s+\d+\b", re.I),
        re.compile(r"\bcompilation\b", re.I),
        re.compile(r"\brecipes\b.*\byou\s+(need|must|should)\b", re.I),
    ]

    @pytest.mark.parametrize("q", ["butter chicken", "french"])
    def test_no_compilation_titles(self, anon, api, q):
        r = anon.get(f"{api}/youtube", params={"q": q}, timeout=180)
        assert r.status_code == 200, r.text
        d = r.json()
        if d.get("error"):
            pytest.skip(f"YouTube API error: {d['error']}")
        videos = d.get("videos", [])
        assert len(videos) <= 3
        if not videos:
            pytest.skip("no videos returned")
        offenders = [v["title"] for v in videos if any(p.search(v["title"]) for p in self.BAD)]
        assert not offenders, f"compilation titles surfaced for '{q}': {offenders}"
