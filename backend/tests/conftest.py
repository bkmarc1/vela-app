import os
import time
import subprocess
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://hospitality-ai-12.preview.emergentagent.com").rstrip("/")


def _create_session():
    """Insert a user + session in MongoDB and return (token, user_id)."""
    ts = int(time.time() * 1000)
    user_id = f"test-user-{ts}"
    token = f"test_session_{ts}"
    script = f"""
    use('test_database');
    db.users.insertOne({{user_id:'{user_id}', email:'test.vela.{ts}@example.com', name:'Propul8 Tester', picture:'', created_at:new Date()}});
    db.user_sessions.insertOne({{user_id:'{user_id}', session_token:'{token}', expires_at:new Date(Date.now()+7*24*60*60*1000), created_at:new Date()}});
    """
    subprocess.run(["mongosh", "--quiet", "--eval", script], check=True, capture_output=True)
    return token, user_id


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def session_creds():
    return _create_session()


@pytest.fixture(scope="session")
def auth_headers(session_creds):
    token, _ = session_creds
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def api():
    s = requests.Session()
    return s
