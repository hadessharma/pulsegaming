from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

import models, auth, database

router = APIRouter(prefix="/wordle", tags=["wordle"])


class GuessRequest(BaseModel):
    guess: str


class GameStateResponse(BaseModel):
    guesses: List[str]
    feedback: List[List[str]]
    hints_used: int
    completed: bool
    won: bool
    word_of_the_day: str | None = None
    hint: str | None = None
    current_score: int = 0


def calculate_feedback(guess: str, secret: str) -> List[str]:
    """Calculate Wordle feedback: correct, present, absent."""
    if not secret or not guess or len(secret) != 5 or len(guess) != 5:
        return ["absent"] * 5

    result = ["absent"] * 5
    secret_list = list(secret.upper())
    guess_list = list(guess.upper())

    # First pass: Find corrects (Green)
    for i in range(5):
        if guess_list[i] == secret_list[i]:
            result[i] = "correct"
            secret_list[i] = None
            guess_list[i] = None

    # Second pass: Find presents (Yellow)
    for i in range(5):
        if guess_list[i] is not None and guess_list[i] in secret_list:
            result[i] = "present"
            secret_list[secret_list.index(guess_list[i])] = None

    return result


@router.get("/state", response_model=GameStateResponse)
async def get_state(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    config = db.query(models.GameConfig).first()
    if not config or not config.is_active:
        raise HTTPException(status_code=404, detail="No active game at the moment.")

    state = (
        db.query(models.GameState)
        .filter(models.GameState.user_id == current_user.id)
        .first()
    )
    if not state:
        state = models.GameState(
            user_id=current_user.id, word_of_the_day=config.word_of_the_day
        )
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

    guesses = state.guesses if isinstance(state.guesses, list) else []

    score = 0
    if state.completed and state.won:
        score = 1000 + (6 - len(guesses)) * 100
        score = max(score, 500)

    current_word = state.word_of_the_day or config.word_of_the_day or "PULSE"

    return {
        "guesses": guesses,
        "feedback": [calculate_feedback(g, current_word) for g in guesses],
        "hints_used": state.hints_used,
        "completed": state.completed,
        "won": state.won,
        "word_of_the_day": current_word if state.completed else None,
        "hint": getattr(config, "hint", None),
        "current_score": score,
    }


@router.post("/guess")
async def submit_guess(
    request: GuessRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    state = (
        db.query(models.GameState)
        .filter(models.GameState.user_id == current_user.id)
        .first()
    )
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

    # If game just completed, calculate and save history
    if state.completed:
        exists = (
            db.query(models.GameHistory)
            .filter(
                models.GameHistory.user_id == current_user.id,
                models.GameHistory.word == state.word_of_the_day,
            )
            .first()
        )

        if not exists:
            score = 0
            if state.won:
                score = 1000 + (6 - len(state.guesses)) * 100
                score = max(score, 500)

            history = models.GameHistory(
                user_id=current_user.id,
                word=state.word_of_the_day,
                score=score,
                guesses_count=len(state.guesses),
                hints_count=state.hints_used,
                won=state.won,
                game_type="wordle",
            )
            db.add(history)
            db.commit()

    return {"status": "ok", "completed": state.completed, "won": state.won}


@router.post("/hint")
async def get_hint(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    config = db.query(models.GameConfig).first()
    if not config or not config.is_active:
        raise HTTPException(status_code=404, detail="No active game.")

    state = (
        db.query(models.GameState)
        .filter(models.GameState.user_id == current_user.id)
        .first()
    )
    if state.completed:
        raise HTTPException(status_code=400, detail="Game already completed")

    return {"hint": config.hint}
