import { NextRequest, NextResponse } from "next/server";
import { getDb, Collections } from "@/lib/db/mongodb";
import { getAuthUser } from "@/lib/services/auth";
import { fetchEmployerContext } from "@/lib/services/openai";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** POST /api/employers/research — research employer(s) via ChatGPT with caching */
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { companyNames } = await req.json();

    if (!companyNames || !Array.isArray(companyNames) || companyNames.length === 0) {
      return NextResponse.json(
        { error: "companyNames array is required" },
        { status: 400 }
      );
    }

    // Limit to 5 companies per request
    const names = companyNames.slice(0, 5).map((n: string) => n.trim());

    const db = await getDb();
    const contextsCol = db.collection(Collections.EMPLOYER_CONTEXTS);
    const results: Record<string, unknown> = {};

    for (const name of names) {
      const normalizedName = name.toLowerCase();

      // Check cache
      const cached = await contextsCol.findOne({ companyName: normalizedName });

      if (cached && Date.now() - cached.updatedAt.getTime() < CACHE_TTL_MS) {
        results[name] = cached.context;
        continue;
      }

      // Fetch from ChatGPT
      try {
        const context = await fetchEmployerContext(name);

        // Upsert into cache
        await contextsCol.updateOne(
          { companyName: normalizedName },
          {
            $set: {
              companyName: normalizedName,
              displayName: name,
              context,
              updatedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true }
        );

        results[name] = context;
      } catch (aiError) {
        console.error(`Failed to research ${name}:`, aiError);
        results[name] = { error: `Failed to research ${name}` };
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Employer research error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** GET /api/employers/research?company=Name — get cached employer context */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyName = searchParams.get("company");

    if (!companyName) {
      return NextResponse.json({ error: "company query param required" }, { status: 400 });
    }

    const db = await getDb();
    const cached = await db
      .collection(Collections.EMPLOYER_CONTEXTS)
      .findOne({ companyName: companyName.toLowerCase() });

    if (!cached) {
      return NextResponse.json({ error: "No cached data for this company" }, { status: 404 });
    }

    return NextResponse.json({
      context: cached.context,
      cachedAt: cached.updatedAt,
    });
  } catch (error) {
    console.error("Get employer context error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
