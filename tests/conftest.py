import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import db, seed  # noqa: E402


@pytest.fixture()
def conn(tmp_path, monkeypatch):
    """A fresh, empty shop database for every test."""
    monkeypatch.setenv("KIRANA_DB", str(tmp_path / "test.db"))
    db.init_db()
    connection = db.connect()
    yield connection
    connection.commit()
    connection.close()


@pytest.fixture()
def demo(conn):
    """The sample shop."""
    seed.seed_demo(conn)
    conn.commit()
    return conn
