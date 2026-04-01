import mongoose, { Schema, Document } from 'mongoose';

export interface IBooking extends Document {
  hoarding: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  totalAmount: number;
  platformFee: number;
  vendorAmount: number;
  status:
    | 'requested'
    | 'approved'
    | 'rejected'
    | 'confirmed'
    | 'cancelled';
  paymentId?: string;
  orderId?: string;
  createdAt: Date;
}

const BookingSchema: Schema<IBooking> = new Schema({
  hoarding: { type: Schema.Types.ObjectId, ref: 'Hoarding', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  totalAmount: { type: Number, required: true },
  platformFee: { type: Number, default: 0 },
  vendorAmount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['requested', 'approved', 'rejected', 'confirmed', 'cancelled'],
    default: 'requested',
  },
  paymentId: { type: String },
  orderId: { type: String },
}, { timestamps: true });

const Booking =
  (mongoose.models.Booking as mongoose.Model<IBooking> | undefined) ||
  mongoose.model<IBooking>('Booking', BookingSchema);

if (
  mongoose.models.Booking &&
  mongoose.models.Booking.schema.path("status")?.instance === "String"
) {
  const statusPath = mongoose.models.Booking.schema.path("status") as
    | mongoose.SchemaType
    | undefined;
  const orderIdPath = mongoose.models.Booking.schema.path("orderId") as
    | mongoose.SchemaType
    | undefined;
  const statusEnum = (statusPath?.options?.enum as string[] | undefined) || [];
  const orderIdRequired = Boolean(orderIdPath?.options?.required);

  if (!statusEnum.includes("requested") || orderIdRequired) {
    delete mongoose.models.Booking;
  }
}

const FreshBooking =
  (mongoose.models.Booking as mongoose.Model<IBooking> | undefined) ||
  mongoose.model<IBooking>("Booking", BookingSchema);
export default FreshBooking;
