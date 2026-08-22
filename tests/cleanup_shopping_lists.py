"""Delete all shopping lists created for the admin account during UI testing."""
import os
import requests
from dotenv import dotenv_values

base = os.environ.get("REACT_APP_BACKEND_URL") or dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"]
API = base.rstrip("/") + "/api"
s = requests.Session()
r = s.post(f"{API}/auth/login", json={"email": "admin@flavouria.com", "password": "Flavouria@2026"})
r.raise_for_status()
lists = s.get(f"{API}/shopping-lists").json()["lists"]
print("found", len(lists))
for l in lists:
    print("deleting", l["id"], l["name"][:50], s.delete(f"{API}/shopping-lists/{l['id']}").status_code)
print("remaining:", len(s.get(f"{API}/shopping-lists").json()["lists"]))
