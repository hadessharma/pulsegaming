import os
import json
import random
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

import models, auth, database

router = APIRouter(prefix="/asu-trivia", tags=["asu-trivia"])

# Load trivia questions
DATA_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "trivia_questions.json")
def load_questions():
    with open(DATA_FILE, "r") as f:
        return json.load(f)

class SubmitRequest(BaseModel):
    answer_index: int

@router.post("/start")
async def start_game(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    config = db.query(models.GameConfig).first()
    game_day = config.asu_trivia_day if config else 1

    # Check if already played/active on this day
    existing = db.query(models.ASUTriviaState).filter(
        models.ASUTriviaState.user_id == current_user.id,
        models.ASUTriviaState.day == game_day
    ).first()

    all_questions = load_questions()

    if existing:
        if existing.completed:
            return {"status": "already_played", "message": "You have already played today's ASU Trivia!", "score": existing.score}
        
        # Return current question
        q_id = existing.questions[existing.current_index]
        q_data = next((q for q in all_questions if q["id"] == q_id), None)
        return {
            "status": "playing",
            "score": existing.score,
            "current_question": {
                "question": q_data["question"],
                "options": q_data["options"],
                "category": q_data["category"],
                "label": q_data["label"]
            },
            "current_index": existing.current_index,
            "total_questions": len(existing.questions)
        }

    # Assign 5 random questions the user hasn't seen
    past_sessions = db.query(models.ASUTriviaState).filter(
        models.ASUTriviaState.user_id == current_user.id
    ).all()
    
    seen_ids = set()
    for s in past_sessions:
        seen_ids.update(s.questions)
    
    available_questions = [q for q in all_questions if q["id"] not in seen_ids]
    
    if len(available_questions) < 5:
        # Wrap around if they've seen almost everything
        available_questions = all_questions
    
    selected = random.sample(available_questions, min(5, len(available_questions)))
    selected_ids = [q["id"] for q in selected]

    new_session = models.ASUTriviaState(
        user_id=current_user.id,
        day=game_day,
        score=0,
        questions=selected_ids,
        current_index=0,
        completed=False
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    q_data = selected[0]
    return {
        "status": "started",
        "score": new_session.score,
        "current_question": {
            "question": q_data["question"],
            "options": q_data["options"],
            "category": q_data["category"],
            "label": q_data["label"]
        },
        "current_index": 0,
        "total_questions": len(selected_ids)
    }

@router.post("/submit")
async def submit_answer(
    req: SubmitRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    config = db.query(models.GameConfig).first()
    game_day = config.asu_trivia_day if config else 1

    session = db.query(models.ASUTriviaState).filter(
        models.ASUTriviaState.user_id == current_user.id,
        models.ASUTriviaState.day == game_day
    ).first()

    if not session or session.completed:
        return {"status": "error", "message": "No active session for today."}

    all_questions = load_questions()
    q_id = session.questions[session.current_index]
    q_data = next((q for q in all_questions if q["id"] == q_id), None)

    is_correct = (req.answer_index == q_data["answer_index"])

    if is_correct:
        session.score += 100
    else:
        session.score -= 25

    # Move to next
    session.current_index += 1
    
    finished = session.current_index >= len(session.questions)
    
    if finished:
        session.completed = True
        
        # Save to history
        history_word = f"ASU Trivia Day {session.day}"
        existing_history = db.query(models.GameHistory).filter(
            models.GameHistory.user_id == session.user_id,
            models.GameHistory.game_type == "asu_trivia",
            models.GameHistory.word == history_word
        ).first()

        if not existing_history:
            history = models.GameHistory(
                user_id=session.user_id,
                word=history_word,
                score=session.score,
                guesses_count=session.current_index,
                hints_count=0,
                won=True,
                game_type="asu_trivia",
                is_ranked=True
            )
            db.add(history)

    db.commit()

    response = {
        "correct": is_correct,
        "score": session.score,
        "fact": q_data["fact"],
        "correct_answer_index": q_data["answer_index"],
        "status": "finished" if finished else "playing"
    }

    if not finished:
        next_q_id = session.questions[session.current_index]
        next_q_data = next((q for q in all_questions if q["id"] == next_q_id), None)
        response["next_question"] = {
            "question": next_q_data["question"],
            "options": next_q_data["options"],
            "category": next_q_data["category"],
            "label": next_q_data["label"]
        }
        response["current_index"] = session.current_index

    return response

@router.get("/state")
async def get_state(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    config = db.query(models.GameConfig).first()
    game_day = config.asu_trivia_day if config else 1

    session = db.query(models.ASUTriviaState).filter(
        models.ASUTriviaState.user_id == current_user.id,
        models.ASUTriviaState.day == game_day
    ).first()

    if not session:
        return {"status": "idle"}
    
    if session.completed:
        return {"status": "already_played", "score": session.score}

    all_questions = load_questions()
    q_id = session.questions[session.current_index]
    q_data = next((q for q in all_questions if q["id"] == q_id), None)

    return {
        "status": "playing",
        "score": session.score,
        "current_question": {
            "question": q_data["question"],
            "options": q_data["options"],
            "category": q_data["category"],
            "label": q_data["label"]
        },
        "current_index": session.current_index,
        "total_questions": len(session.questions)
    }
