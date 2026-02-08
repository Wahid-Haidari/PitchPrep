import { NextRequest, NextResponse } from "next/server";
import { getDb, Collections } from "@/lib/db/mongodb";
import { getAuthUser } from "@/lib/services/auth";
import { fetchEmployerContext, generatePitch } from "@/lib/services/openai";
import type { UserProfileData, EmployerContext } from "@/lib/services/openai";
import { ObjectId } from "mongodb";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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

    const userProfile: UserProfileData = {
      name: user.name,
      email: user.email,
      school: user.profile.school || "",
      major: user.profile.major || "",
      graduationYear: user.profile.graduationYear || "",
      preferredRoles: user.profile.preferredRoles || [],
      preferredIndustries: user.profile.preferredIndustries || [],
      location: user.profile.location || "",
      background: user.profile.background || "",
      resumeText: user.profile.resumeText || "",
    };

    // 2. Get employer context (from cache or ChatGPT)
    const contextsCol = db.collection(Collections.EMPLOYER_CONTEXTS);
    const normalizedName = companyName.toLowerCase().trim();
    let employerContext: EmployerContext;

    const cached = await contextsCol.findOne({ companyName: normalizedName });

    if (cached && Date.now() - cached.updatedAt.getTime() < CACHE_TTL_MS) {
      employerContext = cached.context;
    } else {
      // Fetch from ChatGPT and cache
      employerContext = await fetchEmployerContext(companyName);
      await contextsCol.updateOne(
        { companyName: normalizedName },
        {
          $set: {
            companyName: normalizedName,
            displayName: companyName,
            context: employerContext,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );
    }

    // 3. Generate the pitch
    const pitchResult = await generatePitch(userProfile, employerContext, companyName);

    // 4. Build a CareerFairCard response matching the frontend type
    const careerFairCard = {
      pitch: pitchResult.pitch,
      wowFacts: pitchResult.wowFacts,
      topRoles: pitchResult.topMatchedRoles,
      smartQuestions: pitchResult.smartQuestions,
      followUpMessage: pitchResult.followUpMessage,
    };

    // 5. If companyId was provided, update the company record
    if (companyId) {
      await db.collection(Collections.COMPANIES).updateOne(
        { id: companyId },
        {
          $set: {
            careerFairCard,
            matchScore: pitchResult.matchScore,
            matchReasoning: pitchResult.matchReasoning,
            generated: true,
            aboutInfo:
              (
                await db.collection(Collections.COMPANIES).findOne({ id: companyId })
              )?.aboutInfo || employerContext.whatTheyDo,
            updatedAt: new Date(),
          },
        }
      );
    }

    // 6. Save pitch record for history
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
      matchReasoning: pitchResult.matchReasoning,
      employerContext,
    });
  } catch (error) {
    console.error("Pitch generation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
