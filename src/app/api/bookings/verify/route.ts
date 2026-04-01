import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/models/Booking';
import Notification from '@/models/Notification';
import { sendBookingConfirmationEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    const key_secret = process.env.RAZORPAY_KEY_SECRET!;
    
    // Verify Signature
    const shasum = crypto.createHmac("sha256", key_secret);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest("hex");

    if (digest !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    await dbConnect();
    
    // Update Booking Status
    const booking = await Booking.findOneAndUpdate(
      { orderId: razorpay_order_id },
      { 
        status: 'confirmed', 
        paymentId: razorpay_payment_id,
        paidAt: new Date(),
      },
      { new: true }
    );

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const populatedBooking = await Booking.findById(booking._id)
      .populate("user", "name email")
      .populate("hoarding", "name location.city");

    const bookingUser = populatedBooking?.user as
      | { _id: { toString(): string }; name: string; email: string }
      | undefined;
    const bookingHoarding = populatedBooking?.hoarding as
      | {
          _id: { toString(): string };
          name: string;
          location?: { city?: string };
        }
      | undefined;

    if (populatedBooking && bookingUser && bookingHoarding) {
      await Notification.create({
        user: bookingUser._id,
        title: "Booking confirmed",
        content: `Your payment for ${bookingHoarding.name} was successful. Your booking is confirmed.`,
        type: "booking_confirmed",
        metadata: {
          bookingId: populatedBooking._id.toString(),
          hoardingId: bookingHoarding._id.toString(),
        },
      });

      sendBookingConfirmationEmail({
        email: bookingUser.email,
        buyerName: bookingUser.name,
        hoardingName: bookingHoarding.name,
        city: bookingHoarding.location?.city,
        startDate: populatedBooking.startDate,
        endDate: populatedBooking.endDate,
        totalAmount: populatedBooking.totalAmount,
        orderId: populatedBooking.orderId,
        paymentId: populatedBooking.paymentId,
        paidAt: populatedBooking.paidAt,
      }).catch((error) => {
        console.error("Failed to send booking confirmation email:", error);
      });
    }

    return NextResponse.json({
      success: true,
      bookingId: booking._id,
      booking: {
        _id: booking._id,
        status: booking.status,
        paymentId: booking.paymentId,
        orderId: booking.orderId,
        paidAt: booking.paidAt,
      },
    });

  } catch (error: any) {
    console.error("Payment Verification Error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
