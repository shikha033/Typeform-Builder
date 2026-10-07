"""Pydantic schemas for API I/O."""
from datetime import datetime
from typing import List, Optional, Literal, Union
from pydantic import BaseModel, Field, EmailStr, ConfigDict


QuestionType = Literal[
    "short_text",
    "long_text",
    "multiple_choice",
    "dropdown",
    "email",
    "number",
    "yes_no",
    "rating",
]

JumpOperator = Literal["equals", "not_equals", "greater_than", "less_than"]


class LogicJump(BaseModel):
    operator: JumpOperator
    value: Optional[Union[str, int, float, bool]] = None
    target: str  # question_id or "end"


class Theme(BaseModel):
    background_color: Optional[str] = None
    text_color: Optional[str] = None
    accent_color: Optional[str] = None
    button_color: Optional[str] = None
    button_text_color: Optional[str] = None
    font_family: Optional[Literal["serif", "sans", "mono"]] = None


class OptionIn(BaseModel):
    id: Optional[str] = None
    label: str
    order_index: int = 0


class OptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    label: str
    order_index: int


class QuestionIn(BaseModel):
    id: Optional[str] = None
    type: QuestionType
    title: str = ""
    description: Optional[str] = None
    required: bool = False
    order_index: int = 0
    rating_scale: Optional[int] = 5
    options: List[OptionIn] = []
    logic_jumps: Optional[List[LogicJump]] = None


class QuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    type: str
    title: str
    description: Optional[str] = None
    required: bool
    order_index: int
    rating_scale: Optional[int] = 5
    options: List[OptionOut] = []
    logic_jumps: Optional[List[LogicJump]] = None


class FormCreate(BaseModel):
    title: str = "Untitled form"
    description: Optional[str] = None


class FormUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    thank_you_message: Optional[str] = None
    theme: Optional[Theme] = None
    questions: Optional[List[QuestionIn]] = None


class FormSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    description: Optional[str] = None
    is_published: bool
    public_slug: Optional[str] = None
    theme: Optional[Theme] = None
    created_at: datetime
    updated_at: datetime
    response_count: int = 0
    question_count: int = 0


class FormOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    description: Optional[str] = None
    is_published: bool
    public_slug: Optional[str] = None
    thank_you_message: Optional[str] = None
    theme: Optional[Theme] = None
    created_at: datetime
    updated_at: datetime
    questions: List[QuestionOut] = []


class PublicQuestion(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    type: str
    title: str
    description: Optional[str] = None
    required: bool
    order_index: int
    rating_scale: Optional[int] = 5
    options: List[OptionOut] = []
    logic_jumps: Optional[List[LogicJump]] = None


class PublicForm(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    thank_you_message: Optional[str] = None
    theme: Optional[Theme] = None
    public_slug: str
    questions: List[PublicQuestion] = []


class AnswerIn(BaseModel):
    question_id: str
    # Any one of these may be set depending on question type
    value: Optional[Union[str, int, float, bool]] = None


class ResponseCreate(BaseModel):
    answers: List[AnswerIn]


class AnswerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    question_id: str
    value_text: Optional[str] = None
    value_number: Optional[int] = None
    value_option_id: Optional[str] = None
    value_bool: Optional[bool] = None


class ResponseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    form_id: str
    submitted_at: datetime
    answers: List[AnswerOut] = []


class ResponseSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    submitted_at: datetime
    answer_count: int = 0


class QuestionStats(BaseModel):
    question_id: str
    question_title: str
    question_type: str
    response_count: int
    # type-specific
    option_counts: Optional[dict] = None  # {label: count}
    yes_count: Optional[int] = None
    no_count: Optional[int] = None
    average: Optional[float] = None
    distribution: Optional[dict] = None
    text_answers: Optional[List[str]] = None


class FormStats(BaseModel):
    form_id: str
    total_responses: int
    questions: List[QuestionStats]
