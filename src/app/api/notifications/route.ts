import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/jwt";
import dbConnect from "@/lib/dbConnect";
import Notification from "@/models/Notification";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    await dbConnect();
    const notifications = await Notification.find({ user: payload.userId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ notifications });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { notificationIds, markAll = false } = await req.json();
    await dbConnect();

    const query: Record<string, unknown> = {
      user: payload.userId,
      status: "unread",
    };

    if (Array.isArray(notificationIds) && notificationIds.length > 0) {
      query._id = { $in: notificationIds };
    } else if (!markAll) {
      return NextResponse.json(
        { error: "notificationIds or markAll is required" },
        { status: 400 },
      );
    }

    await Notification.updateMany(query, { $set: { status: "read" } });
    return NextResponse.json({ message: "Notifications marked as read" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
