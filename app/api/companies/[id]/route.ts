import { NextRequest, NextResponse } from "next/server";
import { getDb, Collections } from "@/lib/db/mongodb";
import { getAuthUser } from "@/lib/services/auth";

/** GET /api/companies/[id] — get a company by its id */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();
    const company = await db.collection(Collections.COMPANIES).findOne({ id });

    if (!company) {
      // Try slug fallback
      const bySlug = await db.collection(Collections.COMPANIES).findOne({ slug: id });
      if (!bySlug) {
        return NextResponse.json({ error: "Company not found" }, { status: 404 });
      }
      return NextResponse.json({ company: { ...bySlug, _id: undefined } });
    }

    return NextResponse.json({ company: { ...company, _id: undefined } });
  } catch (error) {
    console.error("Get company error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** PUT /api/companies/[id] — update a company */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const db = await getDb();
    const result = await db.collection(Collections.COMPANIES).updateOne(
      { id },
      {
        $set: {
          ...body,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const updated = await db.collection(Collections.COMPANIES).findOne({ id });
    return NextResponse.json({ company: { ...updated, _id: undefined } });
  } catch (error) {
    console.error("Update company error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** DELETE /api/companies/[id] — delete a company */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const db = await getDb();

    // Remove from companies
    const result = await db.collection(Collections.COMPANIES).deleteOne({ id });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Remove from all events
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.collection(Collections.EVENTS).updateMany(
      { companyIds: id },
      { $pull: { companyIds: id } } as any
    );

    return NextResponse.json({ message: "Company deleted" });
  } catch (error) {
    console.error("Delete company error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
