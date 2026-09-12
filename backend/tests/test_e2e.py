"""
End-to-end tests for FastAPI application routes.

Covers:
- GET /health
- GET /corpus/status
- POST /query (ANSWERABLE)
- POST /query (CONTRADICTORY)
- POST /query (UNKNOWN)
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["index_ready"] is True
    assert data["chunk_count"] > 0
    assert data["claim_count"] > 0
    assert data["bm25_ready"] is True
    assert data["embeddings_ready"] is True


def test_corpus_status_endpoint(client):
    response = client.get("/corpus/status")
    assert response.status_code == 200
    data = response.json()
    assert data["total_chunks"] > 0
    assert data["total_claims"] > 0
    assert data["bm25_ready"] is True
    assert data["embeddings_loaded"] is True
    assert len(data["documents"]) >= 4


def test_query_answerable(client):
    response = client.post(
        "/query",
        json={"question": "What is the tuition payment deadline for the Autumn semester?"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["state"] == "ANSWERABLE"
    assert "answer" in data
    assert len(data["citations"]) > 0 or len(data["metadata"]) > 0


def test_query_contradictory(client):
    response = client.post(
        "/query",
        json={"question": "Who must approve a graduate student late course withdrawal after week 8?"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["state"] == "CONTRADICTORY"
    assert len(data["contradiction_pairs"]) >= 1


def test_query_unknown(client):
    response = client.post(
        "/query",
        json={"question": "qwertyuiop asdfghjkl random gibberish query"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["state"] == "UNKNOWN"
    assert data["unknown_reason"] in ("no_evidence", "low_confidence")
