"""Tests for shopping-list unit conversion (mL / g / counts).

Covers:
- unit: canonicalize_unit(), consolidate_ingredients()
- api: POST /api/shopping-lists conversion + scaling, GET persistence
"""
import sys

import pytest
import requests

sys.path.insert(0, "/app/backend")
from server import canonicalize_unit, consolidate_ingredients  # noqa: E402

from conftest import API  # noqa: E402


# ---------------- unit: canonicalize_unit ----------------
class TestCanonicalize:
    @pytest.mark.parametrize("qty,unit,exp_val,exp_unit", [
        (1, "cup", 240, "mL"), (2, "cups", 480, "mL"),
        (1, "tsp", 5, "mL"), (4, "tbsp", 60, "mL"),
        (1, "l", 1000, "mL"), (250, "ml", 250, "mL"),
        (1, "kg", 1000, "g"), (750, "g", 750, "g"),
        (1, "lb", 453.6, "g"), (1, "oz", 28.35, "g"),
        (5, "", 5, ""), (2, "piece", 2, "piece"), (3, "cloves", 3, "cloves"),
    ])
    def test_conversion(self, qty, unit, exp_val, exp_unit):
        v, u = canonicalize_unit(qty, unit)
        assert u == exp_unit
        assert v == pytest.approx(exp_val)

    def test_none_quantity_keeps_unit(self):
        v, u = canonicalize_unit(None, "tsp")
        assert v is None and u == "tsp"


# ---------------- unit: consolidate_ingredients ----------------
class TestConsolidateConversion:
    def test_cross_unit_merge_to_ml(self):
        r1 = {"servings": 1, "ingredients": [{"name": "Milk", "unit": "ml", "quantity": "100"}]}
        r2 = {"servings": 1, "ingredients": [{"name": "Milk", "unit": "cup", "quantity": "1"}]}
        out = consolidate_ingredients([(r1, 1), (r2, 1)])
        assert len(out) == 1
        assert out[0]["unit"] == "mL"
        assert out[0]["quantity"] == "340"

    def test_weight_merge_to_g(self):
        r1 = {"servings": 1, "ingredients": [{"name": "Flour", "unit": "kg", "quantity": "1"}]}
        r2 = {"servings": 1, "ingredients": [{"name": "flour", "unit": "g", "quantity": "250"}]}
        out = consolidate_ingredients([(r1, 1), (r2, 1)])
        assert len(out) == 1
        assert out[0]["unit"] == "g" and out[0]["quantity"] == "1250"

    def test_counts_unchanged(self):
        r = {"servings": 2, "ingredients": [
            {"name": "Onion", "unit": "", "quantity": "2"},
            {"name": "Egg", "unit": "piece", "quantity": "3"},
        ]}
        out = consolidate_ingredients([(r, 2)])
        by = {i["name"]: i for i in out}
        assert by["Onion"] == {"name": "Onion", "unit": "", "quantity": "2"}
        assert by["Egg"]["unit"] == "piece" and by["Egg"]["quantity"] == "3"

    def test_to_taste_preserved(self):
        r = {"servings": 2, "ingredients": [{"name": "Salt", "unit": "", "quantity": "to taste"}]}
        out = consolidate_ingredients([(r, 4)])
        assert out[0]["quantity"] == ""

    def test_scaling_then_conversion(self):
        r = {"servings": 4, "ingredients": [
            {"name": "Mutton", "unit": "g", "quantity": "750"},
            {"name": "Mustard Oil", "unit": "tbsp", "quantity": "4"},
        ]}
        out = consolidate_ingredients([(r, 6)])
        by = {i["name"]: i for i in out}
        assert by["Mutton"]["quantity"] == "1125" and by["Mutton"]["unit"] == "g"
        assert by["Mustard Oil"]["quantity"] == "90" and by["Mustard Oil"]["unit"] == "mL"


# ---------------- api fixtures ----------------
DISHES = [
    ("plain rice", "Steamed Plain Rice"),
    ("mutton kosha", "Kolkata Mutton Kosha"),
    ("bhendi", "Bhindi Fry (Okra Sabzi)"),
]


@pytest.fixture(scope="module")
def recipe_ids():
    s = requests.Session()
    out = {}
    for q, title in DISHES:
        r = s.get(f"{API}/recipes/lookup", params={"q": q})
        match = next((c for c in r.json().get("results", []) if c["title"] == title), None)
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


@pytest.fixture(scope="module")
def three_recipe_list(client, recipe_ids, created_ids):
    body = {"name": "TEST_units_3recipes", "items": [
        {"recipe_id": recipe_ids["Steamed Plain Rice"]["id"], "pax": 4},
        {"recipe_id": recipe_ids["Kolkata Mutton Kosha"]["id"], "pax": 4},
        {"recipe_id": recipe_ids["Bhindi Fry (Okra Sabzi)"]["id"], "pax": 3},
    ]}
    r = client.post(f"{API}/shopping-lists", json=body)
    assert r.status_code == 200, r.text[:400]
    lst = r.json()["list"]
    created_ids.append(lst["id"])
    return lst


def _row(lst, needle):
    rows = [i for i in lst["shopping_list"] if needle.lower() in i["name"].lower()]
    assert rows, f"'{needle}' not found in {[i['name'] for i in lst['shopping_list']]}"
    assert len(rows) == 1, f"duplicate rows for '{needle}': {rows}"
    return rows[0]


# ---------------- api: conversion in POST /api/shopping-lists ----------------
class TestApiConversion:
    @pytest.mark.parametrize("name,qty,unit", [
        ("Basmati Rice", "480", "mL"),
        ("Water", "960", "mL"),
        ("Salt", "10", "mL"),
        ("Mutton", "750", "g"),
        ("Mustard Oil", "90", "mL"),
        ("Yogurt", "240", "mL"),
        ("Okra", "400", "g"),
        ("Turmeric", "2.5", "mL"),
    ])
    def test_measured_rows(self, three_recipe_list, name, qty, unit):
        row = _row(three_recipe_list, name)
        assert (row["quantity"], row["unit"]) == (qty, unit), row

    @pytest.mark.parametrize("name,qty", [("Onion", "5"), ("Potato", "2"), ("Bay Leaf", "2")])
    def test_count_rows(self, three_recipe_list, name, qty):
        row = _row(three_recipe_list, name)
        assert row["unit"] == "", row
        assert row["quantity"] == qty, row

    def test_only_canonical_units(self, three_recipe_list):
        bad = [i for i in three_recipe_list["shopping_list"] if i["unit"] not in ("mL", "g", "")]
        assert not bad, f"non-canonical units remain: {bad}"

    def test_no_legacy_unit_strings(self, three_recipe_list):
        legacy = {"cup", "cups", "tbsp", "tsp", "kg", "l", "ml", "g ", "oz", "lb", "gram", "grams"}
        units = {i["unit"].lower() for i in three_recipe_list["shopping_list"]}
        assert not (units & legacy - {"ml", "g"}), units
        assert "cup" not in units and "tbsp" not in units and "tsp" not in units and "kg" not in units

    def test_persistence_after_get(self, client, three_recipe_list):
        g = client.get(f"{API}/shopping-lists/{three_recipe_list['id']}")
        assert g.status_code == 200
        assert g.json()["list"]["shopping_list"] == three_recipe_list["shopping_list"]

    def test_no_mongo_id(self, client, three_recipe_list):
        assert '"_id"' not in client.get(f"{API}/shopping-lists/{three_recipe_list['id']}").text


class TestApiScaling:
    def test_mutton_pax6(self, client, recipe_ids, created_ids):
        r = client.post(f"{API}/shopping-lists", json={"name": "TEST_units_scale", "items": [
            {"recipe_id": recipe_ids["Kolkata Mutton Kosha"]["id"], "pax": 6}]})
        assert r.status_code == 200, r.text[:400]
        lst = r.json()["list"]
        created_ids.append(lst["id"])
        assert (_row(lst, "Mutton")["quantity"], _row(lst, "Mutton")["unit"]) == ("1125", "g")
        oil = _row(lst, "Mustard Oil")
        assert (oil["quantity"], oil["unit"]) == ("90", "mL")
        bad = [i for i in lst["shopping_list"] if i["unit"] not in ("mL", "g", "")]
        assert not bad, bad


# ---------------- api: AI-generated recipes also come out in mL/g/counts ----------------
class TestAiRecipeUnits:
    def test_ai_recipe_list_units(self, client, created_ids):
        gen = client.post(f"{API}/recipes/ai-generate", json={"query": "Aloo Posto"}, timeout=120)
        assert gen.status_code == 200, gen.text[:300]
        card = gen.json()["recipe"]
        assert card["id"].startswith("ai-")

        r = client.post(f"{API}/shopping-lists", json={"name": "TEST_units_ai", "items": [
            {"recipe_id": card["id"], "pax": 4}]})
        assert r.status_code == 200, r.text[:400]
        lst = r.json()["list"]
        created_ids.append(lst["id"])
        assert lst["shopping_list"]
        bad = [i for i in lst["shopping_list"] if i["unit"] not in ("mL", "g", "")]
        assert not bad, f"non-canonical units in AI list: {bad}"
