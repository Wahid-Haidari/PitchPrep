import { NextRequest, NextResponse } from "next/server";
import { getDb, Collections } from "@/lib/db/mongodb";
import { getAuthUser } from "@/lib/services/auth";

/** GET /api/events — list all events */
export async function GET() {
  try {
    const db = await getDb();
    const events = await db
      .collection(Collections.EVENTS)
      .find({})
      .sort({ date: 1 })
      .toArray();

    const result = events.map((e) => ({ ...e, _id: undefined }));
    return NextResponse.json({ events: result });
  } catch (error) {
    console.error("Get events error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST /api/events — create a new event (admin only) */
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser || authUser.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { name, date, location, description } = await req.json();

    if (!name || !date) {
      return NextResponse.json({ error: "Name and date are required" }, { status: 400 });
    }

    const event = {
      id: `evt-${Date.now()}`,
      name: name.trim(),
      date: date.trim(),
      location: location?.trim() || "TBD",
      description: description?.trim() || "",
      companyIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const db = await getDb();
    await db.collection(Collections.EVENTS).insertOne(event);

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error("Create event error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
