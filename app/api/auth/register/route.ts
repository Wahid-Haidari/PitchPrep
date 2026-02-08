import { NextRequest, NextResponse } from "next/server";
import { getDb, Collections } from "@/lib/db/mongodb";
import { hashPassword, signToken } from "@/lib/services/auth";
import type { UserRole } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, role } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const existing = await db.collection(Collections.USERS).findOne({ email });

    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const userRole: UserRole = role === "admin" ? "admin" : "user";

    const result = await db.collection(Collections.USERS).insertOne({
      email,
      name,
      role: userRole,
      passwordHash,
      profile: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = signToken({
      userId: result.insertedId.toString(),
      email,
      role: userRole,
    });

    const response = NextResponse.json(
      {
        token,
        user: { email, name, role: userRole },
      },
      { status: 201 }
    );

    response.cookies.set("pitchprep_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
