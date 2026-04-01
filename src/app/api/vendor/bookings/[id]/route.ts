import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/jwt";
import dbConnect from "@/lib/dbConnect";
import Booking from "@/models/Booking";
import User from "@/models/User";
import Notification from "@/models/Notification";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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

    const vendor = await User.findById(payload.userId);
    if (!vendor || vendor.role !== "vendor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const booking = await Booking.findById(id).populate("hoarding", "name owner");
    if (!booking || !booking.hoarding) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const hoarding = booking.hoarding as any;
    if (hoarding.owner.toString() !== vendor._id.toString()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { status } = await req.json();
    if (!["approved", "rejected", "requested"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    booking.status = status;
    booking.paymentId = undefined;
    if (status !== "approved") {
      booking.orderId = undefined;
    }
    await booking.save();

    let title = "";
    let content = "";
    let type: "booking_approved" | "booking_rejected" | "booking_reopened" =
      "booking_approved";

    if (status === "approved") {
      title = "Booking Request Approved";
      content = `Your request for ${hoarding.name} was approved. Payment is now available.`;
      type = "booking_approved";
    } else if (status === "rejected") {
      title = "Booking Request Rejected";
      content = `Your request for ${hoarding.name} was rejected by the vendor.`;
      type = "booking_rejected";
    } else {
      title = "Booking Request Reopened";
      content = `Your request for ${hoarding.name} was reopened by the vendor.`;
      type = "booking_reopened";
    }

    await Notification.create({
      user: booking.user,
      title,
      content,
      type,
      metadata: {
        bookingId: booking._id.toString(),
        hoardingId: hoarding._id.toString(),
      },
    });

    return NextResponse.json({ message: "Booking updated successfully", booking });
  } catch (error: any) {
    console.error("Vendor booking update error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update booking" },
      { status: 500 },
    );
  }
}
