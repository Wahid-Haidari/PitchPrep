import { NextRequest, NextResponse } from "next/server";
import { getDb, Collections } from "@/lib/db/mongodb";
import { getAuthUser } from "@/lib/services/auth";
import { ObjectId } from "mongodb";

/**
 * POST /api/resume/upload
 * 
 * Upload a PDF resume file. 
 * Currently returns a message to manually paste text.
 * TODO: Implement proper PDF text extraction for production.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("resume") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Check file type
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
    }

    // Check file size (limit to 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File size too large. Maximum 5MB." }, { status: 400 });
    }

    // For now, return a placeholder response
    // TODO: Implement actual PDF text extraction with a suitable library
    return NextResponse.json({ 
      success: false,
      error: "PDF text extraction not yet implemented. Please copy and paste your resume text manually in the text area below.",
      message: "Feature coming soon! For now, please paste your resume text manually.",
      textLength: 0,
      preview: ""
    }, { status: 501 });

  } catch (error) {
    console.error("Resume upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}