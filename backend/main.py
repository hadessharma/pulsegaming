import random
import os
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import inspect, text
from typing import List, Optional
from pydantic import BaseModel, EmailStr

import models, database, auth
from database import engine
from games.wordle.router import router as wordle_router
from games.tutor_trivia.router import router as tutor_trivia_router


# models.Base.metadata.create_all(bind=engine) # Moved to startup_event
app = FastAPI(title="PulseGaming API")

# Harden CORS for production
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
origins = [origin.strip().rstrip('/') for origin in allowed_origins_env.split(",") if origin.strip()]

# Common production and development defaults
default_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://pulsegaming.vercel.app",
    "https://pulsegaming.onrender.com"
]

for origin in default_origins:
    if origin not in origins:
        origins.append(origin)

# Add version with slash just in case browsers send it 
origins += [f"{o}/" for o in origins] 

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def ensure_game_config_hint_column() -> None:
    """
    The app's SQLAlchemy models include `game_config.hint`, but older deployments may
    have created the table before this column existed. This prevents runtime 500s.
    """
    try:
        inspector = inspect(engine)
        if "game_config" not in inspector.get_table_names():
            return

        columns = {c["name"] for c in inspector.get_columns("game_config")}
        if "hint" in columns:
            return

        # SQLite supports `ALTER TABLE ... ADD COLUMN`, Postgres also does.
        dialect = engine.dialect.name
        hint_type = "TEXT" if dialect == "sqlite" else "VARCHAR"

        with engine.begin() as conn:
            conn.execute(text(f"ALTER TABLE game_config ADD COLUMN hint {hint_type}"))

        print("Added missing `game_config.hint` column to DB schema.")
    except Exception as e:
        # Don't crash the app on startup; routes will fail with a useful error if needed.
        print(f"Warning: could not ensure `game_config.hint` column exists: {e}")

def ensure_game_history_game_type_column() -> None:
    """Ensure the game_type column exists on game_history for older DBs."""
    try:
        inspector = inspect(engine)
        if "game_history" not in inspector.get_table_names():
            return

        columns = {c["name"] for c in inspector.get_columns("game_history")}
        if "game_type" in columns:
            return

        dialect = engine.dialect.name
        col_type = "TEXT" if dialect == "sqlite" else "VARCHAR"

        with engine.begin() as conn:
            conn.execute(text(f"ALTER TABLE game_history ADD COLUMN game_type {col_type} DEFAULT 'wordle'"))

        print("Added missing `game_history.game_type` column to DB schema.")
    except Exception as e:
        print(f"Warning: could not ensure `game_history.game_type` column exists: {e}")

def ensure_game_config_tutor_trivia_day_column() -> None:
    try:
        inspector = inspect(engine)
        if "game_config" not in inspector.get_table_names():
            return
        columns = {c["name"] for c in inspector.get_columns("game_config")}
        if "tutor_trivia_day" in columns:
            return
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE game_config ADD COLUMN tutor_trivia_day INTEGER DEFAULT 1"))
        print("Added missing `game_config.tutor_trivia_day` column.")
    except Exception as e:
        print(f"Warning: could not ensure `game_config.tutor_trivia_day` column: {e}")

def ensure_game_history_is_ranked_column() -> None:
    try:
        inspector = inspect(engine)
        if "game_history" not in inspector.get_table_names():
            return
        columns = {c["name"] for c in inspector.get_columns("game_history")}
        if "is_ranked" in columns:
            return
        dialect = engine.dialect.name
        bool_type = "INTEGER" if dialect == "sqlite" else "BOOLEAN"
        default_val = "1" if dialect == "sqlite" else "TRUE"
        with engine.begin() as conn:
            conn.execute(text(f"ALTER TABLE game_history ADD COLUMN is_ranked {bool_type} DEFAULT {default_val}"))
        print("Added missing `game_history.is_ranked` column.")
    except Exception as e:
        print(f"Warning: could not ensure `game_history.is_ranked` column: {e}")

@app.on_event("startup")
async def startup_event():
    db = database.SessionLocal()
    try:
        # Create tables
        models.Base.metadata.create_all(bind=engine)

        # Ensure columns exist for older DB schemas
        ensure_game_config_hint_column()
        ensure_game_history_game_type_column()
        ensure_game_config_tutor_trivia_day_column()
        ensure_game_history_is_ranked_column()
        
        # Seed whitelist if empty
        if db.query(models.WhitelistedEmail).count() == 0:
            print("Seeding initial whitelist...")
            initial_emails = [f"user{i}@example.com" for i in range(1, 46)]
            for email in initial_emails:
                db.add(models.WhitelistedEmail(email=email))
            db.commit()
    finally:
        db.close()


# ── Mount game sub-routers ──────────────────────────────────────────
app.include_router(wordle_router)
app.include_router(tutor_trivia_router)


# ── Backward-compatibility redirects (old flat routes → /wordle/*) ──
@app.get("/state")
async def legacy_state():
    return RedirectResponse(url="/wordle/state", status_code=307)

@app.post("/guess")
async def legacy_guess():
    return RedirectResponse(url="/wordle/guess", status_code=307)

@app.post("/hint")
async def legacy_hint():
    return RedirectResponse(url="/wordle/hint", status_code=307)


# ── Shared routes (users, leaderboard, admin) ──────────────────────

class UserResponse(BaseModel):
    id: int
    email: str
    nickname: Optional[str] = None
    is_admin: bool

    class Config:
        from_attributes = True

class WhitelistEmailResponse(BaseModel):
    email: EmailStr

    class Config:
        from_attributes = True


@app.get("/leaderboard")
async def get_leaderboard(game_type: Optional[str] = 'wordle', db: Session = Depends(database.get_db)):
    # Sum scores from history per user, optionally filtered by game_type
    from sqlalchemy import func

    # Build the join condition — if a game_type filter is specified, add it
    join_condition = (models.GameHistory.user_id == models.User.id) & (models.GameHistory.is_ranked == True)
    if game_type:
        join_condition = (join_condition) & (models.GameHistory.game_type == game_type)
    
    stats = db.query(
        models.User.email,
        models.User.nickname,
        func.coalesce(func.sum(models.GameHistory.score), 0).label("total_score"),
        func.count(models.GameHistory.id).label("games_played")
    ).outerjoin(models.GameHistory, join_condition).group_by(
        models.User.id, 
        models.User.email, 
        models.User.nickname
    ).order_by(func.coalesce(func.sum(models.GameHistory.score), 0).desc()).all()
    
    results = []
    for s in stats:
        results.append({
            "email": s.email,
            "nickname": s.nickname or s.email.split('@')[0],
            "score": int(s.total_score),
            "games": s.games_played
        })
    
    return results

@app.post("/me/nickname")
async def update_nickname(data: dict, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    nickname = data.get("nickname", "").strip()
    if not nickname or len(nickname) < 3 or len(nickname) > 15:
        raise HTTPException(status_code=400, detail="Nickname must be 3-15 characters")
    
    # Check if taken
    existing = db.query(models.User).filter(models.User.nickname == nickname).first()
    if existing and existing.id != current_user.id:
        raise HTTPException(status_code=400, detail="Nickname already taken")
    
    current_user.nickname = nickname
    db.commit()
    return {"status": "ok", "nickname": nickname}

@app.get("/me", response_model=UserResponse)
async def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

# Admin Endpoints
@app.get("/admin/whitelist", response_model=List[WhitelistEmailResponse])
async def get_whitelist(db: Session = Depends(database.get_db), admin: models.User = Depends(auth.admin_required)):
    return db.query(models.WhitelistedEmail).all()

@app.post("/admin/whitelist", response_model=WhitelistEmailResponse)
async def add_to_whitelist(data: WhitelistEmailResponse, db: Session = Depends(database.get_db), admin: models.User = Depends(auth.admin_required)):
    existing = db.query(models.WhitelistedEmail).filter(models.WhitelistedEmail.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already whitelisted")
    
    new_email = models.WhitelistedEmail(email=data.email)
    db.add(new_email)
    db.commit()
    db.refresh(new_email)
    return new_email

@app.delete("/admin/whitelist/{email}")
async def remove_from_whitelist(email: str, db: Session = Depends(database.get_db), admin: models.User = Depends(auth.admin_required)):
    item = db.query(models.WhitelistedEmail).filter(models.WhitelistedEmail.email == email).first()
    if not item:
        raise HTTPException(status_code=404, detail="Email not found")
    
    db.delete(item)
    db.commit()
    return {"status": "removed"}

@app.get("/admin/game")
async def get_game_config(db: Session = Depends(database.get_db), admin: models.User = Depends(auth.admin_required)):
    config = db.query(models.GameConfig).first()
    if not config:
        return {"status": "no_game", "word_of_the_day": None, "is_active": False}
    return config

@app.post("/admin/game")
async def set_game(data: dict, db: Session = Depends(database.get_db), admin: models.User = Depends(auth.admin_required)):
    word = data.get("word", "").upper()
    hint = data.get("hint", "").strip()
    if len(word) != 5:
        raise HTTPException(status_code=400, detail="Word must be 5 letters")
    
    config = db.query(models.GameConfig).first()
    if not config:
        config = models.GameConfig(word_of_the_day=word, hint=hint, is_active=True)
        db.add(config)
    else:
        config.word_of_the_day = word
        config.hint = hint
        config.is_active = True
    
    # Reset all user states for the new word
    db.query(models.GameState).delete()
    
    db.commit()
    return {"status": "game started", "word": word}

@app.post("/admin/game/tutor-trivia")
async def update_tutor_trivia_config(data: dict, db: Session = Depends(database.get_db), admin: models.User = Depends(auth.admin_required)):
    day = data.get("day")
    if day is None:
        raise HTTPException(status_code=400, detail="Day is required")
    
    config = db.query(models.GameConfig).first()
    if not config:
        config = models.GameConfig(tutor_trivia_day=day, is_active=True)
        db.add(config)
    else:
        config.tutor_trivia_day = day
    
    db.commit()
    return {"status": "updated", "tutor_trivia_day": day}

@app.post("/admin/game/tutor-trivia/next-day")
async def next_tutor_trivia_day(db: Session = Depends(database.get_db), admin: models.User = Depends(auth.admin_required)):
    config = db.query(models.GameConfig).first()
    if not config:
        config = models.GameConfig(tutor_trivia_day=2, is_active=True)
        db.add(config)
    else:
        # Wrap around or cap at 5 since data only has 1-5 currently
        config.tutor_trivia_day = (config.tutor_trivia_day % 5) + 1
    
    db.commit()
    return {"status": "advanced", "tutor_trivia_day": config.tutor_trivia_day}

@app.delete("/admin/game")
async def delete_game(db: Session = Depends(database.get_db), admin: models.User = Depends(auth.admin_required)):
    # Total wipe of game config and all user sessions
    db.query(models.GameConfig).delete()
    db.query(models.GameState).delete()
    db.commit()
    return {"status": "wiped", "message": "All game data and sessions have been cleared."}

@app.delete("/admin/leaderboard")
async def reset_leaderboard(db: Session = Depends(database.get_db), admin: models.User = Depends(auth.admin_required)):
    # Wipe all cumulative game history
    db.query(models.GameHistory).delete()
    db.commit()
    return {"status": "reset", "message": "Leaderboard history has been cleared."}
