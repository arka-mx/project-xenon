import User from '@/models/User';
import { hashPassword } from '@/lib/password';

const DEFAULT_ADMIN_NAME = 'HoardSpace Admin';
const DEFAULT_ADMIN_ROLE = 'admin' as const;

let adminSeedPromise: Promise<void> | null = null;

async function seedDefaultAdmin() {
  const email = process.env.DEFAULT_ADMIN_EMAIL?.trim();
  const password = process.env.DEFAULT_ADMIN_PASSWORD;

  if (!email || !password) {
    return;
  }

  const existingAdmin = await User.findOne({ email }).select('_id');
  const hashedPassword = await hashPassword(password);

  if (existingAdmin) {
    await User.findByIdAndUpdate(existingAdmin._id, {
      name: DEFAULT_ADMIN_NAME,
      password: hashedPassword,
      role: DEFAULT_ADMIN_ROLE,
      authProvider: 'local',
      emailVerified: true,
      isPhoneVerified: true,
      kycStatus: 'approved',
    });
    return;
  }

  await User.create({
    name: DEFAULT_ADMIN_NAME,
    email,
    password: hashedPassword,
    role: DEFAULT_ADMIN_ROLE,
    authProvider: 'local',
    emailVerified: true,
    isPhoneVerified: true,
    kycStatus: 'approved',
  });
}

export async function ensureDefaultAdminUser() {
  if (!adminSeedPromise) {
    adminSeedPromise = seedDefaultAdmin().catch((error) => {
      adminSeedPromise = null;
      throw error;
    });
  }

  await adminSeedPromise;
}
