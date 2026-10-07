"""SQLAlchemy ORM models."""
from datetime import datetime, timezone
import uuid

from sqlalchemy import (
    Column,
    String,
    Boolean,
    Integer,
    Text,
    DateTime,
    ForeignKey,
    Index,
    JSON,
)
from sqlalchemy.orm import relationship

from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Creator(Base):
    __tablename__ = "creators"
    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    created_at = Column(DateTime, default=_now)

    forms = relationship("Form", back_populates="creator", cascade="all, delete-orphan")


class Form(Base):
    __tablename__ = "forms"
    id = Column(String, primary_key=True, default=_uuid)
    creator_id = Column(String, ForeignKey("creators.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False, default="Untitled form")
    description = Column(Text, nullable=True)
    is_published = Column(Boolean, default=False, nullable=False)
    public_slug = Column(String, nullable=True, unique=True)
    thank_you_message = Column(Text, default="Thanks for completing this typeform!*\n*Now *create your own* — it's free, easy & beautiful")
    theme = Column(JSON, nullable=True)  # {background_color, text_color, accent_color, button_color, font_family}
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    creator = relationship("Creator", back_populates="forms")
    questions = relationship(
        "Question",
        back_populates="form",
        cascade="all, delete-orphan",
        order_by="Question.order_index",
    )
    responses = relationship("Response", back_populates="form", cascade="all, delete-orphan")

    __table_args__ = (Index("ix_form_slug", "public_slug"),)


class Question(Base):
    __tablename__ = "questions"
    id = Column(String, primary_key=True, default=_uuid)
    form_id = Column(String, ForeignKey("forms.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False)  # short_text, long_text, multiple_choice, dropdown, email, number, yes_no, rating
    title = Column(Text, nullable=False, default="")
    description = Column(Text, nullable=True)
    required = Column(Boolean, default=False, nullable=False)
    order_index = Column(Integer, nullable=False, default=0)
    # Rating config (min, max) — stored as integers
    rating_scale = Column(Integer, default=5)
    # Logic jumps: list of {operator, value, target: "end"|question_id}
    logic_jumps = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=_now)

    form = relationship("Form", back_populates="questions")
    options = relationship(
        "QuestionOption",
        back_populates="question",
        cascade="all, delete-orphan",
        order_by="QuestionOption.order_index",
    )
    answers = relationship("Answer", back_populates="question", cascade="all, delete-orphan")

    __table_args__ = (Index("ix_question_form", "form_id"),)


class QuestionOption(Base):
    __tablename__ = "question_options"
    id = Column(String, primary_key=True, default=_uuid)
    question_id = Column(String, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    label = Column(String, nullable=False)
    order_index = Column(Integer, nullable=False, default=0)

    question = relationship("Question", back_populates="options")

    __table_args__ = (Index("ix_option_question", "question_id"),)


class Response(Base):
    __tablename__ = "responses"
    id = Column(String, primary_key=True, default=_uuid)
    form_id = Column(String, ForeignKey("forms.id", ondelete="CASCADE"), nullable=False)
    submitted_at = Column(DateTime, default=_now)

    form = relationship("Form", back_populates="responses")
    answers = relationship("Answer", back_populates="response", cascade="all, delete-orphan")

    __table_args__ = (Index("ix_response_form", "form_id"),)


class Answer(Base):
    __tablename__ = "answers"
    id = Column(String, primary_key=True, default=_uuid)
    response_id = Column(String, ForeignKey("responses.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(String, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    value_text = Column(Text, nullable=True)
    value_number = Column(Integer, nullable=True)
    value_option_id = Column(String, nullable=True)  # for choice/dropdown
    value_bool = Column(Boolean, nullable=True)  # for yes/no

    response = relationship("Response", back_populates="answers")
    question = relationship("Question", back_populates="answers")

    __table_args__ = (
        Index("ix_answer_response", "response_id"),
        Index("ix_answer_question", "question_id"),
    )
