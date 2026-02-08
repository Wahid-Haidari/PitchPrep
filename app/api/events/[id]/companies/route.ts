import { NextRequest, NextResponse } from "next/server";
import { getDb, Collections } from "@/lib/db/mongodb";
import { getAuthUser } from "@/lib/services/auth";

/** POST /api/events/[id]/companies — add a company to an event */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser || authUser.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id: eventId } = await params;
    const { companyId } = await req.json();

    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }

    const db = await getDb();

    // Verify event exists
    const event = await db.collection(Collections.EVENTS).findOne({ id: eventId });
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Add company to event (no duplicates)
    await db.collection(Collections.EVENTS).updateOne(
      { id: eventId },
      { $addToSet: { companyIds: companyId } }
    );

    return NextResponse.json({ message: "Company added to event" });
  } catch (error) {
    console.error("Add company to event error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** DELETE /api/events/[id]/companies — remove a company from an event */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser || authUser.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id: eventId } = await params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json({ error: "companyId query param is required" }, { status: 400 });
    }

    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.collection(Collections.EVENTS).updateOne(
      { id: eventId },
      { $pull: { companyIds: companyId } } as any
    );

    return NextResponse.json({ message: "Company removed from event" });
  } catch (error) {
    console.error("Remove company from event error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
