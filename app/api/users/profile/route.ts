import { NextRequest, NextResponse } from "next/server";
import { getDb, Collections } from "@/lib/db/mongodb";
import { getAuthUser } from "@/lib/services/auth";
import { ObjectId } from "mongodb";

/** GET /api/users/profile — get the authenticated user's profile */
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const user = await db
      .collection(Collections.USERS)
      .findOne(
        { _id: new ObjectId(authUser.userId) },
        { projection: { passwordHash: 0 } }
      );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const p = user.profile || {};

    // Return in the UserProfile shape the frontend expects
    return NextResponse.json({
      profile: {
        name: user.name || "",
        email: user.email || "",
        school: p.school || "",
        major: p.major || "",
        graduationYear: p.graduationYear || "",
        preferredRoles: p.preferredRoles || [],
        preferredIndustries: p.preferredIndustries || [],
        skills: p.skills || [],
        location: p.location || "",
        visaNotes: p.visaNotes || "",
        background: p.background || "",
        resumeText: p.resumeText || user.resumeText || "",
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** PUT /api/users/profile — update the authenticated user's profile */
export async function PUT(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const db = await getDb();

    // First, read the existing user to merge profile data
    const existingUser = await db
      .collection(Collections.USERS)
      .findOne({ _id: new ObjectId(authUser.userId) });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existingProfile = existingUser.profile || {};

    // Build the full updated profile sub-document
    const updatedProfile = {
      school: body.school ?? existingProfile.school ?? "",
      major: body.major ?? existingProfile.major ?? "",
      graduationYear: body.graduationYear ?? existingProfile.graduationYear ?? "",
      preferredRoles: body.preferredRoles ?? existingProfile.preferredRoles ?? [],
      preferredIndustries: body.preferredIndustries ?? existingProfile.preferredIndustries ?? [],
      skills: body.skills ?? existingProfile.skills ?? [],
      location: body.location ?? existingProfile.location ?? "",
      visaNotes: body.visaNotes ?? existingProfile.visaNotes ?? "",
      background: body.background ?? existingProfile.background ?? "",
      resumeText: body.resumeText ?? existingProfile.resumeText ?? "",
    };

    // Build root-level updates
    const rootUpdates: Record<string, unknown> = {
      profile: updatedProfile,
      updatedAt: new Date(),
    };

    if (body.name !== undefined) rootUpdates.name = body.name;
    if (body.email !== undefined) rootUpdates.email = body.email;

    const result = await db.collection(Collections.USERS).updateOne(
      { _id: new ObjectId(authUser.userId) },
      { $set: rootUpdates }
    );

    console.log("PUT /api/users/profile — matched:", result.matchedCount, "modified:", result.modifiedCount);

    return NextResponse.json({ message: "Profile updated", modified: result.modifiedCount });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
