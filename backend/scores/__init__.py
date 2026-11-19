from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import AliasPath, BaseModel, ConfigDict, Field, StringConstraints
from sqlalchemy import ForeignKey, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship

class Base(DeclarativeBase):
    pass

class Player(Base):
    __tablename__ = "player"
    id: Mapped[int] = mapped_column(primary_key=True)
    player: Mapped[str] = mapped_column(unique=True, nullable=False)
    total_points: Mapped[int]
    games_played: Mapped[int]
    average_points: Mapped[float]


class Score(Base):
    __tablename__ = "score"
    id: Mapped[int] = mapped_column(primary_key=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("player.id"))
    player: Mapped[Player] = relationship()
    points: Mapped[int]
    created_at: Mapped[str] = mapped_column(default=lambda: datetime.now(timezone.utc).isoformat())


class ScoreCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    player: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=24, strict=True)]
    points: Annotated[int, Field(strict=True, ge=0, le=90)]

class ScoreRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    player: str = Field(validation_alias=AliasPath("player", "player"))
    player_id: int
    points: int
    created_at: str
    
class PlayerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    player: str
    total_points: int
    games_played: int
    average_points: float
    

def create_app(database_url=None):
    if database_url is None:
        folder = Path(__file__).resolve().parent.parent / "instance"
        folder.mkdir(exist_ok=True)
        database_url = f"sqlite:///{folder / 'scores.sqlite'}"
    engine = create_engine(database_url, connect_args={"check_same_thread": False})
    # Supplied project setup. create_all creates missing tables, not migrations.
    Base.metadata.create_all(engine)
    app = FastAPI(title="ECM · Scores")
    app.state.engine = engine
    app.add_middleware(CORSMiddleware,
        allow_origins=["http://localhost:5175", "http://127.0.0.1:5175"],
        allow_methods=["GET", "POST"], allow_headers=["Content-Type"])

    def get_session():
        with Session(engine) as session:
            yield session

    DatabaseSession = Annotated[Session, Depends(get_session)]

    @app.get("/scores/", response_model=list[ScoreRead])
    def list_scores(session: DatabaseSession):
        return session.scalars(select(Score).order_by(Score.points.desc(), Score.id).limit(10)).all()

    @app.post("/scores/", response_model=ScoreRead, status_code=201)
    def create_score(payload: ScoreCreate, session: DatabaseSession):
        joueur = session.scalars(select(Player).where(Player.player == payload.player)).first()
        if not joueur:
            joueur = Player(
                player=payload.player, 
                total_points=payload.points, 
                games_played=1, 
                average_points=payload.points)
            session.add(joueur)
        else:
            joueur.total_points += payload.points
            joueur.games_played += 1
            joueur.average_points = joueur.total_points / joueur.games_played
        score = Score(
            player=joueur, 
            points=payload.points
        )
        
        session.add(score)
        session.commit()
        session.refresh(score)
        
        return score

    @app.get("/players/", response_model=list[PlayerRead])
    def list_players(session: DatabaseSession):
        return session.scalars(select(Player).order_by(Player.player)).all()
    return app
