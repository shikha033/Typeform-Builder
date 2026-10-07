"""Seed script: creates sample forms, questions and responses."""
import random
from datetime import datetime, timezone, timedelta

from sqlalchemy.orm import Session

from app.database import SessionLocal, init_db
from app import models
from app.services.form_service import generate_unique_slug


def seed(db: Session) -> None:
    # Default creator
    creator = db.query(models.Creator).first()
    if not creator:
        creator = models.Creator(name="Alex Rivera", email="alex@typeclone.io")
        db.add(creator)
        db.flush()

    # ----- Form 1: Customer Feedback -----
    f1 = models.Form(
        creator_id=creator.id,
        title="Customer Feedback",
        description="Help us understand how we're doing",
        is_published=True,
        thank_you_message="Thanks for the honest feedback — it genuinely helps us build a better product.",
        theme={"background_color": "#fff1ec", "text_color": "#2a1310", "accent_color": "#ff6b4a",
               "button_color": "#ff6b4a", "button_text_color": "#ffffff", "font_family": "sans"},
    )
    db.add(f1); db.flush()
    f1.public_slug = generate_unique_slug(db, f1.title)

    f1_qs = [
        dict(type="short_text", title="What's your name?", required=True, description="So we can personalize your experience."),
        dict(type="rating", title="How would you rate your overall experience?", required=True, rating_scale=5),
        dict(type="multiple_choice", title="What did you like most?", required=False,
             options=["The design", "The speed", "The pricing", "The support"]),
        dict(type="yes_no", title="Would you recommend us to a friend?", required=True),
        dict(type="long_text", title="Any additional comments?", required=False,
             description="Share anything on your mind."),
    ]
    _add_questions(db, f1, f1_qs)

    # ----- Form 2: Product Survey -----
    f2 = models.Form(
        creator_id=creator.id,
        title="Product Survey",
        description="A quick survey to help shape our roadmap",
        is_published=True,
        thank_you_message="You're a legend. Thanks for taking the time.",
        theme={"background_color": "#2a222b", "text_color": "#ffffff", "accent_color": "#d58bf0",
               "button_color": "#d9f56b", "button_text_color": "#2a222b", "font_family": "sans"},
    )
    db.add(f2); db.flush()
    f2.public_slug = generate_unique_slug(db, f2.title)

    f2_qs = [
        dict(type="email", title="What's your email?", required=True, description="We may follow up with a quick thank-you."),
        dict(type="dropdown", title="Which plan are you on?", required=True,
             options=["Free", "Pro", "Business", "Enterprise"]),
        dict(type="number", title="How many team members use the product?", required=False),
        dict(type="rating", title="Rate the value for money", required=True, rating_scale=10),
        dict(type="multiple_choice", title="Which feature matters most to you?", required=True,
             options=["Analytics", "Integrations", "Templates", "Collaboration", "Mobile app"]),
    ]
    _add_questions(db, f2, f2_qs)

    db.commit()

    # ----- Sample responses -----
    _seed_responses(db, f1, count=8)
    _seed_responses(db, f2, count=5)
    db.commit()


def _add_questions(db: Session, form: models.Form, specs):
    for idx, s in enumerate(specs):
        opts = s.pop("options", None)
        q = models.Question(form_id=form.id, order_index=idx, **s)
        db.add(q); db.flush()
        if opts:
            for oi, label in enumerate(opts):
                db.add(models.QuestionOption(question_id=q.id, label=label, order_index=oi))


def _seed_responses(db: Session, form: models.Form, count: int):
    sample_names = ["Priya", "Jordan", "Mika", "Diego", "Lena", "Sana", "Yuki", "Theo", "Amelia", "Rafael"]
    comments = [
        "Loved the smooth flow and typography.",
        "Could use a dark mode on the dashboard.",
        "Fast and intuitive — great job!",
        "Pricing felt a bit steep for the free tier.",
        "The onboarding was delightful.",
    ]

    for i in range(count):
        resp = models.Response(
            form_id=form.id,
            submitted_at=datetime.now(timezone.utc) - timedelta(days=i, hours=random.randint(0, 23)),
        )
        db.add(resp); db.flush()

        for q in form.questions:
            if not q.required and random.random() < 0.3:
                continue  # skip some optional ones
            row = {"response_id": resp.id, "question_id": q.id}
            if q.type == "short_text":
                row["value_text"] = random.choice(sample_names)
            elif q.type == "long_text":
                row["value_text"] = random.choice(comments)
            elif q.type == "email":
                row["value_text"] = f"{random.choice(sample_names).lower()}{random.randint(1,99)}@example.com"
            elif q.type == "number":
                row["value_number"] = random.randint(1, 50)
            elif q.type == "yes_no":
                row["value_bool"] = random.random() > 0.3
            elif q.type == "rating":
                scale = q.rating_scale or 5
                row["value_number"] = random.randint(max(1, scale - 3), scale)
            elif q.type in ("multiple_choice", "dropdown"):
                if q.options:
                    row["value_option_id"] = random.choice(q.options).id
                else:
                    continue
            db.add(models.Answer(**row))


def main():
    init_db()
    db = SessionLocal()
    try:
        # idempotent: skip if already seeded
        if db.query(models.Form).count() > 0:
            print("Database already has forms. Skipping seed.")
            return
        seed(db)
        print("Seeded database successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
