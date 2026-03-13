from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String) # We'll use a simple password or just email for this private contest
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
