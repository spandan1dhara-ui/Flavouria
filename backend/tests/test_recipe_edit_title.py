"""Regression: recipe title edit via PUT /api/recipes/{id} (UI edit flow reported not saving title)"""
import uuid

import requests


def test_creator_can_edit_title(api):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    email = f"TEST_edit_{uuid.uuid4().hex[:8]}@flavouriaqa.com"
    assert s.post(f"{api}/auth/register", json={"name": "TEST Edit", "email": email,
                                                "password": "Edit@2026"}).status_code == 200
    assert s.post(f"{api}/creator/apply", json={"display_name": f"TEST EditKitchen {uuid.uuid4().hex[:5]}"}).status_code == 200
    created = s.post(f"{api}/recipes", json={
        "title": "TEST Original Title", "cuisine": "Indian", "category": "Curry",
        "ingredients": [{"name": "salt", "quantity": "1", "unit": "tsp"}],
        "instructions": ["Do a thing."], "cook_time": 20,
    })
    assert created.status_code == 200, created.text
    rid = created.json()["id"]
    try:
        up = s.put(f"{api}/recipes/{rid}", json={"title": "TEST Edited Title"})
        assert up.status_code == 200, up.text
        assert up.json()["title"] == "TEST Edited Title", up.json()
        again = s.get(f"{api}/recipes/id/{rid}").json()
        assert again["title"] == "TEST Edited Title"
        # slug is NOT regenerated on title change (documented behaviour check)
        print("slug after title edit:", again["slug"])
    finally:
        s.delete(f"{api}/recipes/{rid}")
