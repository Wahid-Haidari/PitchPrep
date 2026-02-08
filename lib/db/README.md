# MongoDB Database Schema for PitchPrep

## Overview

This directory contains scripts to set up and manage the MongoDB schema for PitchPrep's user profile system and related collections.

## Quick Start

### Option 1: Using Node.js Script (Recommended)

```bash
# 1. Set up schema validation and indexes
npm run setup-schema

# 2. Populate database with initial data
npm run seed
```

### Option 2: Using MongoDB Shell/Compass

1. Open MongoDB Compass and connect to your database
2. Open `schema.mongodb.js` in this directory
3. Copy and paste the contents into the MongoDB shell
4. Execute the script
5. Then run: `npm run seed`

## User Profile Table Structure

### Main Document Schema

```javascript
{
  _id: ObjectId,                    // Auto-generated MongoDB ID
  email: String,                    // Unique - user's email (login identifier)
  name: String,                     // User's full name
  role: "admin" | "user",           // User role in system
  passwordHash: String,             // bcrypt hashed password
  
  profile: {                        // Embedded profile sub-document
    school: String,                 // Educational institution
    major: String,                  // Field of study
    graduationYear: String,         // Expected graduation (format: "YYYY")
    
    preferredRoles: [String],       // Desired job roles
    preferredIndustries: [String],  // Preferred industries
    location: String,               // Preferred work location
    
    workAuthorization: String,      // Work auth status (e.g., "US Citizen")
    jobTypePreference: String,      // "internship" | "full_time" | "part_time" | "any"
    skills: [String],               // Technical/soft skills array
    
    visaNotes: String,              // Additional visa information
    background: String              // Career background/interests
  },
  
  resumeText: String,               // Full resume text (parsed from PDF)
  resumeUploadDate: Date,           // Last resume upload timestamp
  resumeFilename: String,           // Original filename or "manual_input"
  
  createdAt: Date,                  // Account creation timestamp
  updatedAt: Date                   // Last update timestamp
}
```

## Field Descriptions

### Root Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | String | Yes | Unique email address for login. Indexed for fast lookups. |
| `name` | String | Yes | User's full name displayed throughout the app. |
| `role` | String | Yes | Either `"admin"` or `"user"`. Determines access permissions. |
| `passwordHash` | String | Yes | bcrypt hashed password (salt rounds: 10). Never stored in plain text. |
| `createdAt` | Date | Yes | Timestamp when account was created. |
| `updatedAt` | Date | Yes | Timestamp of last profile update. Updated on every change. |

### Profile Fields

These fields are used by the AI pitch generation system to personalize career fair preparation:

| Field | Type | Required | Used By AI | Description |
|-------|------|----------|------------|-------------|
| `school` | String | No | No | University or college name |
| `major` | String | No | ✅ Yes | Academic major/field of study. Used for matching with company needs. |
| `graduationYear` | String | No | No | Expected graduation year (format: "2026") |
| `preferredRoles` | Array[String] | No | No | List of desired job titles (e.g., ["Software Engineer", "Product Manager"]) |
| `preferredIndustries` | Array[String] | No | No | Preferred industries (e.g., ["Tech", "Finance", "Healthcare"]) |
| `location` | String | No | ✅ Yes | Preferred work location. Used for location match scoring (0-20 points). |
| `workAuthorization` | String | No | ✅ Yes | Work authorization status. Used for authorization match scoring (0-20 points). |
| `jobTypePreference` | String | No | ✅ Yes | One of: "internship", "full_time", "part_time", "any". Used for job type match scoring (0-20 points). |
| `skills` | Array[String] | No | ✅ Yes | List of skills (e.g., ["Python", "React", "SQL"]). Used for skills match scoring (0-20 points). |
| `visaNotes` | String | No | No | Additional visa/sponsorship notes |
| `background` | String | No | No | Free-form text about experience and interests |

### Resume Fields (Root Level)

| Field | Type | Required | Used By AI | Description |
|-------|------|----------|------------|-------------|
| `resumeText` | String | No | ✅ Yes | Full text extracted from resume PDF or manually pasted. Used for resume match scoring (0-20 points). |
| `resumeUploadDate` | Date | No | No | Timestamp of last resume upload/update |
| `resumeFilename` | String | No | No | Original PDF filename or "manual_input" for pasted text |

## AI Scoring System

The profile fields marked "Used By AI" are sent to OpenAI's GPT model to generate personalized elevator pitches and company matches. The scoring breakdown is:

- **Location Match (0-20)**: How well location preference aligns with company locations
- **Work Authorization (0-20)**: Compatibility with company's sponsorship policies
- **Major Match (0-20)**: Relevance of academic major to company's hiring needs
- **Job Type Match (0-20)**: Alignment between preference and available positions
- **Skills Match (0-20)**: Overlap between user skills and company's valued skills
- **Resume Match (0-20)**: Experience relevance based on resume content

**Total Match Score: 0-120** (sum of all 6 categories)

## Indexes

For optimal query performance, the following indexes are created:

### users Collection
- `{ email: 1 }` - Unique index for login lookups
- `{ role: 1 }` - For filtering by user type
- `{ updatedAt: -1 }` - For sorting by recent activity

### Other Collections
See `setup-schema.ts` for complete index definitions on companies, events, employer_contexts, and pitches collections.

## Sample Document

```javascript
{
  _id: ObjectId("65c1f2e4a8b5c6d7e8f90123"),
  email: "user@gmail.com",
  name: "Alex Chen",
  role: "user",
  passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456789",
  profile: {
    school: "State University",
    major: "Computer Science & Business",
    graduationYear: "2026",
    preferredRoles: ["Software Engineer", "Product Manager"],
    preferredIndustries: ["Tech", "Finance"],
    location: "New York, NY",
    workAuthorization: "US Citizen – no sponsorship required",
    jobTypePreference: "full_time",
    skills: ["Python", "JavaScript", "React", "Node.js", "SQL", "AWS"],
    visaNotes: "US Citizen – no sponsorship required",
    background: "I interned in finance and have experience building web applications."
  },
  resumeText: "ALEX CHEN\nEducation: State University...",
  resumeUploadDate: ISODate("2026-02-07T12:00:00Z"),
  resumeFilename: "alex_chen_resume.pdf",
  createdAt: ISODate("2026-01-15T10:30:00Z"),
  updatedAt: ISODate("2026-02-07T12:00:00Z")
}
```

## API Endpoints Using This Schema

| Endpoint | Collections | Operations |
|----------|------------|------------|
| `POST /api/auth/register` | users | Create new user document |
| `POST /api/auth/login` | users | Query by email, verify password |
| `GET /api/users/profile` | users | Read user profile |
| `PUT /api/users/profile` | users | Update profile fields |
| `POST /api/resume/upload` | users | Update resumeText, resumeUploadDate, resumeFilename |
| `POST /api/pitch/generate` | users | Read profile + resume for AI generation |

## Maintenance

### Adding New Profile Fields

1. Update the validator schema in `setup-schema.ts`
2. Update the TypeScript interface in `lib/types.ts`
3. Update the seed data in `lib/db/seed.ts`
4. Update API routes that read/write the field
5. Re-run `npm run setup-schema`

### Viewing Data

Use MongoDB Compass to connect and view your collections:
- Connection string: From `.env.local` → `MONGODB_URI`
- Database: `pitchprep`
- Collection: `users`

## Troubleshooting

**Collection already exists?**
- The script handles existing collections and will update validation rules
- To start fresh, manually drop collections in MongoDB Compass

**Validation errors?**
- Check that all required fields are present
- Verify data types match the schema (e.g., arrays, strings, dates)
- Review validation mode: set to "warn" for development (logs but doesn't reject)

**Can't connect?**
- Verify `MONGODB_URI` is set in `.env.local`
- Check MongoDB Atlas network access (whitelist your IP)
- Ensure database user has read/write permissions
