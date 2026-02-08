import { NextRequest, NextResponse } from "next/server";
import { getDb, Collections } from "@/lib/db/mongodb";
import { getAuthUser } from "@/lib/services/auth";

/** GET /api/companies — list all companies */
export async function GET() {
  try {
    const db = await getDb();
    const companies = await db
      .collection(Collections.COMPANIES)
      .find({})
      .sort({ matchScore: -1 })
      .toArray();

    // Transform _id for frontend compatibility
    const result = companies.map((c) => ({
      ...c,
      _id: undefined,
    }));

    return NextResponse.json({ companies: result });
  } catch (error) {
    console.error("Get companies error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST /api/companies — create a new company */
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      url,
      category,
      aboutInfo,
      jobDescription,
      location,
      hiringNow,
      topRoles,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    const slug = name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const company = {
      id: String(Date.now()),
      slug,
      name: name.trim(),
      url: url?.trim() || `https://${slug}.com`,
      category: category || "Other",
      aboutInfo: aboutInfo?.trim() || "",
      jobDescription: jobDescription?.trim() || "",
      notes: "",
      matchScore: Math.floor(Math.random() * 20) + 70,
      matchReasoning: "Match score will be personalized after pitch generation.",
      hiringNow: hiringNow ?? true,
      location: location?.trim() || "Remote",
      topRoles: topRoles?.length ? topRoles : ["General"],
      generated: false,
      adminApproved: authUser.role === "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const db = await getDb();
    await db.collection(Collections.COMPANIES).insertOne(company);

    return NextResponse.json({ company }, { status: 201 });
  } catch (error) {
    console.error("Create company error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
