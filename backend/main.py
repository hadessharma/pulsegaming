import random
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

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

WORD_OF_THE_DAY = "PULSE" # This should be dynamic in a real app

class Token(BaseModel):
    access_token: str
    token_type: str

class GuessRequest(BaseModel):
    guess: str

class GameStateResponse(BaseModel):
    guesses: List[str]
    hints_used: int
    completed: bool
    won: bool
    word_of_the_day: str = None # Only reveal if completed

@app.get("/state", response_model=GameStateResponse)
async def get_state(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    state = db.query(models.GameState).filter(models.GameState.user_id == current_user.id).first()
    if not state:
        state = models.GameState(user_id=current_user.id, word_of_the_day=WORD_OF_THE_DAY)
        db.add(state)
        db.commit()
        db.refresh(state)
    
    return {
        "guesses": state.guesses,
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
