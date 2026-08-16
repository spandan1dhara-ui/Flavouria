"""Auth (JWT), RBAC, ratings, saved recipes — /api/auth/*, /api/recipes/{id}/rate, /api/saved"""
import uuid

import pytest
import requests


class TestAuthJWT:
    def test_register_returns_user_role(self, user_account):
        u = user_account["user"]
        assert u["role"] == "user"
        assert u["email"] == user_account["email"].lower()
        assert u["auth_provider"] == "password"
        assert isinstance(u["id"], str)

    def test_register_sets_httponly_cookies(self, api):
        s = requests.Session()
        email = f"TEST_cookie_{uuid.uuid4().hex[:8]}@flavouriaqa.com"
        r = s.post(f"{api}/auth/register", json={"name": "TEST Cookie", "email": email, "password": "Cookie@2026"})
        assert r.status_code == 200
        raw = r.headers.get("set-cookie", "")
        assert "access_token" in raw and "HttpOnly" in raw, raw
        assert "refresh_token" in raw

    def test_duplicate_email_rejected(self, api, user_account):
        r = requests.post(f"{api}/auth/register", json={"name": "dup", "email": user_account["email"],
                                                        "password": "Whatever@2026"})
        assert r.status_code == 400

    def test_me_with_cookie(self, user_account, api):
        r = user_account["client"].get(f"{api}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == user_account["email"].lower()

    def test_me_unauthenticated(self, anon, api):
        r = requests.get(f"{api}/auth/me")
        assert r.status_code == 401

    def test_admin_login_role(self, admin_client, api):
        r = admin_client.get(f"{api}/auth/me")
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_invalid_password_401(self, api, creds):
        r = requests.post(f"{api}/auth/login", json={"email": creds["email"], "password": "WrongPass@0000"})
        assert r.status_code == 401
        assert "detail" in r.json()

    def test_bearer_token_fallback(self, api, user_account):
        """Login via a fresh session, grab cookie value, use it as Bearer header."""
        s = requests.Session()
        r = s.post(f"{api}/auth/login", json={"email": user_account["email"],
                                              "password": user_account["password"]})
        assert r.status_code == 200
        token = s.cookies.get("access_token")
        assert token
        r2 = requests.get(f"{api}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r2.status_code == 200
        assert r2.json()["email"] == user_account["email"].lower()

    def test_refresh_and_logout(self, api, user_account):
        s = requests.Session()
        s.post(f"{api}/auth/login", json={"email": user_account["email"], "password": user_account["password"]})
        rf = s.post(f"{api}/auth/refresh")
        assert rf.status_code == 200
        out = s.post(f"{api}/auth/logout")
        assert out.status_code == 200
        me = s.get(f"{api}/auth/me")
        assert me.status_code == 401, "session should be cleared after logout"

    def test_bcrypt_hash_format(self):
        import asyncio, sys
        sys.path.insert(0, "/app/backend")
        from database import db
        doc = asyncio.get_event_loop().run_until_complete(
            db.users.find_one({"email": "admin@flavouria.com"}))
        assert doc and doc["password_hash"].startswith("$2b$"), doc["password_hash"][:10]

    def test_brute_force_lockout(self, api):
        """6 bad logins on a throwaway identity should trigger 429."""
        email = f"TEST_brute_{uuid.uuid4().hex[:8]}@flavouriaqa.com"
        requests.post(f"{api}/auth/register", json={"name": "TEST Brute", "email": email, "password": "Brute@2026"})
        codes = []
        for _ in range(20):
            r = requests.post(f"{api}/auth/login", json={"email": email, "password": "bad-password"})
            codes.append(r.status_code)
        assert 429 in codes, codes

    def test_google_session_endpoint_exists(self, api):
        r = requests.post(f"{api}/auth/session")
        assert r.status_code == 400  # missing session_id, endpoint present


class TestRBAC:
    def test_user_forbidden_admin_overview(self, user_account, api):
        r = user_account["client"].get(f"{api}/admin/overview")
        assert r.status_code == 403

    def test_user_forbidden_admin_recipes(self, user_account, api):
        r = user_account["client"].get(f"{api}/admin/recipes")
        assert r.status_code == 403

    def test_user_forbidden_creator_dashboard(self, user_account, api):
        r = user_account["client"].get(f"{api}/creator/dashboard")
        assert r.status_code == 403

    def test_anonymous_401_on_admin(self, api):
        assert requests.get(f"{api}/admin/overview").status_code == 401

    def test_admin_can_access(self, admin_client, api):
        assert admin_client.get(f"{api}/admin/overview").status_code == 200
        assert admin_client.get(f"{api}/admin/recipes").status_code == 200


class TestRatings:
    @pytest.fixture(scope="class")
    def recipe(self, anon, api):
        return anon.get(f"{api}/search", params={"q": "chocolate cake"}).json()["results"][0]

    def test_rate_requires_auth(self, api, recipe):
        r = requests.post(f"{api}/recipes/{recipe['id']}/rate", json={"value": 5})
        assert r.status_code == 401

    def test_rate_invalid_value(self, user_account, api, recipe):
        r = user_account["client"].post(f"{api}/recipes/{recipe['id']}/rate", json={"value": 9})
        assert r.status_code in (400, 422)

    def test_rate_and_update(self, user_account, api, recipe):
        c = user_account["client"]
        before_count = recipe["rating_count"]
        r1 = c.post(f"{api}/recipes/{recipe['id']}/rate", json={"value": 4})
        assert r1.status_code == 200
        d1 = r1.json()
        assert d1["my_rating"] == 4
        assert d1["rating_count"] == before_count + 1

        # re-rate should UPDATE not duplicate
        r2 = c.post(f"{api}/recipes/{recipe['id']}/rate", json={"value": 2})
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["my_rating"] == 2
        assert d2["rating_count"] == d1["rating_count"], "re-rating must not add a new rating"
        assert d2["rating_avg"] <= d1["rating_avg"]

        # verify persistence via recipe detail
        det = c.get(f"{api}/recipes/{recipe['slug']}")
        assert det.status_code == 200
        dd = det.json()
        assert dd["my_rating"] == 2
        assert dd["rating_count"] == d2["rating_count"]
        assert dd["rating_avg"] == d2["rating_avg"]

        # my ratings list
        mr = c.get(f"{api}/my/ratings")
        assert mr.status_code == 200
        assert any(x["id"] == recipe["id"] and x["my_rating"] == 2 for x in mr.json()["recipes"])

    def test_rate_nonexistent_recipe(self, user_account, api):
        r = user_account["client"].post(f"{api}/recipes/{uuid.uuid4()}/rate", json={"value": 3})
        assert r.status_code == 404


class TestSaved:
    @pytest.fixture(scope="class")
    def recipe(self, anon, api):
        return anon.get(f"{api}/search", params={"q": "masala dosa"}).json()["results"][0]

    def test_save_requires_auth(self, api, recipe):
        assert requests.post(f"{api}/recipes/{recipe['id']}/save").status_code == 401
        assert requests.get(f"{api}/saved").status_code == 401

    def test_save_toggle_and_list(self, user_account, api, recipe):
        c = user_account["client"]
        r = c.post(f"{api}/recipes/{recipe['id']}/save")
        assert r.status_code == 200 and r.json()["saved"] is True
        lst = c.get(f"{api}/saved").json()["recipes"]
        assert any(x["id"] == recipe["id"] for x in lst)
        det = c.get(f"{api}/recipes/{recipe['slug']}").json()
        assert det["is_saved"] is True

        r2 = c.post(f"{api}/recipes/{recipe['id']}/save")
        assert r2.json()["saved"] is False
        lst2 = c.get(f"{api}/saved").json()["recipes"]
        assert not any(x["id"] == recipe["id"] for x in lst2)


class TestPreferences:
    def test_update_preferences(self, user_account, api):
        c = user_account["client"]
        r = c.put(f"{api}/me/preferences", json={"spice_tolerance": "spicy", "dietary": ["Vegetarian"],
                                                    "max_cook_time": 45})
        assert r.status_code == 200
        prefs = r.json()["preferences"]
        assert prefs["spice_tolerance"] == "spicy"
        assert prefs["dietary"] == ["Vegetarian"]
        me = c.get(f"{api}/auth/me").json()
        assert me["preferences"]["spice_tolerance"] == "spicy"
        assert me["preferences"]["max_cook_time"] == 45
