import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { verifyToken } from '@/lib/jwt';
import { kycSchema } from '@/lib/validators/user';
import { normalizePhone } from '@/lib/otp';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    await dbConnect();
    const currentUser = await User.findById(payload.userId);
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const phone = currentUser.phone ? normalizePhone(currentUser.phone) : "";

    if (!phone) {
      return NextResponse.json(
        { error: "A phone number must be saved on this account before KYC can be submitted." },
        { status: 400 },
      );
    }

    if (!currentUser.isPhoneVerified) {
      return NextResponse.json(
        { error: "Phone number must be verified before submitting KYC details." },
        { status: 400 },
      );
    }

    const result = kycSchema.safeParse({
      ...body,
      phone,
    });
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { address, companyName, gstin, pan, aadhaar, documents } = result.data;

    // Check if phone already exists for another user
    const existingPhone = await User.findOne({ phone, _id: { $ne: payload.userId } });
    if (existingPhone) {
      return NextResponse.json({ error: "Phone number already in use" }, { status: 400 });
    }

    const updatedUser = await User.findByIdAndUpdate(payload.userId, {
      kycDetails: {
        phone,
        address,
        companyName,
        gstin,
        pan,
        aadhaar,
        documents: documents || []
      },
      kycStatus: 'submitted',
    }, { new: true });

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "KYC submitted successfully.",
      user: updatedUser,
    });
  } catch (error: unknown) {
    console.error("KYC Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
