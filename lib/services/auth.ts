import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { getDb, Collections } from "@/lib/db/mongodb";
import type { UserRole } from "@/lib/types";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const TOKEN_EXPIRY = "7d";

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

/** Create a JWT for a user */
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

/** Verify and decode a JWT */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

/** Hash a password */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/** Compare a password to a hash */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Extract the authenticated user from a request (reads Authorization header or cookie) */
export async function getAuthUser(req: NextRequest): Promise<JwtPayload | null> {
  // Try Authorization header first
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    return verifyToken(token);
  }

  // Try cookie
  const cookie = req.cookies.get("pitchprep_token");
  if (cookie?.value) {
    return verifyToken(cookie.value);
  }

  return null;
}

/** Require authentication — returns user or throws 401 response */
export async function requireAuth(req: NextRequest): Promise<JwtPayload> {
  const user = await getAuthUser(req);
  if (!user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

/** Require admin role */
export async function requireAdmin(req: NextRequest): Promise<JwtPayload> {
  const user = await requireAuth(req);
  if (user.role !== "admin") {
    throw new Response(JSON.stringify({ error: "Forbidden — admin required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}
