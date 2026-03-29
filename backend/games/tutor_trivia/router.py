import random
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

import models, auth, database
from games.tutor_trivia.tutor_data import get_tutors_by_day, get_tutor_by_id

router = APIRouter(prefix="/tutor-trivia", tags=["tutor-trivia"])


# ── Request / Response schemas ──────────────────────────────────────

class StartRequest(BaseModel):
    day: int

class GuessRequest(BaseModel):
    day: int
    tutor_id: int


# ── Helpers ─────────────────────────────────────────────────────────

def _build_state_response(state: models.TutorTriviaState) -> dict:
    """Build the public state dict (never leaks answer mapping)."""
    day_tutors = get_tutors_by_day(state.day)
    tutor_map = {t["id"]: t for t in day_tutors}
    order = state.tutor_order or []
    wrong = state.wrong_guesses if isinstance(state.wrong_guesses, dict) else {}

    # Names list — in the shuffled order so the UI can render buttons
    names = [{"id": t_id, "name": tutor_map[t_id]["name"]} for t_id in order if t_id in tutor_map]

    # Which tutors have already been correctly guessed
    guessed_ids = order[: state.current_index]

    # Current target facts (only combinedFacts, no ID / name)
    current_facts = None
    if not state.completed and state.current_index < len(order):
        target_id = order[state.current_index]
        target = tutor_map.get(target_id)
        if target:
            current_facts = target.get("combinedFacts") or target.get("combined_facts")

    # Score calculation
    total_score = 0
    for t_id in guessed_ids:
        wrong_count = wrong.get(str(t_id), 0)
        total_score += max(0, 100 - 25 * wrong_count)

    # For completion screen: list of all tutors and their facts
    tutor_details = None
    if state.completed:
        tutor_details = [
            {"id": t["id"], "name": t["name"], "facts": t["facts"]}
            for t in day_tutors
        ]

    return {
        "day": state.day,
        "names": names,
        "guessed_ids": guessed_ids,
        "current_facts": current_facts,
        "current_index": state.current_index,
        "total_tutors": len(order),
        "total_score": total_score,
        "max_score": len(order) * 100,
        "completed": state.completed,
        "tutor_details": tutor_details,
    }

def _get_current_global_day(db: Session) -> int:
    config = db.query(models.GameConfig).first()
    return config.tutor_trivia_day if config else 1


def _get_or_none(db: Session, user_id: int, day: int):
    return (
        db.query(models.TutorTriviaState)
        .filter(
            models.TutorTriviaState.user_id == user_id,
            models.TutorTriviaState.day == day,
        )
        .first()
    )


# ── Routes ──────────────────────────────────────────────────────────

@router.post("/start")
async def start_game(
    req: StartRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    if req.day < 1 or req.day > 5:
        raise HTTPException(status_code=400, detail="Day must be 1-5")

    current_global_day = _get_current_global_day(db)
    if req.day > current_global_day:
        raise HTTPException(status_code=403, detail="This day is not yet unlocked.")

    existing = _get_or_none(db, current_user.id, req.day)
    if existing:
        # Session exists — just return existing state (supports refresh)
        return {
            **_build_state_response(existing),
            "global_current_day": _get_current_global_day(db)
        }

    day_tutors = get_tutors_by_day(req.day)
    if not day_tutors:
        raise HTTPException(status_code=404, detail="No tutors for this day")

    ids = [t["id"] for t in day_tutors]
    random.shuffle(ids)

    state = models.TutorTriviaState(
        user_id=current_user.id,
        day=req.day,
        tutor_order=ids,
        current_index=0,
        wrong_guesses={},
        completed=False,
    )
    db.add(state)
    db.commit()
    db.refresh(state)

    return {
        **_build_state_response(state),
        "global_current_day": _get_current_global_day(db)
    }

@router.get("/config")
async def get_tutor_trivia_config(db: Session = Depends(database.get_db)):
    return {"current_day": _get_current_global_day(db)}


@router.get("/state")
async def get_state(
    day: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    current_global_day = _get_current_global_day(db)
    if day > current_global_day:
        raise HTTPException(status_code=403, detail="This day is not yet unlocked.")

    state = _get_or_none(db, current_user.id, day)
    if not state:
        raise HTTPException(status_code=404, detail="No session for this day. Start the game first.")
    return {
        **_build_state_response(state),
        "global_current_day": _get_current_global_day(db)
    }


@router.post("/guess")
async def submit_guess(
    req: GuessRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    state = _get_or_none(db, current_user.id, req.day)
    if not state:
        raise HTTPException(status_code=404, detail="No session. Start the game first.")
    if state.completed:
        raise HTTPException(status_code=400, detail="Day already completed.")

    order = state.tutor_order or []
    if state.current_index >= len(order):
        raise HTTPException(status_code=400, detail="No more tutors.")

    target_id = order[state.current_index]

    if req.tutor_id == target_id:
        # ── Correct ──
        state.current_index += 1

        # Calculate points for this tutor
        wrong = state.wrong_guesses if isinstance(state.wrong_guesses, dict) else {}
        wrong_count = wrong.get(str(target_id), 0)
        points_earned = max(0, 100 - 25 * wrong_count)

        target = get_tutor_by_id(target_id)
        is_last = state.current_index >= len(order)

        if is_last:
            state.completed = True
            # Record to GameHistory
            total = 0
            for t_id in order:
                wc = wrong.get(str(t_id), 0)
                total += max(0, 100 - 25 * wc)

            current_global_day = _get_current_global_day(db)
            is_ranked = (req.day == current_global_day)

            history = models.GameHistory(
                user_id=current_user.id,
                word=f"day-{req.day}",
                score=total,
                guesses_count=sum(wrong.get(str(t), 0) for t in order) + len(order),
                hints_count=0,
                won=True,
                game_type="tutor_trivia",
                is_ranked=is_ranked,
            )
            db.add(history)

        db.commit()

        return {
            "correct": True,
            "tutor_name": target["name"] if target else "Unknown",
            "points_earned": points_earned,
            "is_last": is_last,
            "state": {
                **_build_state_response(state),
                "global_current_day": _get_current_global_day(db)
            },
        }
    else:
        # ── Wrong ──
        wrong = dict(state.wrong_guesses) if isinstance(state.wrong_guesses, dict) else {}
        wrong[str(target_id)] = wrong.get(str(target_id), 0) + 1
        state.wrong_guesses = wrong

        # Force SQLAlchemy to detect JSON mutation
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(state, "wrong_guesses")

        db.commit()

        guessed_tutor = get_tutor_by_id(req.tutor_id)
        return {
            "correct": False,
            "guessed_tutor": {
                "id": guessed_tutor["id"],
                "name": guessed_tutor["name"],
                "facts": guessed_tutor["facts"],
            } if guessed_tutor else None,
            "state": {
                **_build_state_response(state),
                "global_current_day": _get_current_global_day(db)
            },
        }
