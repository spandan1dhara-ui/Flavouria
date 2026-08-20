"""Tests for recent additions: /api/youtube, /api/youtube/save(+saved), /api/explore pagination,
creator dashboard payload (share/search needs slug+title), auth hardening basics."""
import pytest
import requests
from conftest import API


# ---------------- GET /api/youtube (real-time YouTube AI agent) ----------------
class TestYouTube:
    def test_youtube_empty_query(self, anon):
        r = anon.get(f"{API}/youtube?q=")
        assert r.status_code == 200
        d = r.json()
        assert d["videos"] == []

    def test_youtube_returns_top3_with_ai_fields(self, anon):
        r = anon.get(f"{API}/youtube?q=butter chicken", timeout=180)
        assert r.status_code == 200, r.text[:400]
        d = r.json()
        vids = d.get("videos", [])
        assert len(vids) == 3, f"expected 3 videos, got {len(vids)}"
        ranks = sorted(v["rank"] for v in vids)
        assert ranks == [1, 2, 3]
        for v in vids:
            assert isinstance(v["video_id"], str) and v["video_id"]
            assert v["title"] and v["channel"]
            assert isinstance(v["views"], int) and v["views"] > 0
            assert v["thumbnail"].startswith("http")
            assert isinstance(v["summary"], str) and len(v["summary"]) > 10
            assert isinstance(v["ingredients"], list)
            assert isinstance(v["method"], list)
            assert v["sentiment"] in ("positive", "mixed", "negative")

    def test_youtube_cached_second_call_fast(self, anon):
        import time
        t = time.time()
        r = anon.get(f"{API}/youtube?q=butter chicken", timeout=180)
        el = time.time() - t
        assert r.status_code == 200
        assert len(r.json()["videos"]) == 3
        assert el < 20, f"cache miss? second identical query took {el:.1f}s"


# ---------------- YouTube save / saved ----------------
class TestYouTubeSave:
    def test_saved_requires_auth(self, anon):
        r = anon.get(f"{API}/youtube/saved")
        assert r.status_code in (401, 403)

    def test_save_requires_auth(self, anon):
        r = anon.post(f"{API}/youtube/save", json={"video": {"video_id": "abc"}})
        assert r.status_code in (401, 403)

    def test_save_missing_video_id_400(self, admin_client):
        r = admin_client.post(f"{API}/youtube/save", json={"video": {}})
        assert r.status_code == 400

    def test_save_toggle_and_persist(self, admin_client):
        video = {
            "video_id": "TEST_vid_qa_1", "rank": 1, "title": "TEST_QA Video",
            "channel": "QA Channel", "views": 1000, "likes": 10,
            "thumbnail": "https://example.com/t.jpg", "summary": "test summary",
            "ingredients": ["a", "b"], "method": ["step 1", "step 2"],
            "tips": [], "sentiment": "positive",
        }
        # ensure clean state
        listed = admin_client.get(f"{API}/youtube/saved").json()["videos"]
        if any(v["video_id"] == "TEST_vid_qa_1" for v in listed):
            admin_client.post(f"{API}/youtube/save", json={"video": video})

        r = admin_client.post(f"{API}/youtube/save", json={"video": video})
        assert r.status_code == 200
        assert r.json()["saved"] is True

        # GET verify persistence
        r2 = admin_client.get(f"{API}/youtube/saved")
        assert r2.status_code == 200
        vids = r2.json()["videos"]
        assert all("_id" not in v for v in vids)
        match = [v for v in vids if v["video_id"] == "TEST_vid_qa_1"]
        assert len(match) == 1
        assert match[0]["title"] == "TEST_QA Video"
        assert match[0]["is_saved"] is True
        assert match[0]["method"] == ["step 1", "step 2"]

        # toggle off
        r3 = admin_client.post(f"{API}/youtube/save", json={"video": video})
        assert r3.status_code == 200
        assert r3.json()["saved"] is False
        vids2 = admin_client.get(f"{API}/youtube/saved").json()["videos"]
        assert not any(v["video_id"] == "TEST_vid_qa_1" for v in vids2)

    def test_saved_is_per_user(self, admin_client, user_account):
        video = {"video_id": "TEST_vid_qa_2", "rank": 2, "title": "TEST_QA Two", "method": []}
        admin_client.post(f"{API}/youtube/save", json={"video": video})
        other = user_account["client"].get(f"{API}/youtube/saved")
        assert other.status_code == 200
        assert not any(v["video_id"] == "TEST_vid_qa_2" for v in other.json()["videos"])
        admin_client.post(f"{API}/youtube/save", json={"video": video})  # cleanup


# ---------------- GET /api/explore (More Recipes pagination) ----------------
class TestExplore:
    def test_explore_default(self, anon):
        r = anon.get(f"{API}/explore?q=chicken")
        assert r.status_code == 200
        d = r.json()
        assert set(["total", "recipes", "skip", "limit"]).issubset(d)
        assert d["limit"] == 6
        assert len(d["recipes"]) <= 6
        assert isinstance(d["total"], int)
        for rec in d["recipes"]:
            assert rec["status"] == "PUBLISHED"
            assert "id" in rec and "slug" in rec and "title" in rec
            assert "_id" not in rec
            assert rec.get("creator") is not None

    def test_explore_pagination_no_overlap(self, anon):
        p1 = anon.get(f"{API}/explore?q=chicken&skip=0&limit=6").json()
        if p1["total"] <= 6:
            pytest.skip("not enough recipes to paginate")
        p2 = anon.get(f"{API}/explore?q=chicken&skip=6&limit=6").json()
        ids1 = {r["id"] for r in p1["recipes"]}
        ids2 = {r["id"] for r in p2["recipes"]}
        assert p1["total"] == p2["total"]
        assert not (ids1 & ids2), "pagination returned overlapping recipes"

    def test_explore_empty_query_returns_all_published(self, anon):
        r = anon.get(f"{API}/explore?q=&limit=3")
        assert r.status_code == 200
        d = r.json()
        assert d["total"] > 0
        assert len(d["recipes"]) == 3

    def test_explore_nonsense_query(self, anon):
        r = anon.get(f"{API}/explore?q=zzzzqqqxyzzz")
        assert r.status_code == 200
        assert r.json()["total"] == 0
        assert r.json()["recipes"] == []

    def test_explore_regex_injection_safe(self, anon):
        r = anon.get(f"{API}/explore?q=%28%28%28")  # (((
        assert r.status_code == 200


# ---------------- Nav dropdown queries must return results ----------------
class TestNavQueries:
    @pytest.mark.parametrize("q", ["Bengali", "North Indian", "Indo-Chinese", "South Indian",
                                   "Kashmiri", "Kebab", "Indian Dessert",
                                   "Salad", "Juice", "Morning Shot", "Healthy Food Habits"])
    def test_nav_query_search_endpoint(self, anon, q):
        r = anon.get(f"{API}/search", params={"q": q})
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert "results" in d or "recipes" in d, d.keys()


# ---------------- Creator dashboard (search + share need slug/title) ----------------
class TestCreatorDashboard:
    @pytest.fixture(scope="class")
    def creator_client(self):
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        r = s.post(f"{API}/auth/login", json={"email": "rahuls-kitchen@flavouria.com",
                                              "password": "Creator@2026"})
        if r.status_code != 200:
            pytest.fail(f"creator login failed {r.status_code}: {r.text[:300]}")
        return s

    def test_dashboard_payload(self, creator_client):
        r = creator_client.get(f"{API}/creator/dashboard")
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert "creator" in d and "stats" in d and "recipes" in d
        assert d["creator"]["slug"]
        assert len(d["recipes"]) > 0, "creator has no recipes to filter/share"
        for rec in d["recipes"]:
            assert rec["slug"], "share buttons need slug"
            assert rec["title"], "search filter needs title"
            assert "_id" not in rec

    def test_dashboard_requires_creator_role(self, user_account):
        r = user_account["client"].get(f"{API}/creator/dashboard")
        assert r.status_code in (401, 403)


# ---------------- Regression: fuzzy vocabulary + recipe detail ----------------
class TestRegression:
    def test_search_terms_vocab(self, anon):
        r = anon.get(f"{API}/search-terms")
        assert r.status_code == 200
        terms = r.json().get("terms", [])
        assert len(terms) > 10
        joined = " ".join(t if isinstance(t, str) else str(t) for t in terms).lower()
        assert "biryani" in joined, "vocabulary must contain 'biryani' for biriyani->biryani correction"

    def test_recipe_detail_has_instructions_for_cook_mode(self, anon):
        r = anon.get(f"{API}/recipes/creamy-butter-chicken")
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        rec = d.get("recipe", d)
        assert len(rec["instructions"]) > 1, "cook mode needs multiple steps"
        assert len(rec["ingredients"]) > 0
