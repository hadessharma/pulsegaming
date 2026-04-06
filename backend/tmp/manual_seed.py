import database, models
from games.logic_sprint.task_generator import generate_task

def seed():
    db = database.SessionLocal()
    try:
        print("Manual seeding...")
        # Check if empty first
        if db.query(models.LogicSprintQuestionSet).count() > 0:
            print("Already seeded.")
            return
            
        for set_num in range(1, 6):
            print(f"Seeding set {set_num}...")
            tasks_list = []
            for i in range(35):
                difficulty = i / 35.0
                tasks_list.append(generate_task(difficulty))
            
            db.add(models.LogicSprintQuestionSet(
                set_number=set_num,
                tasks=tasks_list
            ))
        db.commit()
        print("Success.")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
