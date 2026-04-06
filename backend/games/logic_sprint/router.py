from datetime import datetime, timedelta
import random
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

import models, auth, database
from games.logic_sprint.task_generator import generate_task

router = APIRouter(prefix="/logic-sprint", tags=["logic-sprint"])

class StartRequest(BaseModel):
    pass

class SubmitRequest(BaseModel):
    answer: str  # Send as string to handle TRUE/FALSE

def _get_active_session(db: Session, user_id: int):
    # Only return session if it's within the 60s window
    session = (
        db.query(models.LogicSprintState)
        .filter(models.LogicSprintState.user_id == user_id, models.LogicSprintState.completed == False)
        .order_by(models.LogicSprintState.start_time.desc())
        .first()
    )
    if session:
        elapsed = (datetime.utcnow() - session.start_time).total_seconds()
        if elapsed > 62: # 2s grace
            session.completed = True
            db.commit()
            return None
    return session

@router.post("/start")
async def start_game(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    config = db.query(models.GameConfig).first()
    game_day = config.logic_sprint_day if config else 1

    # Check if already played/active on this day
    existing = db.query(models.LogicSprintState).filter(
        models.LogicSprintState.user_id == current_user.id,
        models.LogicSprintState.day == game_day
    ).first()

    if existing:
        if existing.completed:
            return {"status": "already_played", "message": "You have already played today's Logic Sprint!"}
        
        elapsed = (datetime.utcnow() - existing.start_time).total_seconds()
        if elapsed < 60:
            return {
                "id": existing.id,
                "start_time": existing.start_time,
                "score": existing.score,
                "tasks_solved": existing.tasks_solved,
                "current_task": existing.current_task_data.get("question"),
                "seconds_left": 60 - elapsed,
            }
        else:
            existing.completed = True
            db.commit()
            return {"status": "already_played", "message": "You have already played today's Logic Sprint!"}

    # Assign a random set (1-5) the user hasn't played yet
    used_sets = [s.set_number for s in db.query(models.LogicSprintState).filter(
        models.LogicSprintState.user_id == current_user.id
    ).all()]
    
    available_sets = [i for i in range(1, 6) if i not in used_sets]
    if not available_sets:
        # If they played all 5, wrap around or pick random
        set_number = random.randint(1, 5)
    else:
        set_number = random.choice(available_sets)

    # Fetch set
    qset = db.query(models.LogicSprintQuestionSet).filter(models.LogicSprintQuestionSet.set_number == set_number).first()
    if not qset:
        raise HTTPException(status_code=500, detail="Logic Sprint question sets are not initialized.")
    
    tasks = qset.tasks
    first_task = tasks[0] if tasks else {"question": "No tasks in set", "answer": "0"}

    new_session = models.LogicSprintState(
        user_id=current_user.id,
        day=game_day,
        set_number=set_number,
        start_time=datetime.utcnow(),
        score=0,
        tasks_solved=0,
        current_task_index=0,
        current_task_data=first_task,
        completed=False
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return {
        "id": new_session.id,
        "start_time": new_session.start_time,
        "score": new_session.score,
        "tasks_solved": new_session.tasks_solved,
        "current_task": new_session.current_task_data.get("question"),
        "seconds_left": 60,
    }

@router.post("/submit")
async def submit_answer(
    req: SubmitRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    session = _get_active_session(db, current_user.id)
    if not session:
        return {"status": "expired", "message": "No active session or session expired."}

    elapsed = (datetime.utcnow() - session.start_time).total_seconds()
    
    # Check for expiration
    if elapsed > 62:
        session.completed = True
        
        # Save to history if not exists
        history = db.query(models.GameHistory).filter(
            models.GameHistory.user_id == current_user.id,
            models.GameHistory.game_type == "logic_sprint",
            models.GameHistory.timestamp >= session.start_time - timedelta(seconds=5)
        ).first()
        
        if not history:
            history = models.GameHistory(
                user_id=current_user.id,
                word=f"Logic Sprint Day {session.day}",
                score=session.score,
                guesses_count=session.tasks_solved,
                hints_count=0,
                won=True,
                game_type="logic_sprint",
                is_ranked=True
            )
            db.add(history)
        
        db.commit()
        return {"status": "expired", "final_score": session.score}

    # Validate answer
    correct_answer = str(session.current_task_data.get("answer")).strip().upper()
    user_answer = req.answer.strip().upper()

    is_correct = (user_answer == correct_answer)
    
    if is_correct:
        session.score += 10
        session.tasks_solved += 1
    else:
        session.score = max(0, session.score - 5)

    # Move to next task in set
    qset = db.query(models.LogicSprintQuestionSet).filter(models.LogicSprintQuestionSet.set_number == session.set_number).first()
    tasks = qset.tasks
    session.current_task_index += 1
    
    if session.current_task_index < len(tasks):
        next_task = tasks[session.current_task_index]
        session.current_task_data = next_task
    else:
        # Ran out of pre-generated tasks (unlikely with 100), but fallback to random
        from games.logic_sprint.task_generator import generate_task
        next_task = generate_task(elapsed)
        session.current_task_data = next_task

    db.commit()

    return {
        "correct": is_correct,
        "score": session.score,
        "next_task": session.current_task_data.get("question"),
        "seconds_left": max(0, 60 - elapsed),
    }

@router.get("/state")
async def get_state(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    config = db.query(models.GameConfig).first()
    game_day = config.logic_sprint_day if config else 1

    session = db.query(models.LogicSprintState).filter(
        models.LogicSprintState.user_id == current_user.id,
        models.LogicSprintState.day == game_day
    ).first()

    if not session:
        return {"status": "idle"}
    
    if session.completed:
        return {"status": "already_played", "score": session.score}

    elapsed = (datetime.utcnow() - session.start_time).total_seconds()
    if elapsed > 60:
        session.completed = True
        
        # Save to history
        history = models.GameHistory(
            user_id=current_user.id,
            word=f"Logic Sprint Day {session.day}",
            score=session.score,
            guesses_count=session.tasks_solved,
            hints_count=0,
            won=True,
            game_type="logic_sprint",
            is_ranked=True
        )
        db.add(history)
        db.commit()
        return {"status": "already_played", "score": session.score}
        
    return {
        "status": "playing",
        "score": session.score,
        "tasks_solved": session.tasks_solved,
        "current_task": session.current_task_data.get("question"),
        "seconds_left": 60 - elapsed,
    }
