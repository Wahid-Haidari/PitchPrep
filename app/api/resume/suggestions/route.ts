import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/services/auth";
import { generateResumeSuggestions } from "@/lib/services/openai";

/**
 * POST /api/resume/suggestions
 *
 * Input: { resumeText: string, jobDescription: string }
 * Returns AI-generated resume improvement suggestions.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { resumeText, jobDescription } = await req.json();

    if (!resumeText || !jobDescription) {
      return NextResponse.json(
        { error: "resumeText and jobDescription are required" },
        { status: 400 }
      );
    }

    const suggestions = await generateResumeSuggestions(resumeText, jobDescription);

    // Add IDs for frontend compatibility
    const withIds = suggestions.map((s, i) => ({
      id: String(i + 1),
      ...s,
    }));

    return NextResponse.json({ suggestions: withIds });
  } catch (error) {
    console.error("Resume suggestions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
