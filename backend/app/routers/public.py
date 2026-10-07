"""Public respondent-facing routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.services.form_service import validate_and_build_answers

router = APIRouter(prefix="/public/forms", tags=["public"])


@router.get("/{slug}", response_model=schemas.PublicForm)
def get_public_form(slug: str, db: Session = Depends(get_db)):
    form = db.query(models.Form).filter_by(public_slug=slug, is_published=True).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found or not published")
    return schemas.PublicForm(
        id=form.id,
        title=form.title,
        description=form.description,
        thank_you_message=form.thank_you_message,
        theme=form.theme,
        public_slug=form.public_slug,
        questions=[schemas.PublicQuestion.model_validate(q) for q in form.questions],
    )


@router.post("/{slug}/responses", response_model=schemas.ResponseOut, status_code=201)
def submit_response(slug: str, payload: schemas.ResponseCreate, db: Session = Depends(get_db)):
    form = db.query(models.Form).filter_by(public_slug=slug, is_published=True).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found or not published")

    try:
        rows = validate_and_build_answers(db, form, payload.answers)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    response = models.Response(form_id=form.id)
    db.add(response)
    db.flush()
    for row in rows:
        db.add(models.Answer(response_id=response.id, **row))
    db.commit()
    db.refresh(response)
    return response
