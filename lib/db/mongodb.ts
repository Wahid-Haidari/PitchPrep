import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable in .env.local");
}

interface MongoClientCache {
  client: MongoClient | null;
  promise: Promise<MongoClient> | null;
}

// Use global variable to preserve connection across hot reloads in dev
const globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise: MongoClientCache;
};

if (!globalWithMongo._mongoClientPromise) {
  globalWithMongo._mongoClientPromise = { client: null, promise: null };
}

const cached = globalWithMongo._mongoClientPromise;

export async function getMongoClient(): Promise<MongoClient> {
  if (cached.client) {
    return cached.client;
  }

  if (!cached.promise) {
    cached.promise = MongoClient.connect(MONGODB_URI);
  }

  cached.client = await cached.promise;
  return cached.client;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db("pitchprep");
}

// Collection name constants
export const Collections = {
  USERS: "users",
  COMPANIES: "companies",
  EVENTS: "events",
  EMPLOYER_CONTEXTS: "employer_contexts",
  PITCHES: "pitches",
} as const;
