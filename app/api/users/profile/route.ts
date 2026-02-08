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

    // Return in the UserProfile shape the frontend expects
    return NextResponse.json({
      profile: {
        name: user.name,
        email: user.email,
        school: user.profile?.school || "",
        major: user.profile?.major || "",
        graduationYear: user.profile?.graduationYear || "",
        preferredRoles: user.profile?.preferredRoles || [],
        preferredIndustries: user.profile?.preferredIndustries || [],
        location: user.profile?.location || "",
        workAuthorization: user.profile?.workAuthorization || user.profile?.visaNotes || "",
        jobTypePreference: user.profile?.jobTypePreference || "",
        skills: user.profile?.skills || [],
        visaNotes: user.profile?.visaNotes || "",
        background: user.profile?.background || "",
        resumeText: user.resumeText || "", // resumeText is at root level
        resumeUploadDate: user.resumeUploadDate || null,
        resumeFilename: user.resumeFilename || "",
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
    const {
      name,
      school,
      major,
      graduationYear,
      preferredRoles,
      preferredIndustries,
      location,
      workAuthorization,
      jobTypePreference,
      skills,
      visaNotes,
      background,
      resumeText,
    } = body;

    const db = await getDb();

    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateFields.name = name;
    
    // Resume fields at root level
    if (resumeText !== undefined) {
      updateFields.resumeText = resumeText;
      updateFields.resumeUploadDate = new Date();
      updateFields.resumeFilename = "manual_input";
    }

    // Profile sub-document
    const profileUpdate: Record<string, unknown> = {};
    if (school !== undefined) profileUpdate["profile.school"] = school;
    if (major !== undefined) profileUpdate["profile.major"] = major;
    if (graduationYear !== undefined) profileUpdate["profile.graduationYear"] = graduationYear;
    if (preferredRoles !== undefined) profileUpdate["profile.preferredRoles"] = preferredRoles;
    if (preferredIndustries !== undefined) profileUpdate["profile.preferredIndustries"] = preferredIndustries;
    if (location !== undefined) profileUpdate["profile.location"] = location;
    if (workAuthorization !== undefined) profileUpdate["profile.workAuthorization"] = workAuthorization;
    if (jobTypePreference !== undefined) profileUpdate["profile.jobTypePreference"] = jobTypePreference;
    if (skills !== undefined) profileUpdate["profile.skills"] = skills;
    if (visaNotes !== undefined) profileUpdate["profile.visaNotes"] = visaNotes;
    if (background !== undefined) profileUpdate["profile.background"] = background;

    await db.collection(Collections.USERS).updateOne(
      { _id: new ObjectId(authUser.userId) },
      { $set: { ...updateFields, ...profileUpdate } }
    );

    return NextResponse.json({ message: "Profile updated" });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
