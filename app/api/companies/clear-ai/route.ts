import { NextRequest, NextResponse } from "next/server";
import { getDb, Collections } from "@/lib/db/mongodb";
import { getAuthUser } from "@/lib/services/auth";

/**
 * POST /api/companies/clear-ai
 * Clears all AI-generated content from companies to force regeneration
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    
    const result = await db.collection(Collections.COMPANIES).updateMany(
      {},
      {
        $unset: {
          careerFairCard: "",
          matchScore: "",
          matchReasoning: "",
          generated: ""
        }
      }
    );

    console.log(`🧹 Cleared AI content from ${result.modifiedCount} companies`);

    return NextResponse.json({
      message: "AI content cleared successfully",
      modified: result.modifiedCount
    });
  } catch (error) {
    console.error("Clear AI content error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
