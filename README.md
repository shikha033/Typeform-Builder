# Typeform Builder

A full-stack Typeform clone. Creators build and publish forms in a drag-and-drop builder, respondents fill them in a conversational one-question-at-a-time flow, and results are viewed with summary stats and CSV export.

🌐 Live Demo: [TypeformBuilder](https://team-orbit.vercel.app)


## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, dnd-kit, Sonner |
| Backend | Python, FastAPI, SQLAlchemy, Pydantic |
| Database | SQLite |

## Features

**Form builder** (`/forms/:id/edit`)
- Three panels: question list, live preview, question settings
- Add, edit, delete and drag-and-drop reorder questions
- 8 question types: short text, long text, multiple choice, dropdown, email, number, yes/no, rating (configurable scale)
- Per-question required toggle and description / help text
- Full-screen form preview
- Theme presets, custom colours and fonts
- Logic jumps (conditional branching)

**Form management** (`/forms`)
- List with Draft / Published status, question count and response count
- Create, rename, duplicate, delete
- Publish / unpublish with a shareable public link
- Search and grid / list view

**Respondent experience** (`/form/:slug`, no login)
- Welcome screen, one question at a time, animated transitions
- Progress indicator, keyboard navigation, previous / next
- Client-side and server-side validation
- Thank-you screen; the response is stored on submit

**Results** (`/forms/:id/results`)
- Table of responses and a full single-response view
- Per-question summary stats
- CSV export

## Project Structure

```text
typeform-builder/
├── frontend/
│   ├── app/
│   │   ├── page.tsx          # home page
│   │   ├── login/            # mock login
│   │   ├── forms/            # dashboard, builder, results
│   │   └── form/[slug]/      # public respondent flow
│   ├── components/
│   ├── lib/
│   └── next.config.js        # proxies /api to the backend
├── backend/
│   ├── app/
│   │   ├── routers/          # forms.py, public.py
│   │   ├── services/         # validation, slugs, stats
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── seed.py
│   │   └── main.py
│   ├── requirements.txt
│   └── server.py
└── README.md
```

## Architecture

```text
Browser → Next.js (Vercel) → /api/* proxy → FastAPI (Render) → SQLite
```

- The browser only talks to the Next.js origin. `next.config.js` rewrites `/api/*` to `BACKEND_URL`, so no CORS setup is needed in the browser.
- Backend layers: routers (HTTP) → services (validation, slugs, stats) → SQLAlchemy models. Pydantic schemas define every request and response.
- The builder saves with one `PUT /forms/{id}` that upserts questions and options, so existing answers survive edits.
- Submissions are validated in the browser first and again on the server.

## Database Schema

```text
creators 1──* forms 1──* questions 1──* question_options
                 │             │
                 │             └──* answers *──1 responses
                 └──* responses ───────────────┘
```

| Table | Columns |
|---|---|
| `creators` | id, name, email, created_at |
| `forms` | id, creator_id, title, description, is_published, public_slug, thank_you_message, theme (JSON), created_at, updated_at |
| `questions` | id, form_id, type, title, description, required, order_index, rating_scale, logic_jumps (JSON), created_at |
| `question_options` | id, question_id, label, order_index |
| `responses` | id, form_id, submitted_at |
| `answers` | id, response_id, question_id, value_text, value_number, value_option_id, value_bool |

All foreign keys cascade on delete, so removing a form removes its questions, responses and answers.

## API

All routes are prefixed with `/api`. Interactive docs are at `/docs` on the backend.

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| GET, POST | `/forms` | List / create forms |
| GET, PUT, DELETE | `/forms/{id}` | Read / update / delete a form |
| POST | `/forms/{id}/duplicate` | Duplicate a form |
| POST | `/forms/{id}/publish`, `/unpublish` | Publish (creates the slug) / unpublish |
| GET | `/forms/{id}/responses` | List responses |
| GET | `/forms/{id}/responses/{response_id}` | One response in full |
| GET | `/forms/{id}/stats` | Per-question summary stats |
| GET | `/forms/{id}/responses.csv` | CSV export |
| GET | `/public/forms/{slug}` | Fetch a published form |
| POST | `/public/forms/{slug}/responses` | Submit a response |

## Setup

Requirements: Node.js 18+, Python 3.10+, Git.

**Backend**

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS / Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --reload --port 8000
```

**Frontend** (second terminal)

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
BACKEND_URL=http://127.0.0.1:8000
```

```bash
npm run dev
```

Open http://localhost:3000.

## Seed Data

On first start the backend creates the database and seeds two published forms, **Customer Feedback** and **Product Survey**, with mixed question types and sample responses. Delete `backend/typeform.db` to reset.


## Assumptions and Mocked Parts

- A single default creator is used; login is a mock screen with no real authentication.
- Integrations, team collaboration, and the Themes / Integrations / Team sidebar entries are "Coming soon" placeholders.
- File-upload and payment question types are not implemented.
- The dashboard "paste your questions" box turns each line into a question; it does not use an AI model.

