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
# from games.wordle.router import router as wordle_router
# from games.tutor_trivia.router import router as tutor_trivia_router
from games.logic_sprint.router import router as logic_sprint_router
from games.asu_trivia.router import router as asu_trivia_router


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

def ensure_game_config_wordle_day_column() -> None:
    try:
        inspector = inspect(engine)
        if "game_config" not in inspector.get_table_names():
            return
        columns = {c["name"] for c in inspector.get_columns("game_config")}
        if "wordle_day" in columns:
            return
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE game_config ADD COLUMN wordle_day INTEGER DEFAULT 1"))
        print("Added missing `game_config.wordle_day` column.")
    except Exception as e:
        print(f"Warning: could not ensure `game_config.wordle_day` column: {e}")

def ensure_game_config_logic_sprint_day_column() -> None:
    try:
        inspector = inspect(engine)
        if "game_config" not in inspector.get_table_names():
            return
        columns = {c["name"] for c in inspector.get_columns("game_config")}
        if "logic_sprint_day" in columns:
            return
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE game_config ADD COLUMN logic_sprint_day INTEGER DEFAULT 1"))
        print("Added missing `game_config.logic_sprint_day` column.")
    except Exception as e:
        print(f"Warning: could not ensure `game_config.logic_sprint_day` column: {e}")

def ensure_game_config_asu_trivia_day_column() -> None:
    try:
        inspector = inspect(engine)
        if "game_config" not in inspector.get_table_names():
            return
        columns = {c["name"] for c in inspector.get_columns("game_config")}
        if "asu_trivia_day" in columns:
            return
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE game_config ADD COLUMN asu_trivia_day INTEGER DEFAULT 1"))
        print("Added missing `game_config.asu_trivia_day` column.")
    except Exception as e:
        print(f"Warning: could not ensure `game_config.asu_trivia_day` column: {e}")

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

def ensure_logic_sprint_state_columns() -> None:
    try:
        inspector = inspect(engine)
        if "logic_sprint_states" not in inspector.get_table_names():
            return
        columns = {c["name"] for c in inspector.get_columns("logic_sprint_states")}
        dialect = engine.dialect.name
        
        with engine.begin() as conn:
            if "day" not in columns:
                conn.execute(text("ALTER TABLE logic_sprint_states ADD COLUMN day INTEGER DEFAULT 1"))
                print("Added `logic_sprint_states.day` column.")
            if "set_number" not in columns:
                conn.execute(text("ALTER TABLE logic_sprint_states ADD COLUMN set_number INTEGER DEFAULT 1"))
                print("Added `logic_sprint_states.set_number` column.")
            if "current_task_index" not in columns:
                conn.execute(text("ALTER TABLE logic_sprint_states ADD COLUMN current_task_index INTEGER DEFAULT 0"))
                print("Added `logic_sprint_states.current_task_index` column.")
    except Exception as e:
        print(f"Warning: could not ensure `logic_sprint_states` columns: {e}")

def ensure_asu_trivia_state_start_time_column() -> None:
    try:
        inspector = inspect(engine)
        if "asu_trivia_states" not in inspector.get_table_names():
            return
        columns = {c["name"] for c in inspector.get_columns("asu_trivia_states")}
        dialect = engine.dialect.name
        
        with engine.begin() as conn:
            if "question_start_time" not in columns:
                col_type = "DATETIME" if dialect == "sqlite" else "TIMESTAMP"
                conn.execute(text(f"ALTER TABLE asu_trivia_states ADD COLUMN question_start_time {col_type}"))
                print("Added `asu_trivia_states.question_start_time` column.")
            if "session_start_time" not in columns:
                col_type = "DATETIME" if dialect == "sqlite" else "TIMESTAMP"
                conn.execute(text(f"ALTER TABLE asu_trivia_states ADD COLUMN session_start_time {col_type}"))
                print("Added `asu_trivia_states.session_start_time` column.")
    except Exception as e:
        print(f"Warning: could not ensure `asu_trivia_states` columns: {e}")

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
        ensure_game_config_wordle_day_column()
        ensure_game_config_logic_sprint_day_column()
        ensure_game_config_asu_trivia_day_column()
        ensure_game_history_is_ranked_column()
        ensure_logic_sprint_state_columns()
        ensure_asu_trivia_state_start_time_column()
        
        # Seed whitelist if empty
        if db.query(models.WhitelistedEmail).count() == 0:
            print("Seeding initial whitelist...")
            initial_emails = [f"user{i}@example.com" for i in range(1, 46)]
            for email in initial_emails:
                db.add(models.WhitelistedEmail(email=email))
            db.commit()

        # Seed Logic Sprint sets if EMPTY
        if db.query(models.LogicSprintQuestionSet).count() == 0:
            print("Seeding Logic Sprint question sets...")
            from games.logic_sprint.task_generator import generate_task
            for set_num in range(1, 6):
                # Generate 35 tasks per set
                # We vary the difficulty from 0.0 to 1.0
                tasks_list = []
                for i in range(35):
                    difficulty = i / 35.0
                    tasks_list.append(generate_task(difficulty))
                
                db.add(models.LogicSprintQuestionSet(
                    set_number=set_num,
                    tasks=tasks_list
                ))
            db.commit()
            print("Logic Sprint question sets seeded.")
    finally:
        db.close()


@app.get("/")
async def read_root():
    return {"status": "online", "message": "PulseGaming API is healthy"}


# ── Mount game sub-routers ──────────────────────────────────────────
# app.include_router(wordle_router)
# app.include_router(tutor_trivia_router)
app.include_router(logic_sprint_router)
app.include_router(asu_trivia_router)


# @app.get("/state")
# async def legacy_state():
#     return RedirectResponse(url="/wordle/state", status_code=307)
# 
# @app.post("/guess")
# async def legacy_guess():
#     return RedirectResponse(url="/wordle/guess", status_code=307)
# 
# @app.post("/hint")
# async def legacy_hint():
#     return RedirectResponse(url="/wordle/hint", status_code=307)


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

class WordleScheduleRequest(BaseModel):
    day: int
    word: str
    hint: Optional[str] = None


@app.get("/leaderboard")
async def get_leaderboard(game_type: Optional[str] = 'asu_trivia', db: Session = Depends(database.get_db)):
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
        func.count(models.GameHistory.id).label("games_played"),
        func.coalesce(func.sum(models.GameHistory.guesses_count), 0).label("total_solved")
    ).outerjoin(models.GameHistory, join_condition).group_by(
        models.User.id, 
        models.User.email, 
        models.User.nickname
    ).having(func.count(models.GameHistory.id) > 0).order_by(func.coalesce(func.sum(models.GameHistory.score), 0).desc()).all()
    
    results = []
    for s in stats:
        results.append({
            "email": s.email,
            "nickname": s.nickname or s.email.split('@')[0],
            "score": int(s.total_score),
            "games": s.games_played,
            "solved": int(s.total_solved)
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

@app.post("/admin/game/logic-sprint")
async def update_logic_sprint_config(data: dict, db: Session = Depends(database.get_db), admin: models.User = Depends(auth.admin_required)):
    day = data.get("day")
    if day is None:
        raise HTTPException(status_code=400, detail="Day is required")
    
    config = db.query(models.GameConfig).first()
    if not config:
        config = models.GameConfig(logic_sprint_day=day, is_active=True)
        db.add(config)
    else:
        config.logic_sprint_day = day
    
    db.commit()
    return {"status": "updated", "logic_sprint_day": day}

@app.post("/admin/game/asu-trivia")
async def update_asu_trivia_config(data: dict, db: Session = Depends(database.get_db), admin: models.User = Depends(auth.admin_required)):
    day = data.get("day")
    if day is None:
        raise HTTPException(status_code=400, detail="Day is required")
    
    config = db.query(models.GameConfig).first()
    if not config:
        config = models.GameConfig(asu_trivia_day=day, is_active=True)
        db.add(config)
    else:
        config.asu_trivia_day = day
    
    db.commit()
    return {"status": "updated", "asu_trivia_day": day}


# @app.get("/admin/wordle/schedule")
# async def get_wordle_schedule(db: Session = Depends(database.get_db)), admin: models.User = Depends(auth.admin_required)):
#     return db.query(models.WordleWord).order_by(models.WordleWord.day).all()
# 
# @app.post("/admin/wordle/schedule")
# async def set_wordle_scheduled_word(data: WordleScheduleRequest, db: Session = Depends(database.get_db)), admin: models.User = Depends(auth.admin_required)):
#     word = data.word.upper().strip()
#     if len(word) != 5:
#         raise HTTPException(status_code=400, detail="Word must be 5 letters")
#     
#     existing = db.query(models.WordleWord).filter(models.WordleWord.day == data.day).first()
#     if existing:
#         existing.word = word
#         existing.hint = data.hint
#     else:
#         new_word = models.WordleWord(day=data.day, word=word, hint=data.hint)
#         db.add(new_word)
#     
#     db.commit()
#     return {"status": "scheduled", "day": data.day, "word": word}
# 
# @app.post("/admin/wordle/active-day")
# async def set_wordle_active_day(data: dict, db: Session = Depends(database.get_db)), admin: models.User = Depends(auth.admin_required)):
#     day = data.get("day")
#     if day is None:
#         raise HTTPException(status_code=400, detail="Day is required")
#     
#     config = db.query(models.GameConfig).first()
#     if not config:
#         config = models.GameConfig(wordle_day=day, is_active=True)
#         db.add(config)
#     else:
#         config.wordle_day = day
#     
#     db.commit()
#     return {"status": "updated", "wordle_day": day}

# @app.post("/admin/game/tutor-trivia/next-day")
# async def next_tutor_trivia_day(db: Session = Depends(database.get_db), admin: models.User = Depends(auth.admin_required)):
#     config = db.query(models.GameConfig).first()
#     if not config:
#         config = models.GameConfig(tutor_trivia_day=2, is_active=True)
#         db.add(config)
#     else:
#         # Wrap around or cap at 5 since data only has 1-5 currently
#         config.tutor_trivia_day = (config.tutor_trivia_day % 5) + 1
#     
#     db.commit()
#     return {"status": "advanced", "tutor_trivia_day": config.tutor_trivia_day}

@app.delete("/admin/game")
async def delete_game(db: Session = Depends(database.get_db), admin: models.User = Depends(auth.admin_required)):
    # Total wipe of game config and all user sessions
    db.query(models.GameConfig).delete()
    db.query(models.GameState).delete()
    db.query(models.LogicSprintState).delete()
    db.query(models.TutorTriviaState).delete()
    db.query(models.ASUTriviaState).delete()
    db.commit()
    return {"status": "wiped", "message": "All game data and sessions have been cleared."}

@app.delete("/admin/leaderboard")
async def reset_leaderboard(db: Session = Depends(database.get_db), admin: models.User = Depends(auth.admin_required)):
    # Wipe all cumulative game history AND current session states to allow replay
    db.query(models.GameHistory).delete()
    db.query(models.LogicSprintState).delete()
    db.query(models.TutorTriviaState).delete()
    db.query(models.ASUTriviaState).delete()
    db.query(models.GameState).delete()
    db.commit()
    return {"status": "reset", "message": "Leaderboard history and all game states have been cleared."}
