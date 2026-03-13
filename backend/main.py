import random
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr

import models, database, auth
from database import engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    db = database.SessionLocal()
    try:
        # Create tables
        models.Base.metadata.create_all(bind=engine)
        
        # Seed whitelist if empty
        if db.query(models.WhitelistedEmail).count() == 0:
            print("Seeding initial whitelist...")
            initial_emails = [f"user{i}@example.com" for i in range(1, 46)]
            for email in initial_emails:
                db.add(models.WhitelistedEmail(email=email))
            db.commit()
    finally:
        db.close()

# WORD_OF_THE_DAY = "PULSE" # Replaced by GameConfig in DB

class Token(BaseModel):
    access_token: str
    token_type: str

class GuessRequest(BaseModel):
    guess: str

class UserResponse(BaseModel):
    id: int
    email: str
    is_admin: bool

    class Config:
        from_attributes = True

class WhitelistEmailResponse(BaseModel):
    email: EmailStr

    class Config:
        from_attributes = True

class GameStateResponse(BaseModel):
    guesses: List[str]
    feedback: List[List[str]] # Added feedback for each guess
    hints_used: int
    completed: bool
    won: bool
    word_of_the_day: Optional[str] = None # Only reveal if completed

def calculate_feedback(guess: str, secret: str) -> List[str]:
    """Calculate Wordle feedback: correct, present, absent."""
    result = ["absent"] * 5
    secret_list = list(secret)
    guess_list = list(guess)

    # First pass: Find corrects (Green)
    for i in range(5):
        if guess_list[i] == secret_list[i]:
            result[i] = "correct"
            secret_list[i] = None # Mark as used
            guess_list[i] = None

    # Second pass: Find presents (Yellow)
    for i in range(5):
        if guess_list[i] is not None and guess_list[i] in secret_list:
            result[i] = "present"
            secret_list[secret_list.index(guess_list[i])] = None

    return result

@app.get("/state", response_model=GameStateResponse)
async def get_state(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    config = db.query(models.GameConfig).first()
    if not config or not config.is_active:
        raise HTTPException(status_code=404, detail="No active game at the moment.")

    state = db.query(models.GameState).filter(models.GameState.user_id == current_user.id).first()
    if not state:
        state = models.GameState(user_id=current_user.id, word_of_the_day=config.word_of_the_day)
        db.add(state)
        db.commit()
        db.refresh(state)
    
    # Ensure user has the current word if the admin changed it
    if state.word_of_the_day != config.word_of_the_day:
        state.word_of_the_day = config.word_of_the_day
        state.guesses = []
        state.hints_used = 0
        state.completed = False
        state.won = False
        db.commit()
    
    return {
        "guesses": state.guesses,
        "feedback": [calculate_feedback(g, state.word_of_the_day) for g in state.guesses],
        "hints_used": state.hints_used,
        "completed": state.completed,
        "won": state.won,
        "word_of_the_day": state.word_of_the_day if state.completed else None
    }

@app.post("/guess")
async def submit_guess(request: GuessRequest, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    state = db.query(models.GameState).filter(models.GameState.user_id == current_user.id).first()
    if state.completed:
        raise HTTPException(status_code=400, detail="Game already completed")
    
    guess = request.guess.upper()
    if len(guess) != 5:
        raise HTTPException(status_code=400, detail="Guess must be 5 letters")
    
    new_guesses = list(state.guesses)
    new_guesses.append(guess)
    state.guesses = new_guesses
    
    if guess == state.word_of_the_day:
        state.completed = True
        state.won = True
    elif len(new_guesses) >= 6:
        state.completed = True
        state.won = False
    
    db.commit()
    return {"status": "ok", "completed": state.completed, "won": state.won}

@app.post("/hint")
async def get_hint(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    state = db.query(models.GameState).filter(models.GameState.user_id == current_user.id).first()
    if state.completed:
        raise HTTPException(status_code=400, detail="Game already completed")
    
    # Logic to find a letter not yet revealed in its correct position
    word = state.word_of_the_day
    correct_positions = [False] * 5
    for g in state.guesses:
        for i, char in enumerate(g):
            if char == word[i]:
                correct_positions[i] = True
    
    available_indices = [i for i, val in enumerate(correct_positions) if not val]
    if not available_indices:
        raise HTTPException(status_code=400, detail="No more hints available")
    
    hint_idx = random.choice(available_indices)
    state.hints_used += 1
    db.commit()
    
    return {"letter": word[hint_idx], "position": hint_idx}

@app.get("/leaderboard")
async def get_leaderboard(db: Session = Depends(database.get_db)):
    # Score = total guesses + hints_used
    # Completed games first, sorted by score, then email
    all_states = db.query(models.GameState).join(models.User).filter(models.GameState.completed == True).all()
    
    results = []
    for s in all_states:
        score = len(s.guesses) + s.hints_used
        results.append({
            "email": s.user.email,
            "guesses": len(s.guesses),
            "hints": s.hints_used,
            "score": score
        })
    
    results.sort(key=lambda x: (x['score'], x['email']))
    return results

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

@app.post("/admin/game")
async def set_game(data: dict, db: Session = Depends(database.get_db), admin: models.User = Depends(auth.admin_required)):
    word = data.get("word", "").upper()
    if len(word) != 5:
        raise HTTPException(status_code=400, detail="Word must be 5 letters")
    
    config = db.query(models.GameConfig).first()
    if not config:
        config = models.GameConfig(word_of_the_day=word, is_active=True)
        db.add(config)
    else:
        config.word_of_the_day = word
        config.is_active = True
    
    # Reset all user states for the new word
    db.query(models.GameState).delete()
    
    db.commit()
    return {"status": "game started", "word": word}

@app.delete("/admin/game")
async def stop_game(db: Session = Depends(database.get_db), admin: models.User = Depends(auth.admin_required)):
    config = db.query(models.GameConfig).first()
    if config:
        config.is_active = False
        db.commit()
    return {"status": "game stopped"}
