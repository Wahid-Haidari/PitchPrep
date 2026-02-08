// ============================================
// MongoDB Schema Creation Script
// ============================================
// Copy and paste this into MongoDB Compass or mongosh
// Database: pitchprep

// Switch to pitchprep database
use pitchprep;

// ============================================
// 1. CREATE USERS COLLECTION WITH VALIDATION
// ============================================
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "name", "role", "passwordHash", "createdAt", "updatedAt"],
      properties: {
        email: {
          bsonType: "string",
          description: "Must be a string - unique email address"
        },
        name: {
          bsonType: "string",
          description: "Must be a string - user's full name"
        },
        role: {
          enum: ["admin", "user"],
          description: "Must be 'admin' or 'user'"
        },
        passwordHash: {
          bsonType: "string",
          description: "bcrypt hashed password"
        },
        profile: {
          bsonType: ["object", "null"],
          description: "User profile information",
          properties: {
            school: { bsonType: "string" },
            major: { bsonType: "string" },
            graduationYear: { bsonType: "string" },
            preferredRoles: { 
              bsonType: "array",
              items: { bsonType: "string" }
            },
            preferredIndustries: { 
              bsonType: "array",
              items: { bsonType: "string" }
            },
            location: { bsonType: "string" },
            workAuthorization: { bsonType: "string" },
            jobTypePreference: { 
              enum: ["internship", "full_time", "part_time", "any"],
              description: "Job type preference"
            },
            skills: { 
              bsonType: "array",
              items: { bsonType: "string" }
            },
            visaNotes: { bsonType: "string" },
            background: { bsonType: "string" }
          }
        },
        resumeText: {
          bsonType: "string",
          description: "Full text of the user's resume"
        },
        resumeUploadDate: {
          bsonType: "date",
          description: "Date when resume was last uploaded"
        },
        resumeFilename: {
          bsonType: "string",
          description: "Original filename or 'manual_input'"
        },
        createdAt: {
          bsonType: "date"
        },
        updatedAt: {
          bsonType: "date"
        }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "warn"
});

// ============================================
// 2. CREATE INDEXES FOR USERS COLLECTION
// ============================================
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ updatedAt: -1 });

// ============================================
// 3. CREATE OTHER COLLECTIONS
// ============================================
db.createCollection("companies");
db.createCollection("events");
db.createCollection("employer_contexts");
db.createCollection("pitches");

// ============================================
// 4. CREATE INDEXES FOR OTHER COLLECTIONS
// ============================================

// Companies
db.companies.createIndex({ slug: 1 }, { unique: true });
db.companies.createIndex({ category: 1 });
db.companies.createIndex({ hiringNow: 1 });

// Events
db.events.createIndex({ date: 1 });

// Employer Contexts (AI research cache)
db.employer_contexts.createIndex({ companyName: 1 }, { unique: true });
db.employer_contexts.createIndex({ updatedAt: 1 });

// Pitches (generated career fair cards)
db.pitches.createIndex({ userId: 1, companyName: 1 });
db.pitches.createIndex({ createdAt: -1 });

// ============================================
// 5. SAMPLE DOCUMENT STRUCTURE
// ============================================
// Example User Document:
/*
{
  _id: ObjectId("..."),
  email: "user@gmail.com",
  name: "Alex Chen",
  role: "user",
  passwordHash: "$2a$10$...",
  profile: {
    school: "State University",
    major: "Computer Science & Business",
    graduationYear: "2026",
    preferredRoles: ["Software Engineer", "Product Manager"],
    preferredIndustries: ["Tech", "Finance"],
    location: "New York, NY",
    workAuthorization: "US Citizen – no sponsorship required",
    jobTypePreference: "full_time",
    skills: ["Python", "JavaScript", "React", "Node.js", "SQL"],
    visaNotes: "US Citizen – no sponsorship required",
    background: "I interned in finance at a mid-size bank..."
  },
  resumeText: "ALEX CHEN\nEducation...",
  resumeUploadDate: ISODate("2026-02-07T00:00:00Z"),
  resumeFilename: "resume.pdf",
  createdAt: ISODate("2026-01-01T00:00:00Z"),
  updatedAt: ISODate("2026-02-07T00:00:00Z")
}
*/

print("✓ Schema setup complete!");
print("✓ All collections and indexes created");
print("\nNext: Run 'npm run seed' to populate with data");
