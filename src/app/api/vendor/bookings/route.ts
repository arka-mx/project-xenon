import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/jwt";
import dbConnect from "@/lib/dbConnect";
import Booking from "@/models/Booking";
import Hoarding from "@/models/Hoarding";
import User from "@/models/User";

export async function GET(req: Request) {
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

    // Check if user is vendor
    const user = await User.findById(payload.userId);
    if (!user || user.role !== "vendor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    // First, get all hoardings owned by this vendor
    const vendorHoardings = await Hoarding.find({
      owner: user._id,
    }).select("_id");

    const hoardingIds = vendorHoardings.map((h) => h._id);

    // Build query to get bookings for vendor's hoardings only
    const query: any = {
      hoarding: { $in: hoardingIds },
    };
    
    if (status) {
      query.status = status;
    }

    // Fetch bookings for vendor's hoardings with populated data
    const bookings = await Booking.find(query)
      .populate({
        path: "user",
        select: "name email phone",
      })
      .populate({
        path: "hoarding",
        select: "name location.address location.city pricePerMonth",
      })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ bookings });
  } catch (error: any) {
    console.error("Fetch vendor bookings error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}
