import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/services/auth";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

/**
 * POST /api/users/resume/analyze
 * Analyzes resume text and extracts profile information using AI
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { resumeText } = await req.json();

    if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json({ error: "Resume text is too short" }, { status: 400 });
    }

    // Use OpenAI to analyze the resume and extract structured data
    const response = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an expert resume parser. Analyze the resume text and extract structured information.

Return JSON with these exact fields:
{
  "name": "string — candidate's full name (empty string if not found)",
  "email": "string — email address (empty string if not found)",
  "school": "string — most recent/relevant educational institution",
  "major": "string — field of study or major",
  "graduationYear": "string — expected or actual graduation year (format: YYYY or 'May YYYY')",
  "location": "string — current city/location",
  "preferredRoles": ["array of strings — 3-5 roles this person seems qualified for based on experience"],
  "preferredIndustries": ["array of strings — choose from: Tech, Finance, Healthcare, Consulting, Other"],
  "background": "string — 2-3 sentence summary of their experience, skills, and interests",
  "skills": ["array of strings — top 8-10 technical and professional skills"]
}

Be conservative — only extract information that is clearly stated in the resume.`,
        },
        {
          role: "user",
          content: `Analyze this resume:\n\n${resumeText}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const analysis = JSON.parse(content);

    // Normalize industry categories
    const validIndustries = ["Tech", "Finance", "Healthcare", "Consulting", "Other"];
    analysis.preferredIndustries = analysis.preferredIndustries
      .filter((ind: string) => validIndustries.includes(ind))
      .slice(0, 3);

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Resume analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze resume. Please try again." },
      { status: 500 }
    );
  }
}
