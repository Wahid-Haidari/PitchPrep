/**
 * MongoDB Schema Setup Script
 * Run with: npx tsx lib/db/setup-schema.ts
 * 
 * This script creates schema validation rules and indexes for MongoDB collections.
 * MongoDB doesn't require explicit table creation, but validation ensures data consistency.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;

async function setupSchema() {
  if (!MONGODB_URI) {
    console.error("Set MONGODB_URI in .env.local before running setup");
    process.exit(1);
  }

  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db("pitchprep");

  console.log("Connected to MongoDB. Setting up schema...\n");

  // ============================================
  // 1. USERS COLLECTION - Schema Validation
  // ============================================
  console.log("Setting up 'users' collection schema validation...");
  
  try {
    await db.command({
      collMod: "users",
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["email", "name", "role", "passwordHash", "createdAt", "updatedAt"],
          properties: {
            email: {
              bsonType: "string",
              description: "Must be a string and is required - unique email address"
            },
            name: {
              bsonType: "string",
              description: "Must be a string and is required - user's full name"
            },
            role: {
              enum: ["admin", "user"],
              description: "Must be 'admin' or 'user'"
            },
            passwordHash: {
              bsonType: "string",
              description: "Must be a string - bcrypt hashed password"
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
                  enum: ["internship", "full_time", "part_time", "any", ""],
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
              description: "Date when resume was last uploaded or updated"
            },
            resumeFilename: {
              bsonType: "string",
              description: "Original filename or 'manual_input' for pasted text"
            },
            createdAt: {
              bsonType: "date",
              description: "Account creation timestamp"
            },
            updatedAt: {
              bsonType: "date",
              description: "Last profile update timestamp"
            }
          }
        }
      },
      validationLevel: "moderate", // Don't validate existing docs, only new inserts/updates
      validationAction: "warn" // Log warnings instead of rejecting invalid docs
    });
    console.log("✓ Users collection schema validation set");
  } catch (error: any) {
    if (error.codeName === "NamespaceNotFound") {
      console.log("  → Collection doesn't exist yet, will be created on first insert");
    } else {
      console.error("  ✗ Error setting validation:", error.message);
    }
  }

  // ============================================
  // 2. USERS COLLECTION - Indexes
  // ============================================
  console.log("\nCreating indexes for 'users' collection...");
  const usersCol = db.collection("users");
  
  // Unique index on email
  await usersCol.createIndex({ email: 1 }, { unique: true });
  console.log("✓ Created unique index on email");
  
  // Index on role for admin queries
  await usersCol.createIndex({ role: 1 });
  console.log("✓ Created index on role");
  
  // Index on updatedAt for sorting/filtering
  await usersCol.createIndex({ updatedAt: -1 });
  console.log("✓ Created index on updatedAt");

  // ============================================
  // 3. COMPANIES COLLECTION - Indexes
  // ============================================
  console.log("\nCreating indexes for 'companies' collection...");
  const companiesCol = db.collection("companies");
  
  await companiesCol.createIndex({ slug: 1 }, { unique: true });
  console.log("✓ Created unique index on slug");
  
  await companiesCol.createIndex({ category: 1 });
  console.log("✓ Created index on category");
  
  await companiesCol.createIndex({ hiringNow: 1 });
  console.log("✓ Created index on hiringNow");

  // ============================================
  // 4. EVENTS COLLECTION - Indexes
  // ============================================
  console.log("\nCreating indexes for 'events' collection...");
  const eventsCol = db.collection("events");
  
  await eventsCol.createIndex({ date: 1 });
  console.log("✓ Created index on date");

  // ============================================
  // 5. EMPLOYER_CONTEXTS COLLECTION - Indexes
  // ============================================
  console.log("\nCreating indexes for 'employer_contexts' collection...");
  const contextsCol = db.collection("employer_contexts");
  
  await contextsCol.createIndex({ companyName: 1 }, { unique: true });
  console.log("✓ Created unique index on companyName");
  
  await contextsCol.createIndex({ updatedAt: 1 });
  console.log("✓ Created index on updatedAt (for cache TTL)");

  // ============================================
  // 6. PITCHES COLLECTION - Indexes
  // ============================================
  console.log("\nCreating indexes for 'pitches' collection...");
  const pitchesCol = db.collection("pitches");
  
  await pitchesCol.createIndex({ userId: 1, companyName: 1 });
  console.log("✓ Created compound index on userId + companyName");
  
  await pitchesCol.createIndex({ createdAt: -1 });
  console.log("✓ Created index on createdAt");

  // ============================================
  // 7. Display Current Schema
  // ============================================
  console.log("\n" + "=".repeat(60));
  console.log("USERS COLLECTION SCHEMA STRUCTURE");
  console.log("=".repeat(60));
  console.log(`
{
  _id: ObjectId,
  email: String (unique),
  name: String,
  role: "admin" | "user",
  passwordHash: String,
  profile: {
    school: String,
    major: String,
    graduationYear: String,
    preferredRoles: [String],
    preferredIndustries: [String],
    location: String,
    workAuthorization: String (optional),
    jobTypePreference: "internship" | "full_time" | "part_time" | "any" (optional),
    skills: [String] (optional),
    visaNotes: String,
    background: String
  },
  resumeText: String (optional),
  resumeUploadDate: Date (optional),
  resumeFilename: String (optional),
  createdAt: Date,
  updatedAt: Date
}
  `);

  await client.close();
  console.log("\n✓ Schema setup complete!");
  console.log("\nNext steps:");
  console.log("  1. Run 'npm run seed' to populate with initial data");
  console.log("  2. Use MongoDB Compass to view your collections");
}

setupSchema().catch((err) => {
  console.error("Schema setup failed:", err);
  process.exit(1);
});
