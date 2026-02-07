import { randomBytes } from "crypto";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, gte } from "drizzle-orm";
import Stripe from "stripe";
import { z } from "zod";

import {
  referralRewards,
  referrals,
  subscriptions,
  users,
} from "@karakeep/db/schema";
import serverConfig from "@karakeep/shared/config";

import {
  sendReferralRewardEmail,
  sendReferralSignupNotificationEmail,
} from "../email";
import {
  authedProcedure,
  Context,
  createRateLimitMiddleware,
  publicProcedure,
  router,
} from "../index";

const stripe = serverConfig.stripe.secretKey
  ? new Stripe(serverConfig.stripe.secretKey, {
      apiVersion: "2025-06-30.basil",
    })
  : null;

function generateReferralCode(): string {
  const length = serverConfig.referrals.codeLength;
  // Generate a URL-safe referral code
  return randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length)
    .toUpperCase();
}

function requireReferralsEnabled() {
  if (!serverConfig.referrals.enabled) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Referral system is not enabled",
    });
  }
}

function requireStripeAndReferrals() {
  requireReferralsEnabled();
  if (!stripe || !serverConfig.stripe.priceId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Stripe is not configured",
    });
  }
  return stripe;
}

// Check if user has an active subscription
async function isUserSubscribed(
  db: Context["db"],
  userId: string,
): Promise<boolean> {
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });
  return (
    subscription?.status === "active" || subscription?.status === "trialing"
  );
}

// Get or create a referral code for a user
async function getOrCreateReferralCode(
  db: Context["db"],
  userId: string,
): Promise<string> {
  // Check if user already has a referral code
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      referralCode: true,
    },
  });

  if (user?.referralCode) {
    return user.referralCode;
  }

  // Generate a new unique referral code
  let code: string;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    code = generateReferralCode();
    const existing = await db.query.users.findFirst({
      where: eq(users.referralCode, code),
      columns: { id: true },
    });

    if (!existing) {
      break;
    }
    attempts++;
  } while (attempts < maxAttempts);

  if (attempts >= maxAttempts) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to generate unique referral code",
    });
  }

  // Save the referral code to the user
  await db
    .update(users)
    .set({ referralCode: code })
    .where(eq(users.id, userId));

  return code;
}

// Apply referral reward to the referrer
export async function applyReferralReward(
  db: Context["db"],
  referralId: string,
): Promise<void> {
  const stripeClient = requireStripeAndReferrals();

  const referral = await db.query.referrals.findFirst({
    where: eq(referrals.id, referralId),
    with: {
      referrer: {
        with: {
          subscription: true,
        },
      },
    },
  });

  if (!referral || referral.rewardApplied) {
    return;
  }

  const referrerSubscription = referral.referrer.subscription;
  if (!referrerSubscription?.stripeCustomerId) {
    console.error(
      `Referrer ${referral.referrerUserId} has no Stripe customer ID`,
    );
    return;
  }

  // Check if referrer has exceeded monthly reward limit
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [{ rewardCount }] = await db
    .select({ rewardCount: count() })
    .from(referralRewards)
    .where(
      and(
        eq(referralRewards.userId, referral.referrerUserId),
        eq(referralRewards.status, "applied"),
        gte(referralRewards.appliedAt, startOfMonth),
      ),
    );

  if (rewardCount >= serverConfig.referrals.maxRewardsPerMonth) {
    console.log(
      `User ${referral.referrerUserId} has exceeded monthly referral reward limit`,
    );
    return;
  }

  try {
    // Get the subscription price to determine credit amount
    const price = await stripeClient.prices.retrieve(
      serverConfig.stripe.priceId!,
    );
    const creditAmount = price.unit_amount || 0;

    if (creditAmount <= 0) {
      console.error("Invalid subscription price amount");
      return;
    }

    // Apply credit to customer's balance (negative amount = credit)
    const balanceTransaction =
      await stripeClient.customers.createBalanceTransaction(
        referrerSubscription.stripeCustomerId,
        {
          amount: -creditAmount,
          currency: price.currency,
          description: `Referral reward - 1 month free (referral ${referralId})`,
        },
      );

    // Create reward record
    await db.insert(referralRewards).values({
      userId: referral.referrerUserId,
      referralId: referralId,
      rewardType: "free_month",
      amountCents: creditAmount,
      stripeCreditId: balanceTransaction.id,
      status: "applied",
      appliedAt: new Date(),
    });

    // Update referral status
    await db
      .update(referrals)
      .set({
        status: "rewarded",
        rewardApplied: true,
        rewardedAt: new Date(),
      })
      .where(eq(referrals.id, referralId));

    // Send notification email to referrer
    try {
      await sendReferralRewardEmail(
        referral.referrer.email,
        referral.referrer.name,
        referral.referredEmail || "A user",
        creditAmount,
        price.currency,
      );
    } catch (error) {
      console.error("Failed to send referral reward email:", error);
    }
  } catch (error) {
    console.error("Failed to apply referral reward:", error);

    // Record failed reward attempt
    await db.insert(referralRewards).values({
      userId: referral.referrerUserId,
      referralId: referralId,
      rewardType: "free_month",
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// Process referral when a user subscribes
export async function processReferralOnSubscription(
  db: Context["db"],
  userId: string,
): Promise<void> {
  // Find the user and check if they were referred
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      referredBy: true,
    },
  });

  if (!user?.referredBy) {
    return;
  }

  // Find the referral record
  const referral = await db.query.referrals.findFirst({
    where: and(
      eq(referrals.referrerUserId, user.referredBy),
      eq(referrals.referredUserId, userId),
      eq(referrals.status, "signed_up"),
    ),
  });

  if (!referral) {
    return;
  }

  // Update referral status to subscribed
  await db
    .update(referrals)
    .set({
      status: "subscribed",
      subscribedAt: new Date(),
    })
    .where(eq(referrals.id, referral.id));

  // Apply the reward
  await applyReferralReward(db, referral.id);
}

export const referralsRouter = router({
  // Get referral info for the current user (code, stats)
  getReferralInfo: authedProcedure
    .output(
      z.object({
        enabled: z.boolean(),
        isSubscribed: z.boolean(),
        referralCode: z.string().nullable(),
        referralLink: z.string().nullable(),
        stats: z.object({
          totalReferred: z.number(),
          signedUp: z.number(),
          subscribed: z.number(),
          rewardsEarned: z.number(),
          totalRewardAmountCents: z.number(),
        }),
      }),
    )
    .query(async ({ ctx }) => {
      if (!serverConfig.referrals.enabled) {
        return {
          enabled: false,
          isSubscribed: false,
          referralCode: null,
          referralLink: null,
          stats: {
            totalReferred: 0,
            signedUp: 0,
            subscribed: 0,
            rewardsEarned: 0,
            totalRewardAmountCents: 0,
          },
        };
      }

      const isSubscribed = await isUserSubscribed(ctx.db, ctx.user.id);

      if (!isSubscribed) {
        return {
          enabled: true,
          isSubscribed: false,
          referralCode: null,
          referralLink: null,
          stats: {
            totalReferred: 0,
            signedUp: 0,
            subscribed: 0,
            rewardsEarned: 0,
            totalRewardAmountCents: 0,
          },
        };
      }

      const referralCode = await getOrCreateReferralCode(ctx.db, ctx.user.id);
      const referralLink = `${serverConfig.publicUrl}/signup?ref=${referralCode}`;

      // Get referral stats
      const userReferrals = await ctx.db.query.referrals.findMany({
        where: eq(referrals.referrerUserId, ctx.user.id),
      });

      const totalReferred = userReferrals.length;
      const signedUp = userReferrals.filter(
        (r) => r.status !== "pending" && r.status !== "expired",
      ).length;
      const subscribed = userReferrals.filter(
        (r) => r.status === "subscribed" || r.status === "rewarded",
      ).length;

      // Get reward stats
      const rewards = await ctx.db.query.referralRewards.findMany({
        where: and(
          eq(referralRewards.userId, ctx.user.id),
          eq(referralRewards.status, "applied"),
        ),
      });

      const rewardsEarned = rewards.length;
      const totalRewardAmountCents = rewards.reduce(
        (sum, r) => sum + (r.amountCents || 0),
        0,
      );

      return {
        enabled: true,
        isSubscribed: true,
        referralCode,
        referralLink,
        stats: {
          totalReferred,
          signedUp,
          subscribed,
          rewardsEarned,
          totalRewardAmountCents,
        },
      };
    }),

  // Get referral history
  getReferralHistory: authedProcedure
    .output(
      z.object({
        referrals: z.array(
          z.object({
            id: z.string(),
            referredEmail: z.string().nullable(),
            status: z.enum([
              "pending",
              "signed_up",
              "subscribed",
              "rewarded",
              "expired",
            ]),
            createdAt: z.date(),
            usedAt: z.date().nullable(),
            subscribedAt: z.date().nullable(),
            rewardedAt: z.date().nullable(),
            rewardAmountCents: z.number().nullable(),
          }),
        ),
      }),
    )
    .query(async ({ ctx }) => {
      requireReferralsEnabled();

      const userReferrals = await ctx.db.query.referrals.findMany({
        where: eq(referrals.referrerUserId, ctx.user.id),
        orderBy: [desc(referrals.createdAt)],
        with: {
          rewards: {
            where: eq(referralRewards.status, "applied"),
            columns: {
              amountCents: true,
            },
          },
        },
      });

      return {
        referrals: userReferrals.map((r) => ({
          id: r.id,
          referredEmail: r.referredEmail,
          status: r.status,
          createdAt: r.createdAt,
          usedAt: r.usedAt,
          subscribedAt: r.subscribedAt,
          rewardedAt: r.rewardedAt,
          rewardAmountCents: r.rewards[0]?.amountCents ?? null,
        })),
      };
    }),

  // Regenerate referral code
  regenerateCode: authedProcedure
    .use(
      createRateLimitMiddleware({
        name: "referrals.regenerateCode",
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 3,
      }),
    )
    .mutation(async ({ ctx }) => {
      requireReferralsEnabled();

      const isSubscribed = await isUserSubscribed(ctx.db, ctx.user.id);
      if (!isSubscribed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only subscribed users can generate referral codes",
        });
      }

      // Generate new unique code
      let code: string;
      let attempts = 0;
      const maxAttempts = 10;

      do {
        code = generateReferralCode();
        const existing = await ctx.db.query.users.findFirst({
          where: eq(users.referralCode, code),
          columns: { id: true },
        });

        if (!existing) {
          break;
        }
        attempts++;
      } while (attempts < maxAttempts);

      if (attempts >= maxAttempts) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate unique referral code",
        });
      }

      await ctx.db
        .update(users)
        .set({ referralCode: code })
        .where(eq(users.id, ctx.user.id));

      return {
        referralCode: code,
        referralLink: `${serverConfig.publicUrl}/signup?ref=${code}`,
      };
    }),

  // Validate a referral code (public endpoint for signup page)
  validateCode: publicProcedure
    .use(
      createRateLimitMiddleware({
        name: "referrals.validateCode",
        windowMs: 60 * 1000,
        maxRequests: 20,
      }),
    )
    .input(
      z.object({
        code: z.string(),
      }),
    )
    .output(
      z.object({
        valid: z.boolean(),
        referrerName: z.string().nullable(),
      }),
    )
    .query(async ({ input, ctx }) => {
      if (!serverConfig.referrals.enabled) {
        return { valid: false, referrerName: null };
      }

      const referrer = await ctx.db.query.users.findFirst({
        where: eq(users.referralCode, input.code.toUpperCase()),
        columns: {
          id: true,
          name: true,
        },
        with: {
          subscription: {
            columns: {
              status: true,
            },
          },
        },
      });

      if (!referrer) {
        return { valid: false, referrerName: null };
      }

      // Check if referrer has active subscription
      const isActive =
        referrer.subscription?.status === "active" ||
        referrer.subscription?.status === "trialing";

      if (!isActive) {
        return { valid: false, referrerName: null };
      }

      return {
        valid: true,
        referrerName: referrer.name,
      };
    }),

  // Record a referral when user signs up (called internally)
  recordReferral: publicProcedure
    .input(
      z.object({
        referralCode: z.string(),
        referredUserId: z.string(),
        referredEmail: z.string().email(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!serverConfig.referrals.enabled) {
        return { success: false };
      }

      const referrer = await ctx.db.query.users.findFirst({
        where: eq(users.referralCode, input.referralCode.toUpperCase()),
        columns: {
          id: true,
          name: true,
          email: true,
        },
        with: {
          subscription: {
            columns: {
              status: true,
            },
          },
        },
      });

      if (!referrer) {
        return { success: false };
      }

      // Check if referrer has active subscription
      const isActive =
        referrer.subscription?.status === "active" ||
        referrer.subscription?.status === "trialing";

      if (!isActive) {
        return { success: false };
      }

      // Prevent self-referral
      if (referrer.id === input.referredUserId) {
        return { success: false };
      }

      // Check if this user was already referred
      const existingReferral = await ctx.db.query.referrals.findFirst({
        where: eq(referrals.referredUserId, input.referredUserId),
      });

      if (existingReferral) {
        return { success: false };
      }

      // Create referral record
      await ctx.db.insert(referrals).values({
        referrerUserId: referrer.id,
        referralCode: input.referralCode.toUpperCase(),
        referredUserId: input.referredUserId,
        referredEmail: input.referredEmail,
        status: "signed_up",
        usedAt: new Date(),
      });

      // Update referred user with referrer info
      await ctx.db
        .update(users)
        .set({ referredBy: referrer.id })
        .where(eq(users.id, input.referredUserId));

      // Send notification to referrer
      try {
        await sendReferralSignupNotificationEmail(
          referrer.email,
          referrer.name,
          input.referredEmail,
        );
      } catch (error) {
        console.error("Failed to send referral signup notification:", error);
      }

      return { success: true };
    }),
});
