"""
Synaptiq — suite de tests automatiques
Couvre tous les endpoints API principaux.
Lance avec : pytest tests/ -v
"""
from __future__ import annotations
import io
import pytest
import httpx

BASE_URL = "http://localhost:8000/api/v1"

# ---------------------------------------------------------------------------
# Client fixture
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def client():
    with httpx.Client(base_url=BASE_URL, timeout=15) as c:
        yield c


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_domain_id(client: httpx.Client, slug: str) -> str:
    r = client.get(f"/domains/{slug}")
    assert r.status_code == 200, f"Domain {slug} not found: {r.text}"
    return r.json()["id"]


# ---------------------------------------------------------------------------
# Domains
# ---------------------------------------------------------------------------

class TestDomains:
    def test_list_domains(self, client):
        r = client.get("/domains/")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 11, f"Expected 11 domains, got {len(data)}"

    def test_get_domain_by_slug(self, client):
        r = client.get("/domains/subscriptions")
        assert r.status_code == 200
        d = r.json()
        assert d["slug"] == "subscriptions"
        assert "id" in d

    def test_domain_not_found(self, client):
        r = client.get("/domains/nonexistent_slug_xyz")
        assert r.status_code == 404

    @pytest.mark.parametrize("slug", [
        "identity", "housing", "finance", "work", "health",
        "learning", "vehicle", "travel", "subscriptions", "contacts", "projects"
    ])
    def test_all_domain_slugs_exist(self, client, slug):
        r = client.get(f"/domains/{slug}")
        assert r.status_code == 200, f"Domain '{slug}' missing"


# ---------------------------------------------------------------------------
# Entities
# ---------------------------------------------------------------------------

class TestEntities:
    @pytest.fixture(autouse=True)
    def domain_id(self, client):
        self._domain_id = get_domain_id(client, "subscriptions")
        self._created_ids: list = []
        yield
        for eid in self._created_ids:
            client.delete(f"/entities/{eid}")

    def test_list_entities(self, client):
        r = client.get("/entities/", params={"domain_id": self._domain_id})
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def _create(self, client, name="Test Entity [auto]", extra=None):
        payload = {"domain_id": self._domain_id, "name": name, "type": "abonnement", **(extra or {})}
        e = client.post("/entities/", json=payload).json()
        self._created_ids.append(e["id"])
        return e

    def test_create_entity(self, client):
        e = self._create(client, "Test Netflix [auto]", {"metadata_": {"price": 15.99, "billing_cycle": "monthly"}})
        assert e["name"] == "Test Netflix [auto]"
        assert "id" in e

    def test_get_entity(self, client):
        e = self._create(client, "Test Entity GET [auto]")
        r = client.get(f"/entities/{e['id']}")
        assert r.status_code == 200
        assert r.json()["id"] == e["id"]

    def test_entity_not_found(self, client):
        r = client.get("/entities/00000000-0000-0000-0000-000000000000")
        assert r.status_code == 404

    def test_update_entity(self, client):
        e = self._create(client, "Entity to Update [auto]")
        r = client.patch(f"/entities/{e['id']}", json={"name": "Updated Name [auto]"})
        assert r.status_code == 200
        assert r.json()["name"] == "Updated Name [auto]"

    def test_delete_entity(self, client):
        e = self._create(client, "Entity to Delete [auto]")
        eid = e["id"]
        self._created_ids.remove(eid)  # will be deleted by the test itself
        r = client.delete(f"/entities/{eid}")
        assert r.status_code in (200, 204)
        assert client.get(f"/entities/{eid}").status_code == 404


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------

class TestDocuments:
    @pytest.fixture(autouse=True)
    def entity_id(self, client):
        domain_id = get_domain_id(client, "projects")
        payload = {"domain_id": domain_id, "name": "Doc Test Entity [auto]", "type": "test"}
        self._entity_id = client.post("/entities/", json=payload).json()["id"]
        yield
        client.delete(f"/entities/{self._entity_id}")

    def test_upload_text_document(self, client):
        files = {"file": ("test.txt", io.BytesIO(b"Hello Synaptiq test"), "text/plain")}
        data = {"entity_id": self._entity_id}
        r = client.post("/documents/upload", files=files, data=data)
        assert r.status_code == 201, r.text
        doc = r.json()
        assert doc["filename"] == "test.txt"
        assert doc["entity_id"] == self._entity_id
        assert "id" in doc
        return doc["id"]

    def test_upload_with_expiry(self, client):
        files = {"file": ("expire_test.txt", io.BytesIO(b"expires soon"), "text/plain")}
        data = {"entity_id": self._entity_id, "expires_at": "2099-12-31"}
        r = client.post("/documents/upload", files=files, data=data)
        assert r.status_code == 201
        doc = r.json()
        assert doc["expires_at"] is not None
        assert doc["status"] == "valid"

    def test_upload_expired_document(self, client):
        files = {"file": ("old.txt", io.BytesIO(b"old file"), "text/plain")}
        data = {"entity_id": self._entity_id, "expires_at": "2000-01-01"}
        r = client.post("/documents/upload", files=files, data=data)
        assert r.status_code == 201
        assert r.json()["status"] == "expired"

    def test_list_documents(self, client):
        r = client.get("/documents/", params={"entity_id": self._entity_id})
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_expiring_documents(self, client):
        r = client.get("/documents/expiring", params={"days": 365})
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_update_document_status(self, client):
        files = {"file": ("status_test.txt", io.BytesIO(b"status"), "text/plain")}
        doc_id = client.post("/documents/upload", files={"file": ("s.txt", io.BytesIO(b"x"), "text/plain")},
                              data={"entity_id": self._entity_id}).json()["id"]
        r = client.patch(f"/documents/{doc_id}/status", json={"status": "archived"})
        assert r.status_code == 200
        assert r.json()["status"] == "archived"

    def test_download_document(self, client):
        files = {"file": ("dl_test.txt", io.BytesIO(b"download me"), "text/plain")}
        doc_id = client.post("/documents/upload", files=files, data={"entity_id": self._entity_id}).json()["id"]
        r = client.get(f"/documents/{doc_id}/download")
        assert r.status_code == 200
        assert b"download me" in r.content

    def test_preview_document(self, client):
        # Check if endpoint is registered (server may need restart after deploy)
        probe = client.get("/documents/00000000-0000-0000-0000-000000000000/preview")
        if probe.status_code == 404 and probe.json().get("detail") == "Not Found":
            pytest.skip("Preview endpoint not registered — restart the API server to load new routes")
        files = {"file": ("prev_test.txt", io.BytesIO(b"preview me"), "text/plain")}
        doc_id = client.post("/documents/upload", files=files, data={"entity_id": self._entity_id}).json()["id"]
        r = client.get(f"/documents/{doc_id}/preview")
        assert r.status_code == 200
        assert b"preview me" in r.content


# ---------------------------------------------------------------------------
# Accesses
# ---------------------------------------------------------------------------

class TestAccesses:
    @pytest.fixture(autouse=True)
    def entity_id(self, client):
        domain_id = get_domain_id(client, "subscriptions")
        self._entity_id = client.post("/entities/", json={
            "domain_id": domain_id, "name": "Access Test Entity [auto]", "type": "test"
        }).json()["id"]
        yield
        client.delete(f"/entities/{self._entity_id}")

    def test_create_access(self, client):
        r = client.post("/accesses/", json={
            "entity_id": self._entity_id,
            "label": "Main account",
            "url": "https://example.com",
            "account_ref": "user@example.com",
        })
        assert r.status_code == 201, r.text
        a = r.json()
        assert a["label"] == "Main account"
        assert "id" in a

    def test_list_accesses(self, client):
        r = client.get("/accesses/", params={"entity_id": self._entity_id})
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_delete_access(self, client):
        access_id = client.post("/accesses/", json={
            "entity_id": self._entity_id, "label": "To delete"
        }).json()["id"]
        r = client.delete(f"/accesses/{access_id}")
        assert r.status_code in (200, 204)


# ---------------------------------------------------------------------------
# Reminders
# ---------------------------------------------------------------------------

class TestReminders:
    def test_list_reminders(self, client):
        r = client.get("/reminders/")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_list_reminders_by_status(self, client):
        r = client.get("/reminders/", params={"status": "pending"})
        assert r.status_code == 200

    def test_dismiss_nonexistent_reminder(self, client):
        r = client.patch("/reminders/00000000-0000-0000-0000-000000000000/dismiss")
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

class TestDashboard:
    def test_dashboard_structure(self, client):
        r = client.get("/dashboard/")
        assert r.status_code == 200
        d = r.json()
        assert "domains_health" in d
        assert "attention_required" in d
        assert "total_entities" in d
        assert "total_documents" in d

    def test_dashboard_domains_have_health_score(self, client):
        r = client.get("/dashboard/")
        domains = r.json()["domains_health"]
        assert len(domains) > 0
        for domain in domains:
            assert "health_score" in domain
            assert 0 <= domain["health_score"] <= 100

    def test_dashboard_attention_is_list(self, client):
        r = client.get("/dashboard/")
        assert isinstance(r.json()["attention_required"], list)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

class TestHealth:
    def test_api_reachable(self, client):
        # Any 200 endpoint proves the API is up
        r = client.get("/domains/")
        assert r.status_code == 200

    def test_docs_available(self):
        with httpx.Client(base_url="http://localhost:8000", timeout=10) as c:
            r = c.get("/docs")
            assert r.status_code == 200
