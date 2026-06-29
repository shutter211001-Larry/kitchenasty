import prisma from './db.js';

/**
 * Grants a one-time registration bonus to a newly created customer.
 * Uses RegistrationBonusRecord to prevent the same social identity or email
 * from claiming the bonus again, even after account deletion.
 *
 * @param customerId - The ID of the newly created customer
 * @param provider   - 'email' | 'google' | 'line'
 * @param identifier - The email address or social ID used to identify the user
 */
export async function grantRegistrationBonus(
  customerId: string,
  provider: 'email' | 'google' | 'line',
  identifier: string
): Promise<void> {
  try {
    // 1. Load bonus amount from site settings
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
      select: { generalSettings: true },
    });
    const general = (settings?.generalSettings as any) || {};
    const bonusPoints: number = general.registrationBonus || 0;

    if (bonusPoints <= 0) return; // Bonus not configured, nothing to do

    // 2. Check if this identity has already received the bonus (even from a deleted account)
    const alreadyClaimed = await prisma.registrationBonusRecord.findUnique({
      where: { provider_identifier: { provider, identifier } },
    });

    if (alreadyClaimed) {
      console.log(`[RegistrationBonus] Skipped: ${provider}:${identifier} already claimed.`);
      return;
    }

    // 3. Grant the bonus in a transaction — both record AND points update
    await prisma.$transaction([
      // Record this identity as claimed FIRST to prevent race conditions
      prisma.registrationBonusRecord.create({
        data: { provider, identifier },
      }),
      // Add points to the customer
      prisma.customer.update({
        where: { id: customerId },
        data: { loyaltyPoints: { increment: bonusPoints } },
      }),
      // Create a transaction log entry
      prisma.loyaltyTransaction.create({
        data: {
          customerId,
          type: 'ADJUST',
          points: bonusPoints,
          description: `Registration bonus (${provider})`,
        },
      }),
    ]);

    console.log(`[RegistrationBonus] Granted ${bonusPoints} points to customer ${customerId} via ${provider}.`);
  } catch (err) {
    // Non-critical: log but don't crash the registration flow
    console.error('[RegistrationBonus] Failed to grant bonus:', err);
  }
}
