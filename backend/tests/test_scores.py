import pytest
from fastapi.testclient import TestClient
from scores import create_app


@pytest.fixture
def client(tmp_path):
    app = create_app(f"sqlite:///{tmp_path / 'test.sqlite'}")
    try:
        with TestClient(app) as client:
            yield client
    finally:
        app.state.engine.dispose()


def test_leaderboard_starts_empty(client):
    response = client.get("/scores/")
    assert response.status_code == 200
    assert response.json() == []


def test_post_score_then_read_leaderboard(client):
    response = client.post("/scores/", json={"player": "  Ada  ", "points": 80})

    assert response.status_code == 201
    saved = response.json()
    assert saved["id"] == 1
    assert saved["player"] == "Ada"
    assert saved["points"] == 80
    assert isinstance(saved["created_at"], str)
    assert client.get("/scores/").json() == [saved]


@pytest.mark.parametrize("payload", [
    {"player": "", "points": 80},
    {"player": " \t\n", "points": 80},
    {"player": "A" * 25, "points": 80},
    {"player": 42, "points": 80},
    {"player": None, "points": 80},
    {"player": "Ada", "points": -1},
    {"player": "Ada", "points": 91},
    {"player": "Ada", "points": True},
    {"player": "Ada", "points": False},
    {"player": "Ada", "points": 80.0},
    {"player": "Ada", "points": "80"},
    {"player": "Ada", "points": None},
    {"player": "Ada", "points": 80, "extra": "refusé"},
    {"points": 80},
    {"player": "Ada"},
])
def test_invalid_score_does_not_write(client, payload):
    response = client.post("/scores/", json=payload)

    assert response.status_code == 422
    assert client.get("/scores/").json() == []


@pytest.mark.parametrize(("player", "points"), [("A", 0), ("A" * 24, 90)])
def test_score_boundaries_are_accepted(client, player, points):
    response = client.post("/scores/", json={"player": player, "points": points})

    assert response.status_code == 201
    assert response.json()["player"] == player
    assert response.json()["points"] == points


def test_leaderboard_returns_top_ten_with_older_equal_scores_first(client):
    for number, points in enumerate([10, 70, 10, 0, 90, 40, 70, 1, 80, 20, 30, 60], start=1):
        response = client.post("/scores/", json={"player": f"P{number}", "points": points})
        assert response.status_code == 201

    rows = client.get("/scores/").json()
    assert [row["id"] for row in rows] == [5, 9, 2, 7, 12, 6, 11, 10, 1, 3]


def test_score_persists_after_app_is_recreated(tmp_path):
    database_url = f"sqlite:///{tmp_path / 'persistent.sqlite'}"
    first_app = create_app(database_url)
    try:
        with TestClient(first_app) as client:
            response = client.post("/scores/", json={"player": "Ada", "points": 90})
            assert response.status_code == 201
            saved = response.json()
    finally:
        first_app.state.engine.dispose()

    second_app = create_app(database_url)
    try:
        with TestClient(second_app) as client:
            response = client.get("/scores/")
            assert response.status_code == 200
            assert response.json() == [saved]
    finally:
        second_app.state.engine.dispose()
        
def test_second_score_updates_player_stats(client):
    response = client.post("/scores/", json={"player": "Ada", "points": 80})
    assert response.status_code == 201
    response = client.post("/scores/", json={"player": "Ada", "points": 90})
    assert response.status_code == 201
    
    response = client.get("/players/")
    assert response.status_code == 200
    players = response.json()
    
    assert len(players) == 1
    player_stats = players[0]
    assert player_stats["player"] == "Ada"
    assert player_stats["total_points"] == 170  # 80 + 90
    assert player_stats["games_played"] == 2
    assert player_stats["average_points"] == 85.0  # (80 + 90) / 2
