import database, models

def verify():
    db = database.SessionLocal()
    try:
        count = db.query(models.LogicSprintQuestionSet).count()
        print(f"Total Sets: {count}")
        if count > 0:
            qset = db.query(models.LogicSprintQuestionSet).first()
            print(f"Tasks in first set: {len(qset.tasks)}")
            print(f"Task 1: {qset.tasks[0]}")
            print(f"Task 10: {qset.tasks[9]}")
            print(f"Task 25: {qset.tasks[24]}")
            print(f"Task 35: {qset.tasks[34]}")
    finally:
        db.close()

if __name__ == "__main__":
    verify()
