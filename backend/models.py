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
    word_of_the_day = Column(String)
    is_active = Column(Boolean, default=True)

class GameHistory(Base):
    __tablename__ = "game_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    word = Column(String)
    score = Column(Integer)
    guesses_count = Column(Integer)
    hints_count = Column(Integer)
    won = Column(Boolean)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
