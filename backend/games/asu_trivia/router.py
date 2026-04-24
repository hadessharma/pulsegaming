import os
import json
import random
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

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
            "total_questions": len(existing.questions),
            "question_start_time": existing.question_start_time.isoformat() + "Z" if existing.question_start_time else None,
            "session_start_time": existing.session_start_time.isoformat() + "Z" if getattr(existing, 'session_start_time', None) else None
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
        "total_questions": len(selected_ids),
        "question_start_time": new_session.question_start_time.isoformat() + "Z" if new_session.question_start_time else None,
        "session_start_time": new_session.session_start_time.isoformat() + "Z" if getattr(new_session, 'session_start_time', None) else None
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
    
    if session.question_start_time is None:
        elapsed = 0
    else:
        elapsed = (datetime.utcnow() - session.question_start_time).total_seconds()

    if is_correct:
        points_earned = max(10, int(100 - (elapsed * 5)))
        session.score += points_earned
    else:
        points_earned = -25
        session.score += points_earned

    # Move to next
    session.current_index += 1
    
    finished = session.current_index >= len(session.questions)
    
    if not finished:
        session.question_start_time = datetime.utcnow()
    else:
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
        "points_earned": points_earned,
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
        response["question_start_time"] = session.question_start_time.isoformat() + "Z" if session.question_start_time else None
        response["session_start_time"] = session.session_start_time.isoformat() + "Z" if getattr(session, 'session_start_time', None) else None

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
        "total_questions": len(session.questions),
        "question_start_time": session.question_start_time.isoformat() + "Z" if session.question_start_time else None,
        "session_start_time": session.session_start_time.isoformat() + "Z" if getattr(session, 'session_start_time', None) else None
    }
