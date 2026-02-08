# PitchPrep Backend

## Architecture

The backend is implemented as **Next.js API routes** within the existing Next.js project, using:

- **MongoDB Atlas** — data persistence
- **OpenAI API (GPT-4o-mini)** — employer research & pitch generation
- **JWT** — authentication
- **bcryptjs** — password hashing

## Setup

### 1. Environment Variables

Copy `.env.local` and fill in your credentials:

```
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/pitchprep?retryWrites=true&w=majority
OPENAI_API_KEY=sk-your-key-here
JWT_SECRET=your-secret-here
OPENAI_MODEL=gpt-4o-mini
```

### 2. Seed the Database

```bash
npm run seed
```

This populates MongoDB with the same mock data the frontend uses (users, companies, events).

### 3. Run

```bash
npm run dev
```

## API Endpoints

### Authentication

| Method | Path                  | Description         |
|--------|-----------------------|---------------------|
| POST   | `/api/auth/login`     | Login (returns JWT) |
| POST   | `/api/auth/register`  | Register new user   |
| GET    | `/api/auth/me`        | Get current user    |
| POST   | `/api/auth/logout`    | Logout (clears cookie) |

**Login body:** `{ email, password, role }`
**Register body:** `{ email, password, name }`

### User Profile

| Method | Path                  | Description         |
|--------|-----------------------|---------------------|
| GET    | `/api/users/profile`  | Get user profile    |
| PUT    | `/api/users/profile`  | Update user profile |

### Companies

| Method | Path                     | Description          |
|--------|--------------------------|----------------------|
| GET    | `/api/companies`         | List all companies   |
| POST   | `/api/companies`         | Create company       |
| GET    | `/api/companies/:id`     | Get company by ID/slug |
| PUT    | `/api/companies/:id`     | Update company       |
| DELETE | `/api/companies/:id`     | Delete company       |
| POST   | `/api/companies/bulk`    | Bulk add companies   |

### Events

| Method | Path                              | Description                |
|--------|-----------------------------------|----------------------------|
| GET    | `/api/events`                     | List all events            |
| POST   | `/api/events`                     | Create event (admin)       |
| GET    | `/api/events/:id`                 | Get event + companies      |
| PUT    | `/api/events/:id`                 | Update event (admin)       |
| DELETE | `/api/events/:id`                 | Delete event (admin)       |
| POST   | `/api/events/:id/companies`       | Add company to event       |
| DELETE | `/api/events/:id/companies?companyId=X` | Remove company from event |

### Employer Research (ChatGPT)

| Method | Path                              | Description                      |
|--------|------------------------------------|----------------------------------|
| POST   | `/api/employers/research`          | Research employer(s) via ChatGPT |
| GET    | `/api/employers/research?company=X`| Get cached employer context      |

**POST body:** `{ companyNames: ["Google", "Stripe"] }`

Employer data is cached in MongoDB for 7 days to minimize API calls.

### Pitch Generation

| Method | Path                   | Description                          |
|--------|------------------------|--------------------------------------|
| POST   | `/api/pitch/generate`  | Generate personalized elevator pitch |

**Body:** `{ companyName: "Google", companyId?: "1" }`

Returns a `CareerFairCard` with:
- Personalized 20-25 second pitch
- Match score & reasoning
- Smart questions to ask
- Follow-up email template
- Wow facts with sources

### Resume Suggestions

| Method | Path                       | Description                       |
|--------|----------------------------|-----------------------------------|
| POST   | `/api/resume/suggestions`  | Get AI resume improvement tips    |

**Body:** `{ resumeText: "...", jobDescription: "..." }`

## Database Collections

| Collection         | Description                                    |
|--------------------|------------------------------------------------|
| `users`            | User accounts with embedded profile data       |
| `companies`        | Company records with career fair card data     |
| `events`           | Career fair events with company ID references  |
| `employer_contexts`| Cached ChatGPT employer research (7-day TTL)   |
| `pitches`          | Generated pitch history per user               |

## Data Flow

```
User selects company → POST /api/pitch/generate
  ├─ Fetch user profile from DB
  ├─ Check employer context cache
  │   └─ Cache miss → Call ChatGPT → Cache result
  ├─ Match user skills ↔ employer needs
  ├─ Generate pitch via ChatGPT
  ├─ Save pitch to history
  └─ Return CareerFairCard to frontend
```

## Default Credentials (after seeding)

| Role  | Email               | Password  |
|-------|---------------------|-----------|
| Admin | admin@pitchprep.com | admin123  |
| User  | user@gmail.com      | 12345     |
