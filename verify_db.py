import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import SessionLocal
import models

db = SessionLocal()
try:
    qsets = db.query(models.LogicSprintQuestionSet).all()
    print(f"Question Sets Found: {len(qsets)}")
    for qs in qsets:
        print(f"Set {qs.set_number}: {len(qs.tasks)} tasks")
    
    config = db.query(models.GameConfig).first()
    if config:
        print(f"Current Logic Sprint Day: {config.logic_sprint_day}")
    else:
        print("No GameConfig found")

finally:
    db.close()
