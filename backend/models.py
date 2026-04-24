from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    nickname = Column(String, unique=True, index=True, nullable=True)
    is_admin = Column(Boolean, default=False)

    game_state = relationship("GameState", back_populates="user", uselist=False)

class GameState(Base):
    __tablename__ = "game_states"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    word_of_the_day = Column(String)
    guesses = Column(JSON, default=[]) # List of guessed strings
    hints_used = Column(Integer, default=0)
    completed = Column(Boolean, default=False)
    won = Column(Boolean, default=False)
    
    user = relationship("User", back_populates="game_state")

class WhitelistedEmail(Base):
    __tablename__ = "whitelisted_emails"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)

class GameConfig(Base):
    __tablename__ = "game_config"

    id = Column(Integer, primary_key=True, index=True)
    word_of_the_day = Column(String) # Deprecated, use wordle_day
    hint = Column(String, nullable=True) # Deprecated
    tutor_trivia_day = Column(Integer, default=1)
    wordle_day = Column(Integer, default=1)
    logic_sprint_day = Column(Integer, default=1)
    asu_trivia_day = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)

class WordleWord(Base):
    __tablename__ = "wordle_words"

    id = Column(Integer, primary_key=True, index=True)
    day = Column(Integer, unique=True, index=True)
    word = Column(String(5))
    hint = Column(String, nullable=True)

class GameHistory(Base):
    __tablename__ = "game_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    word = Column(String)
    score = Column(Integer)
    guesses_count = Column(Integer)
    hints_count = Column(Integer)
    won = Column(Boolean)
    game_type = Column(String, default="wordle", index=True)
    is_ranked = Column(Boolean, default=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")


class TutorTriviaState(Base):
    __tablename__ = "tutor_trivia_states"
    __table_args__ = (
        # one session per user per day
        {"sqlite_autoincrement": True},
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    day = Column(Integer, nullable=False, index=True)
    tutor_order = Column(JSON, default=[])        # shuffled list of tutor IDs
    current_index = Column(Integer, default=0)     # which tutor we are on
    wrong_guesses = Column(JSON, default={})       # {str(tutor_id): count}
    completed = Column(Boolean, default=False)

    user = relationship("User")


class LogicSprintState(Base):
    __tablename__ = "logic_sprint_states"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    day = Column(Integer, nullable=False, index=True) # Game day (1-5)
    set_number = Column(Integer, nullable=False)     # Assigned question set (1-5)
    start_time = Column(DateTime, default=datetime.utcnow)
    score = Column(Integer, default=0)
    tasks_solved = Column(Integer, default=0)
    current_task_index = Column(Integer, default=0)
    current_task_data = Column(JSON, default={})  # Current task from the set
    completed = Column(Boolean, default=False)

    user = relationship("User")

class LogicSprintQuestionSet(Base):
    __tablename__ = "logic_sprint_question_sets"

    id = Column(Integer, primary_key=True, index=True)
    set_number = Column(Integer, unique=True, index=True)
    tasks = Column(JSON, nullable=False) # List of generated tasks

class ASUTriviaState(Base):
    __tablename__ = "asu_trivia_states"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    day = Column(Integer, nullable=False, index=True)
    score = Column(Integer, default=0)
    questions = Column(JSON, default=[]) # List of question IDs
    current_index = Column(Integer, default=0)
    completed = Column(Boolean, default=False)

    user = relationship("User")
