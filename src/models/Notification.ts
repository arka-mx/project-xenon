import mongoose, { Document, Schema } from "mongoose";

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  content: string;
  type:
    | "booking_approved"
    | "booking_rejected"
    | "booking_reopened"
    | "booking_confirmed";
  status: "unread" | "read";
  metadata?: {
    bookingId?: string;
    hoardingId?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    type: {
      type: String,
      enum: [
        "booking_approved",
        "booking_rejected",
        "booking_reopened",
        "booking_confirmed",
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ["unread", "read"],
      default: "unread",
    },
    metadata: {
      bookingId: { type: String },
      hoardingId: { type: String },
    },
  },
  { timestamps: true },
);

const Notification =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;
