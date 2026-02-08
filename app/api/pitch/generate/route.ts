import { NextRequest, NextResponse } from "next/server";
import { getDb, Collections } from "@/lib/db/mongodb";
import { getAuthUser } from "@/lib/services/auth";
import { generatePitch } from "@/lib/services/openai";
import type { UserProfileData } from "@/lib/services/openai";
import { ObjectId } from "mongodb";

/**
 * POST /api/pitch/generate
 *
 * Input: { companyName: string }
 * Uses the authenticated user's profile + employer context to generate a pitch.
 * Returns a full CareerFairCard-compatible response.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { companyName, companyId } = await req.json();

    if (!companyName) {
      return NextResponse.json({ error: "companyName is required" }, { status: 400 });
    }

    const db = await getDb();

    // 1. Get the user's profile
    const user = await db
      .collection(Collections.USERS)
      .findOne({ _id: new ObjectId(authUser.userId) });

    if (!user || !user.profile) {
      return NextResponse.json(
        { error: "Please complete your profile before generating a pitch" },
        { status: 400 }
      );
    }

    // Map MongoDB document to UserProfileData for OpenAI prompt
    const userProfile: UserProfileData = {
      name: user.name,
      email: user.email,
      school: user.profile.school || "",
      major: user.profile.major || "",
      graduationYear: user.profile.graduationYear || "",
      preferredRoles: user.profile.preferredRoles || [],
      preferredIndustries: user.profile.preferredIndustries || [],
      location: user.profile.location || "",
      workAuthorization: user.profile.workAuthorization || user.profile.visaNotes || "",
      jobTypePreference: user.profile.jobTypePreference || "any",
      skills: user.profile.skills || [],
      background: user.profile.background || "",
      resumeText: user.resumeText || "", // resumeText is at root level, not in profile
    };

    // 2. Generate the pitch using new consolidated prompt
    const pitchResult = await generatePitch(userProfile, companyName);

    // 3. Build a CareerFairCard response matching the frontend type
    const careerFairCard = {
      pitch: pitchResult.elevatorPitch30s,
      wowFacts: pitchResult.interestingFacts.map((fact) => ({
        fact,
        source: "AI Generated",
        sourceUrl: "#"
      })),
      topRoles: pitchResult.topMatchedRoles,
      smartQuestions: pitchResult.smartQuestions,
      followUpMessage: `Hi [Name], it was great meeting you at the career fair! I really enjoyed learning about ${companyName}. I'd love to continue our conversation — would you be open to a brief virtual coffee chat? I've attached my resume for reference. Best, ${user.name}`,
    };

    // Create detailed match reasoning from scoreBreakdown
    const matchReasoning = [
      `Location: ${pitchResult.scoreBreakdown.location.score}/20 - ${pitchResult.scoreBreakdown.location.reason}`,
      `Work Auth: ${pitchResult.scoreBreakdown.workAuthorization.score}/20 - ${pitchResult.scoreBreakdown.workAuthorization.reason}`,
      `Major: ${pitchResult.scoreBreakdown.major.score}/20 - ${pitchResult.scoreBreakdown.major.reason}`,
      `Job Type: ${pitchResult.scoreBreakdown.jobType.score}/20 - ${pitchResult.scoreBreakdown.jobType.reason}`,
      `Skills: ${pitchResult.scoreBreakdown.skills.score}/20 - ${pitchResult.scoreBreakdown.skills.reason}`,
      `Resume: ${pitchResult.scoreBreakdown.resume.score}/20 - ${pitchResult.scoreBreakdown.resume.reason}`
    ].join(" | ");

    // 4. If companyId was provided, update the company record
    if (companyId) {
      await db.collection(Collections.COMPANIES).updateOne(
        { id: companyId },
        {
          $set: {
            careerFairCard,
            matchScore: pitchResult.matchScore,
            matchReasoning,
            generated: true,
            updatedAt: new Date(),
          },
        }
      );
    }

    // 5. Save pitch record for history
    await db.collection(Collections.PITCHES).insertOne({
      userId: authUser.userId,
      companyName,
      companyId: companyId || null,
      pitchResult,
      careerFairCard,
      createdAt: new Date(),
    });

    return NextResponse.json({
      careerFairCard,
      matchScore: pitchResult.matchScore,
      matchReasoning,
      scoreBreakdown: pitchResult.scoreBreakdown,
    });
  } catch (error) {
    console.error("Pitch generation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
