import { NextRequest, NextResponse } from "next/server";
import { getDb, Collections } from "@/lib/db/mongodb";
import { getAuthUser } from "@/lib/services/auth";

/** GET /api/events/[id] — get event with its companies */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();
    const event = await db.collection(Collections.EVENTS).findOne({ id });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Fetch associated companies
    const companies = await db
      .collection(Collections.COMPANIES)
      .find({ id: { $in: event.companyIds || [] } })
      .toArray();

    return NextResponse.json({
      event: { ...event, _id: undefined },
      companies: companies.map((c) => ({ ...c, _id: undefined })),
    });
  } catch (error) {
    console.error("Get event error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** PUT /api/events/[id] — update an event */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser || authUser.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const db = await getDb();
    const result = await db.collection(Collections.EVENTS).updateOne(
      { id },
      { $set: { ...body, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const updated = await db.collection(Collections.EVENTS).findOne({ id });
    return NextResponse.json({ event: { ...updated, _id: undefined } });
  } catch (error) {
    console.error("Update event error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** DELETE /api/events/[id] — delete an event */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser || authUser.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const db = await getDb();
    const result = await db.collection(Collections.EVENTS).deleteOne({ id });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Event deleted" });
  } catch (error) {
    console.error("Delete event error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
