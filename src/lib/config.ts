import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { PublicConfig } from "@/types";

/**
 * Fetch public business configuration from the database.
 * Used in RSC (server components / layouts).
 * Wrapped with React.cache() to deduplicate calls within the same request.
 */
export const getPublicConfig = cache(async function getPublicConfig(): Promise<PublicConfig | null> {
  try {
    const config = await prisma.businessConfig.findFirst();
    if (!config) return null;

    return {
      businessName: config.businessName,
      logo: config.logo,
      primaryColor: config.primaryColor ?? "#3B82F6",
      secondaryColor: config.secondaryColor ?? "#1E40AF",
      email: config.email,
      phone: config.phone,
      address: config.address,
      instagram: config.instagram,
      facebook: config.facebook,
      website: config.website,
      availableHours: config.availableHours,
      bufferTime: config.bufferTime ?? 30,
      requireDeposit: config.requireDeposit ?? false,
      depositType: config.depositType ?? "percentage",
      depositAmount: Number(config.depositAmount ?? 50),
      blockedDates: config.blockedDates,
      minAdvanceHours: config.minAdvanceHours ?? 0,
      termsAndConditions: config.termsAndConditions,
      cancellationPolicy: config.cancellationPolicy,
      currency: config.currency ?? "USD",
      setupCompleted: config.setupCompleted ?? false,
    };
  } catch {
    return null;
  }
});
