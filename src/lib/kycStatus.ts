export const RAW_KYC_STATUSES = [
  "not_submitted",
  "pending",
  "submitted",
  "approved",
  "rejected",
  "verified",
] as const;

export type RawKycStatus = (typeof RAW_KYC_STATUSES)[number];

export const DISPLAY_KYC_STATUSES = [
  "not_submitted",
  "submitted",
  "approved",
  "rejected",
] as const;

export type DisplayKycStatus = (typeof DISPLAY_KYC_STATUSES)[number];

export function normalizeKycStatus(status?: string): DisplayKycStatus {
  if (!status) {
    return "not_submitted";
  }

  if (status === "pending") {
    return "submitted";
  }

  if (status === "verified") {
    return "approved";
  }

  if (DISPLAY_KYC_STATUSES.includes(status as DisplayKycStatus)) {
    return status as DisplayKycStatus;
  }

  return "not_submitted";
}

export const RESETTABLE_KYC_STATUSES: DisplayKycStatus[] = [
  "approved",
  "rejected",
];

