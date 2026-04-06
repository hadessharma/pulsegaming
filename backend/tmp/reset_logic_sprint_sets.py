import models, database

def reset():
    db = database.SessionLocal()
    try:
        print("Clearing Logic Sprint sets and states...")
        db.query(models.LogicSprintQuestionSet).delete()
        db.query(models.LogicSprintState).delete()
        db.commit()
        print("Done. The app will re-seed on next startup/reload.")
    finally:
        db.close()

if __name__ == "__main__":
    reset()
