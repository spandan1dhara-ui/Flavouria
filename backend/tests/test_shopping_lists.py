"""Tests for the multi-recipe shopping list builder:
- GET /api/recipes/lookup
- POST/GET/GET{id}/DELETE /api/shopping-lists
- POST /api/shopping-lists/{id}/cooking-guide (Claude)
- consolidate_ingredients / parse_qty unit tests
"""
import sys
import pytest
import requests

sys.path.insert(0, "/app/backend")
from server import parse_qty, consolidate_ingredients  # noqa: E402

from conftest import API  # noqa: E402


# ---------------- unit: parse_qty ----------------
class TestParseQty:
    @pytest.mark.parametrize("raw,expected", [
        ("750", 750.0), ("1", 1.0), ("1/2", 0.5), ("0.5", 0.5),
        ("2 large", 2.0), ("", None), ("to taste", None), ("a pinch", None),
    ])
    def test_parse(self, raw, expected):
        num, _ = parse_qty(raw)
        assert num == expected


# ---------------- unit: consolidate_ingredients ----------------
class TestConsolidate:
    def test_merge_same_name_unit_and_scaling(self):
        r1 = {"servings": 4, "ingredients": [
            {"name": "Rice", "unit": "g", "quantity": "400"},
            {"name": "Salt", "unit": "tsp", "quantity": "1"},
        ]}
        r2 = {"servings": 3, "ingredients": [
            {"name": "salt", "unit": "TSP", "quantity": "1"},
            {"name": "Okra", "unit": "g", "quantity": "300"},
        ]}
        out = consolidate_ingredients([(r1, 4), (r2, 4)])
        by = {i["name"].lower(): i for i in out}
        assert by["rice"]["quantity"] == "400"
        assert by["okra"]["quantity"] == "400"
        # 1 + 1*(4/3) = 2.33
        assert by["salt"]["quantity"] == "2.33"
        assert len(out) == 3  # salt merged case-insensitively

    def test_non_numeric_quantity_yields_empty(self):
        r = {"servings": 2, "ingredients": [{"name": "Salt", "unit": "", "quantity": "to taste"}]}
        out = consolidate_ingredients([(r, 4)])
        assert out[0]["quantity"] == ""

    def test_different_units_not_merged(self):
        r1 = {"servings": 1, "ingredients": [{"name": "Milk", "unit": "ml", "quantity": "100"}]}
        r2 = {"servings": 1, "ingredients": [{"name": "Milk", "unit": "cup", "quantity": "1"}]}
        out = consolidate_ingredients([(r1, 1), (r2, 1)])
        assert len(out) == 2


# ---------------- GET /api/recipes/lookup ----------------
DISHES = [
    ("plain rice", "Steamed Plain Rice"),
    ("mutton kosha", "Kolkata Mutton Kosha"),
    ("bhendi", "Bhindi Fry (Okra Sabzi)"),
]


class TestLookup:
    @pytest.mark.parametrize("q,expected_title", DISHES)
    def test_lookup_finds_expected_recipe(self, anon, q, expected_title):
        r = anon.get(f"{API}/recipes/lookup", params={"q": q})
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert data["query"] == q
        titles = [x["title"] for x in data["results"]]
        assert expected_title in titles, f"{expected_title} not in {titles}"

    def test_card_shape(self, anon):
        r = anon.get(f"{API}/recipes/lookup", params={"q": "plain rice"})
        card = next(c for c in r.json()["results"] if c["title"] == "Steamed Plain Rice")
        for k in ("id", "title", "slug", "thumbnail", "cuisine", "servings", "cook_time"):
            assert k in card, f"missing {k}"
        assert isinstance(card["id"], str)
        assert isinstance(card["servings"], int) and card["servings"] > 0

    def test_lookup_limit_respected(self, anon):
        r = anon.get(f"{API}/recipes/lookup", params={"q": "chicken", "limit": 2})
        assert r.status_code == 200
        assert len(r.json()["results"]) <= 2

    def test_lookup_empty_query_returns_popular(self, anon):
        r = anon.get(f"{API}/recipes/lookup", params={"q": ""})
        assert r.status_code == 200
        assert isinstance(r.json()["results"], list)

    def test_lookup_nonsense_query(self, anon):
        r = anon.get(f"{API}/recipes/lookup", params={"q": "zzzqqqnotadish"})
        assert r.status_code == 200
        assert isinstance(r.json()["results"], list)

    def test_no_mongo_id_leak(self, anon):
        r = anon.get(f"{API}/recipes/lookup", params={"q": "rice"})
        assert '"_id"' not in r.text


@pytest.fixture(scope="module")
def recipe_ids():
    s = requests.Session()
    out = {}
    for q, title in DISHES:
        r = s.get(f"{API}/recipes/lookup", params={"q": q})
        match = next((c for c in r.json()["results"] if c["title"] == title), None)
        if not match:
            pytest.fail(f"seed recipe missing: {title}")
        out[title] = match
    return out


@pytest.fixture(scope="module")
def client(creds):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json=creds)
    if r.status_code != 200:
        pytest.fail(f"login failed {r.status_code}: {r.text[:300]}")
    return s


@pytest.fixture(scope="module")
def created_ids():
    return []


@pytest.fixture(scope="module", autouse=True)
def cleanup(client, created_ids):
    yield
    for lid in created_ids:
        client.delete(f"{API}/shopping-lists/{lid}")


# ---------------- shopping list CRUD ----------------
class TestShoppingListAuth:
    def test_post_requires_auth(self, anon):
        r = anon.post(f"{API}/shopping-lists", json={"items": [{"recipe_id": "x", "pax": 2}]})
        assert r.status_code == 401, r.status_code

    def test_get_requires_auth(self, anon):
        assert anon.get(f"{API}/shopping-lists").status_code == 401

    def test_delete_requires_auth(self, anon):
        assert anon.delete(f"{API}/shopping-lists/abc").status_code == 401

    def test_cooking_guide_requires_auth(self, anon):
        assert anon.post(f"{API}/shopping-lists/abc/cooking-guide").status_code == 401


class TestShoppingListCRUD:
    def test_create_consolidation_math(self, client, recipe_ids, created_ids):
        rice = recipe_ids["Steamed Plain Rice"]
        mutton = recipe_ids["Kolkata Mutton Kosha"]
        bhindi = recipe_ids["Bhindi Fry (Okra Sabzi)"]
        body = {"items": [
            {"recipe_id": rice["id"], "pax": 4},
            {"recipe_id": mutton["id"], "pax": 6},
            {"recipe_id": bhindi["id"], "pax": 4},
        ]}
        r = client.post(f"{API}/shopping-lists", json=body)
        assert r.status_code == 200, r.text[:400]
        lst = r.json()["list"]
        created_ids.append(lst["id"])

        assert len(lst["recipes"]) == 3
        assert {m["pax"] for m in lst["recipes"]} == {4, 6, 4}
        assert lst["cooking_guide"] is None
        assert lst["name"]

        items = {(i["name"].lower(), i["unit"].lower()): i for i in lst["shopping_list"]}
        # Mutton 750 g at x1.5 -> 1125
        mutton_key = next(k for k in items if "mutton" in k[0])
        assert items[mutton_key]["quantity"] == "1125"
        # Salt merged across Rice (1 tsp, x1) + Bhindi (1 tsp, x1.33) = 2.33
        salt = items.get(("salt", "tsp"))
        assert salt is not None, f"salt tsp missing in {list(items)}"
        assert salt["quantity"] == "2.33", salt

    def test_get_by_id_and_persistence(self, client, recipe_ids, created_ids):
        rice = recipe_ids["Steamed Plain Rice"]
        r = client.post(f"{API}/shopping-lists", json={"name": "TEST_list", "items": [{"recipe_id": rice["id"], "pax": 8}]})
        assert r.status_code == 200
        lst = r.json()["list"]
        created_ids.append(lst["id"])

        g = client.get(f"{API}/shopping-lists/{lst['id']}")
        assert g.status_code == 200
        got = g.json()["list"]
        assert got["name"] == "TEST_list"
        assert got["recipes"][0]["pax"] == 8
        assert got["shopping_list"] == lst["shopping_list"]
        # base servings 4, pax 8 -> x2
        rice_row = next(i for i in got["shopping_list"] if "rice" in i["name"].lower())
        assert float(rice_row["quantity"]) > 0

    def test_list_most_recent_first(self, client, created_ids):
        r = client.get(f"{API}/shopping-lists")
        assert r.status_code == 200
        lists = r.json()["lists"]
        assert len(lists) >= 2
        dates = [l["created_at"] for l in lists]
        assert dates == sorted(dates, reverse=True)
        ids = [l["id"] for l in lists]
        for cid in created_ids:
            assert cid in ids

    def test_no_mongo_id(self, client):
        assert '"_id"' not in client.get(f"{API}/shopping-lists").text

    def test_empty_items_400(self, client):
        r = client.post(f"{API}/shopping-lists", json={"items": []})
        assert r.status_code == 400

    def test_unknown_recipe_404(self, client):
        r = client.post(f"{API}/shopping-lists", json={"items": [{"recipe_id": "does-not-exist", "pax": 2}]})
        assert r.status_code == 404

    def test_pax_clamped(self, client, recipe_ids, created_ids):
        rice = recipe_ids["Steamed Plain Rice"]
        r = client.post(f"{API}/shopping-lists", json={"items": [{"recipe_id": rice["id"], "pax": 0}]})
        assert r.status_code == 200
        lst = r.json()["list"]
        created_ids.append(lst["id"])
        assert lst["recipes"][0]["pax"] == 1

        r2 = client.post(f"{API}/shopping-lists", json={"items": [{"recipe_id": rice["id"], "pax": 5000}]})
        assert r2.status_code == 200
        lst2 = r2.json()["list"]
        created_ids.append(lst2["id"])
        assert lst2["recipes"][0]["pax"] == 100

    def test_other_user_cannot_read(self, client, user_account, recipe_ids):
        rice = recipe_ids["Steamed Plain Rice"]
        r = client.post(f"{API}/shopping-lists", json={"items": [{"recipe_id": rice["id"], "pax": 2}]})
        lid = r.json()["list"]["id"]
        other = user_account["client"]
        assert other.get(f"{API}/shopping-lists/{lid}").status_code == 404
        assert other.delete(f"{API}/shopping-lists/{lid}").status_code == 404
        assert client.delete(f"{API}/shopping-lists/{lid}").status_code == 200

    def test_delete_and_verify_removal(self, client, recipe_ids):
        rice = recipe_ids["Steamed Plain Rice"]
        r = client.post(f"{API}/shopping-lists", json={"items": [{"recipe_id": rice["id"], "pax": 2}]})
        lid = r.json()["list"]["id"]
        d = client.delete(f"{API}/shopping-lists/{lid}")
        assert d.status_code == 200
        assert client.get(f"{API}/shopping-lists/{lid}").status_code == 404
        assert client.delete(f"{API}/shopping-lists/{lid}").status_code == 404


# ---------------- cooking guide (Claude) ----------------
class TestCookingGuide:
    def test_guide_generation_and_cache(self, client, recipe_ids, created_ids):
        rice = recipe_ids["Steamed Plain Rice"]
        bhindi = recipe_ids["Bhindi Fry (Okra Sabzi)"]
        r = client.post(f"{API}/shopping-lists", json={"items": [
            {"recipe_id": rice["id"], "pax": 4}, {"recipe_id": bhindi["id"], "pax": 4}]})
        lst = r.json()["list"]
        created_ids.append(lst["id"])

        g1 = client.post(f"{API}/shopping-lists/{lst['id']}/cooking-guide", timeout=180)
        assert g1.status_code == 200, g1.text[:400]
        guide = g1.json()["cooking_guide"]
        assert guide.get("overview")
        assert guide.get("total_time")
        steps = guide.get("steps")
        assert isinstance(steps, list) and len(steps) > 0
        assert all(isinstance(s, str) and s.strip() for s in steps)

        # cached second call
        g2 = client.post(f"{API}/shopping-lists/{lst['id']}/cooking-guide", timeout=60)
        assert g2.status_code == 200
        assert g2.json()["cooking_guide"] == guide

        # persisted on GET
        got = client.get(f"{API}/shopping-lists/{lst['id']}").json()["list"]
        assert got["cooking_guide"] == guide

    def test_guide_unknown_list_404(self, client):
        assert client.post(f"{API}/shopping-lists/nope/cooking-guide").status_code == 404
