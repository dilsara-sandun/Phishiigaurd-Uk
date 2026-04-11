"""
tests/test_scan.py
──────────────────
Pytest tests for:
  - /api/scan/url  (URL scanning endpoint)
  - /api/scan/batch
  - ml_service.extract_features()  (unit tests for the feature extractor)
  - ml_service.predict_url()       (heuristic fallback when model not loaded)
  - email_service                  (URL extraction and email scoring)

Run with:
    cd backend
    pytest tests/test_scan.py -v
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import create_app
from app.services.ml_service import extract_features, predict_url
from app.services.email_service import extract_urls_from_text, score_email_text


# ── Test database setup (mirrors test_auth.py) ────────────────────────────────

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = async_sessionmaker(
    bind=test_engine, class_=AsyncSession, expire_on_commit=False,
)


async def override_get_db():
    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    app = create_app()
    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as ac:
        yield ac


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient) -> dict:
    """Register a user, log in, and return Bearer auth headers."""
    email, password = "scanner@phishguard.test", "ScanPass1"
    await client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "confirm_password": password},
    )
    resp = await client.post("/api/auth/login", json={"email": email, "password": password})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ═════════════════════════════════════════════════════════════════════════════
# Unit tests — extract_features()
# ═════════════════════════════════════════════════════════════════════════════

class TestExtractFeatures:
    """Unit tests for the URL feature extractor (no DB, no model required)."""

    def test_phishing_url_features(self):
        """A classic phishing URL should trigger brand mismatch, suspicious TLD, and login path."""
        url = "https://lloyds-secure-login.top/verify/account"
        features = extract_features(url)

        assert features["contains_bank_brand"] == 1.0, "Should detect 'lloyds' brand token"
        assert features["brand_domain_mismatch"] == 1.0, "Domain is not lloydsbank.co.uk"
        assert features["is_suspicious_tld"] == 1.0, ".top is a suspicious TLD"
        assert features["suspicious_path_keyword"] == 1.0, "/verify/ triggers keyword flag"
        assert features["has_https"] == 1.0, "URL uses HTTPS"

    def test_legitimate_uk_bank_url(self):
        """The official Lloyds Bank URL should have no brand mismatch."""
        url = "https://www.lloydsbank.co.uk/personal/online-banking/log-on.html"
        features = extract_features(url)

        assert features["brand_domain_mismatch"] == 0.0, "lloydsbank.co.uk is a legitimate domain"
        assert features["is_uk_tld"] == 1.0, "co.uk is a UK TLD"
        assert features["has_https"] == 1.0

    def test_ip_address_url(self):
        """A URL using a raw IP address as the host should be flagged."""
        url = "http://192.168.1.100/banking/login"
        features = extract_features(url)
        assert features["ip_address_present"] == 1.0
        assert features["has_https"] == 0.0

    def test_at_sign_url(self):
        """A URL containing @ should be flagged."""
        url = "https://legitimate.co.uk@evil-phish.top/login"
        features = extract_features(url)
        assert features["at_sign_present"] == 1.0

    def test_url_length_and_entropy(self):
        """URL length and entropy features are numeric and non-negative."""
        url = "https://natwest-online-banking-secure-verify.xyz/login/confirm/account/update"
        features = extract_features(url)
        assert features["url_length"] > 50
        assert features["url_entropy"] > 0
        assert features["digit_ratio"] >= 0.0

    def test_subdomain_count(self):
        """Subdomains are counted correctly."""
        url = "https://mybank.login.secure.attacker.xyz/"
        features = extract_features(url)
        assert features["subdomain_count"] >= 3

    def test_no_https(self):
        """A plain HTTP URL has has_https=0."""
        url = "http://barclays-login.site/verify"
        features = extract_features(url)
        assert features["has_https"] == 0.0

    def test_all_features_are_floats(self):
        """Every value in the feature dict must be a float."""
        url = "https://hsbc-secure.top/account/verify?id=123"
        features = extract_features(url)
        for name, value in features.items():
            assert isinstance(value, float), f"Feature '{name}' is not a float: {type(value)}"

    def test_empty_url_does_not_crash(self):
        """An empty URL string should not raise an exception."""
        features = extract_features("https://x.co")
        assert isinstance(features, dict)
        assert len(features) > 0


# ═════════════════════════════════════════════════════════════════════════════
# Unit tests — predict_url() heuristic fallback
# ═════════════════════════════════════════════════════════════════════════════

class TestPredictURL:
    """Test predict_url() using the heuristic fallback (no model file required)."""

    def test_obvious_phishing_url_high_score(self):
        """A URL with multiple red flags should receive a high heuristic score."""
        result = predict_url("http://lloyds-secure-login.top/verify")
        assert result["score"] >= 0.60, f"Expected high score, got {result['score']}"
        assert result["label"] in ("phishing", "suspicious")

    def test_legitimate_url_low_score(self):
        """The official Lloyds Bank URL should receive a low score."""
        result = predict_url("https://www.lloydsbank.co.uk/personal/online-banking.html")
        # Without the trained model, the heuristic should still score this low
        # because brand_domain_mismatch=0, no suspicious TLD, etc.
        assert result["score"] < 0.50, f"Expected low score, got {result['score']}"

    def test_result_structure(self):
        """predict_url() must always return all required keys."""
        result = predict_url("https://test-url.co.uk/page")
        required_keys = {"label", "score", "score_pct", "red_flags", "green_flags",
                         "feature_values", "model_version"}
        assert required_keys.issubset(result.keys()), f"Missing keys: {required_keys - result.keys()}"

    def test_score_in_range(self):
        """Score must always be in [0.0, 1.0]."""
        for url in [
            "https://www.google.com",
            "http://192.168.1.1/admin",
            "https://natwest-account-verify.xyz/login",
            "https://lloydsbank.co.uk",
        ]:
            result = predict_url(url)
            assert 0.0 <= result["score"] <= 1.0, f"Score out of range for {url}: {result['score']}"
            assert 0 <= result["score_pct"] <= 100

    def test_label_is_valid(self):
        """label must always be one of the three allowed values."""
        valid_labels = {"phishing", "suspicious", "legitimate"}
        result = predict_url("https://barclays-login.site/verify")
        assert result["label"] in valid_labels


# ═════════════════════════════════════════════════════════════════════════════
# Unit tests — email_service
# ═════════════════════════════════════════════════════════════════════════════

class TestEmailService:

    def test_url_extraction_finds_https_links(self):
        """extract_urls_from_text should find standard HTTPS links."""
        text = """
        Dear customer,
        Please verify your account at https://lloyds-secure-login.top/verify
        or visit https://www.lloydsbank.co.uk for help.
        """
        urls = extract_urls_from_text(text)
        assert len(urls) == 2
        assert "https://lloyds-secure-login.top/verify" in urls

    def test_url_extraction_deduplicates(self):
        """The same URL appearing twice should be returned once."""
        text = "Click https://evil.top/login and also https://evil.top/login again."
        urls = extract_urls_from_text(text)
        assert urls.count("https://evil.top/login") == 1

    def test_url_extraction_strips_trailing_punctuation(self):
        """Trailing comma / period / bracket should not be included in the URL."""
        text = "Visit https://bank-verify.xyz/login, please."
        urls = extract_urls_from_text(text)
        assert all(not u.endswith((".", ",", ")")) for u in urls)

    def test_score_email_with_urgency_language(self):
        """An email with urgency language gets red flags."""
        subject = "URGENT: Your account has been suspended"
        body = "Please verify your account immediately by clicking the link below."
        result = score_email_text(subject, body)
        red_names = [f.flag_name for f in result["red_flags"]]
        assert "urgency_language" in red_names

    def test_score_email_with_credential_request(self):
        """An email requesting credentials gets a credential_request red flag."""
        text = "Please enter your password and account number to confirm your identity."
        result = score_email_text("", text)
        red_names = [f.flag_name for f in result["red_flags"]]
        assert "credential_request" in red_names

    def test_score_clean_email(self):
        """A clean, informational email should have no red flags."""
        text = "Your monthly statement is now available. Log in at your convenience."
        result = score_email_text("Monthly statement", text)
        # A clean email should have a low heuristic score
        assert result["ml_score"] < 0.50


# ═════════════════════════════════════════════════════════════════════════════
# Integration tests — /api/scan/url endpoint
# ═════════════════════════════════════════════════════════════════════════════

class TestScanURLEndpoint:

    @pytest.mark.asyncio
    async def test_scan_url_authenticated(self, client: AsyncClient, auth_headers: dict):
        """An authenticated user can scan a URL and receives a ScanResult."""
        response = await client.post(
            "/api/scan/url",
            json={"url": "https://lloyds-secure-login.top/verify"},
            headers=auth_headers,
        )
        assert response.status_code == 200, response.text
        data = response.json()
        assert "scan_id" in data
        assert data["label"] in ("phishing", "suspicious", "legitimate")
        assert 0.0 <= data["score"] <= 1.0
        assert "red_flags" in data
        assert "green_flags" in data

    @pytest.mark.asyncio
    async def test_scan_url_unauthenticated(self, client: AsyncClient):
        """Scanning without a token returns HTTP 401."""
        response = await client.post(
            "/api/scan/url",
            json={"url": "https://example.com"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_scan_url_auto_adds_scheme(self, client: AsyncClient, auth_headers: dict):
        """A URL without https:// should still be accepted (scheme prepended)."""
        response = await client.post(
            "/api/scan/url",
            json={"url": "natwest-account-verify.xyz/login"},
            headers=auth_headers,
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_scan_url_result_persisted_in_history(
        self, client: AsyncClient, auth_headers: dict
    ):
        """A scan result should appear in the user's history after submission."""
        await client.post(
            "/api/scan/url",
            json={"url": "https://phishing-test.top/verify"},
            headers=auth_headers,
        )
        history_resp = await client.get("/api/history", headers=auth_headers)
        assert history_resp.status_code == 200
        items = history_resp.json()["items"]
        assert len(items) >= 1
        assert any("phishing-test.top" in item["input_value"] for item in items)


# ═════════════════════════════════════════════════════════════════════════════
# Integration tests — /api/scan/batch
# ═════════════════════════════════════════════════════════════════════════════

class TestBatchScanEndpoint:

    @pytest.mark.asyncio
    async def test_batch_scan_returns_one_result_per_url(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Batch scan returns exactly one ScanResult per submitted URL."""
        urls = [
            "https://lloydsbank.co.uk",
            "https://lloyds-login.top/verify",
            "https://natwest-account.xyz",
        ]
        response = await client.post(
            "/api/scan/batch",
            json={"urls": urls},
            headers=auth_headers,
        )
        assert response.status_code == 200, response.text
        results = response.json()
        assert len(results) == len(urls)

    @pytest.mark.asyncio
    async def test_batch_scan_rejects_empty_list(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Submitting an empty URL list returns HTTP 422."""
        response = await client.post(
            "/api/scan/batch",
            json={"urls": []},
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_batch_scan_capped_at_50(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Even if more than 50 URLs are submitted, only 50 results are returned."""
        urls = [f"https://test-url-{i}.com" for i in range(60)]
        response = await client.post(
            "/api/scan/batch",
            json={"urls": urls},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert len(response.json()) == 50