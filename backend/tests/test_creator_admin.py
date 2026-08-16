"""Creator flow + moderation + admin endpoints"""
import uuid

import pytest
import requests


RECIPE_PAYLOAD = {
    "title": "TEST Zesty Quinoa Bowl",
    "description": "A test recipe for QA automation purposes only.",
    "thumbnail": "https://images.unsplash.com/photo-1512058564366-18510be2db19",
    "cuisine": "Fusion",
    "region": "Global",
    "category": "Bowl",
    "diet": "Vegan",
    "spice_level": "mild",
    "cook_time": 25,
    "difficulty": "Easy",
    "servings": 2,
    "ingredients": [{"name": "quinoa", "quantity": "1 cup"}, {"name": "olive oil", "quantity": "1 tbsp"}],
    "instructions": ["Rinse quinoa.", "Boil for 15 min.", "Toss with oil and serve."],
    "tags": ["quinoa", "test"],
    "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
}


@pytest.fixture(scope="module")
def creator_account(api):
    """Register a fresh user then upgrade to creator via /creator/apply."""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    email = f"TEST_creator_{uuid.uuid4().hex[:8]}@flavouriaqa.com"
    r = s.post(f"{api}/auth/register", json={"name": "TEST Creator", "email": email, "password": "Creator@2026"})
    assert r.status_code == 200, r.text
    assert r.json()["role"] == "user"
    ap = s.post(f"{api}/creator/apply", json={"display_name": f"TEST Kitchen {uuid.uuid4().hex[:5]}",
                                              "bio": "QA test creator"})
    assert ap.status_code == 200, ap.text
    prof = ap.json()
    me = s.get(f"{api}/auth/me").json()
    assert me["role"] == "creator", me
    assert me["creator_id"] == prof["id"]
    return {"client": s, "email": email, "creator": prof}


@pytest.fixture(scope="module")
def created_recipe(creator_account, api):
    r = creator_account["client"].post(f"{api}/recipes", json=RECIPE_PAYLOAD)
    assert r.status_code == 200, r.text
    return r.json()


class TestCreatorFlow:
    def test_recipe_created_as_pending(self, created_recipe):
        assert created_recipe["status"] == "PENDING"
        assert created_recipe["slug"]
        assert created_recipe["youtube_id"] == "dQw4w9WgXcQ"
        assert created_recipe["rating_count"] == 0
        assert len(created_recipe["ingredients"]) == 2

    def test_pending_recipe_not_in_search(self, anon, api, created_recipe):
        r = anon.get(f"{api}/search", params={"q": "Zesty Quinoa Bowl"})
        ids = [x["id"] for x in r.json()["results"]]
        assert created_recipe["id"] not in ids
        # also not in public list
        lst = anon.get(f"{api}/recipes", params={"limit": 100}).json()["recipes"]
        assert created_recipe["id"] not in [x["id"] for x in lst]

    def test_creator_dashboard(self, creator_account, api, created_recipe):
        r = creator_account["client"].get(f"{api}/creator/dashboard")
        assert r.status_code == 200
        d = r.json()
        assert d["creator"]["id"] == creator_account["creator"]["id"]
        assert d["stats"]["total_recipes"] >= 1
        assert d["stats"]["recipes_published"] == 0
        assert created_recipe["id"] in [x["id"] for x in d["recipes"]]

    def test_creator_recipes_list(self, creator_account, api, created_recipe):
        r = creator_account["client"].get(f"{api}/creator/recipes")
        assert r.status_code == 200
        assert created_recipe["id"] in [x["id"] for x in r.json()["recipes"]]

    def test_get_recipe_by_id(self, creator_account, api, created_recipe):
        r = creator_account["client"].get(f"{api}/recipes/id/{created_recipe['id']}")
        assert r.status_code == 200
        assert r.json()["title"] == RECIPE_PAYLOAD["title"]

    def test_edit_recipe(self, creator_account, api, created_recipe):
        c = creator_account["client"]
        r = c.put(f"{api}/recipes/{created_recipe['id']}", json={"cook_time": 40, "servings": 4})
        assert r.status_code == 200
        assert r.json()["cook_time"] == 40
        again = c.get(f"{api}/recipes/id/{created_recipe['id']}").json()
        assert again["cook_time"] == 40 and again["servings"] == 4

    def test_creator_cannot_self_publish(self, creator_account, api, created_recipe):
        r = creator_account["client"].put(f"{api}/recipes/{created_recipe['id']}",
                                          json={"status": "PUBLISHED"})
        assert r.status_code == 200
        assert r.json()["status"] == "PENDING", "creator must not be able to self-publish"

    def test_creator_cannot_edit_others_recipe(self, creator_account, anon, api):
        other = anon.get(f"{api}/search", params={"q": "pizza"}).json()["results"][0]
        r = creator_account["client"].put(f"{api}/recipes/{other['id']}", json={"cook_time": 5})
        assert r.status_code == 403

    def test_apply_idempotent(self, creator_account, api):
        r = creator_account["client"].post(f"{api}/creator/apply", json={"display_name": "Another Name"})
        assert r.status_code == 200
        assert r.json()["id"] == creator_account["creator"]["id"]

    def test_creator_public_profile(self, anon, api, creator_account):
        r = anon.get(f"{api}/creators/{creator_account['creator']['slug']}")
        assert r.status_code == 200
        assert r.json()["creator"]["display_name"] == creator_account["creator"]["display_name"]


class TestModeration:
    def test_admin_sees_pending(self, admin_client, api, created_recipe):
        r = admin_client.get(f"{api}/admin/recipes", params={"status": "PENDING"})
        assert r.status_code == 200
        recs = r.json()["recipes"]
        assert created_recipe["id"] in [x["id"] for x in recs]
        assert all(x["status"] == "PENDING" for x in recs)

    def test_publish_then_visible_in_search(self, admin_client, anon, api, created_recipe):
        r = admin_client.post(f"{api}/admin/recipes/{created_recipe['id']}/moderate",
                              json={"status": "PUBLISHED", "note": "QA approved"})
        assert r.status_code == 200
        assert r.json()["status"] == "PUBLISHED"
        s = anon.get(f"{api}/search", params={"q": "Zesty Quinoa Bowl"})
        assert created_recipe["id"] in [x["id"] for x in s.json()["results"]], s.json()

    def test_invalid_moderation_status(self, admin_client, api, created_recipe):
        r = admin_client.post(f"{api}/admin/recipes/{created_recipe['id']}/moderate",
                              json={"status": "BOGUS"})
        assert r.status_code in (400, 422)

    def test_delete_recipe(self, creator_account, api, created_recipe):
        c = creator_account["client"]
        d = c.delete(f"{api}/recipes/{created_recipe['id']}")
        assert d.status_code == 200
        assert c.get(f"{api}/recipes/id/{created_recipe['id']}").status_code == 404


class TestAdminEndpoints:
    def test_overview(self, admin_client, api):
        r = admin_client.get(f"{api}/admin/overview")
        assert r.status_code == 200
        d = r.json()
        for k in ["total_users", "total_creators", "total_recipes", "pending_recipes",
                  "published_recipes", "total_ratings", "searches_today",
                  "zero_result_searches", "total_searches", "selection_rate"]:
            assert k in d, k
            assert isinstance(d[k], (int, float))
        assert d["total_recipes"] >= 30
        assert d["total_searches"] > 0

    def test_creators_list(self, admin_client, api):
        r = admin_client.get(f"{api}/admin/creators")
        assert r.status_code == 200
        creators = r.json()["creators"]
        seeded = [c for c in creators if not c["display_name"].startswith("TEST")]
        assert len(seeded) >= 8, len(seeded)

    def test_searches_analytics(self, admin_client, api):
        r = admin_client.get(f"{api}/admin/searches")
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d["zero_result"], list)
        assert isinstance(d["suggestions"], list)
        assert isinstance(d["recent"], list)
        assert len(d["recent"]) > 0

    def test_ranking_config_get_and_update(self, admin_client, api):
        r = admin_client.get(f"{api}/admin/ranking-config")
        assert r.status_code == 200
        cfg = r.json()
        assert "weights" in cfg
        original = dict(cfg["weights"])
        new_weights = dict(original)
        first_key = list(new_weights.keys())[0]
        new_weights[first_key] = round(float(new_weights[first_key]) + 0.05, 3)
        up = admin_client.put(f"{api}/admin/ranking-config", json={"weights": new_weights})
        assert up.status_code == 200
        assert up.json()["weights"][first_key] == new_weights[first_key]
        # verify persisted
        again = admin_client.get(f"{api}/admin/ranking-config").json()
        assert again["weights"][first_key] == new_weights[first_key]
        # restore
        restore = admin_client.put(f"{api}/admin/ranking-config", json={"weights": original})
        assert restore.status_code == 200
        assert restore.json()["weights"][first_key] == original[first_key]
