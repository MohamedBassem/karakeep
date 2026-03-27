"use client";

import { useEffect, useState } from "react";
import { toast } from "@/components/ui/sonner";
import { useTranslation } from "@/lib/i18n/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { useTRPC } from "@karakeep/shared-react/trpc";

import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { SettingsSection } from "./SettingsPage";

export default function SubscriptionSettings() {
  const api = useTRPC();
  const { t } = useTranslation();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const {
    data: subscriptionStatus,
    refetch,
    isLoading: isQueryLoading,
  } = useQuery(api.subscriptions.getSubscriptionStatus.queryOptions());

  const { data: subscriptionPrice } = useQuery(
    api.subscriptions.getSubscriptionPrice.queryOptions(),
  );

  const { mutate: syncStripeState } = useMutation(
    api.subscriptions.syncWithStripe.mutationOptions({
      onSuccess: () => {
        refetch();
      },
    }),
  );
  const createCheckoutSession = useMutation(
    api.subscriptions.createCheckoutSession.mutationOptions({
      onSuccess: (resp) => {
        if (resp.url) {
          window.location.href = resp.url;
        }
      },
      onError: () => {
        toast({
          description: t("common.something_went_wrong"),
          variant: "destructive",
        });
      },
    }),
  );
  const createPortalSession = useMutation(
    api.subscriptions.createPortalSession.mutationOptions({
      onSuccess: (resp) => {
        if (resp.url) {
          window.location.href = resp.url;
        }
      },
      onError: () => {
        toast({
          description: t("common.something_went_wrong"),
          variant: "destructive",
        });
      },
    }),
  );

  const isLoading =
    createCheckoutSession.isPending || createPortalSession.isPending;

  useEffect(() => {
    syncStripeState();
  }, []);

  const hasYearlyPricing = !!subscriptionPrice?.yearly;

  const currentPrice =
    billingPeriod === "yearly" && subscriptionPrice?.yearly
      ? subscriptionPrice.yearly
      : subscriptionPrice?.monthly;

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const getStatusBadge = (status: "free" | "paid") => {
    switch (status) {
      case "paid":
        return (
          <Badge variant="default" className="bg-green-500">
            {t("settings.subscription.paid")}
          </Badge>
        );
      case "free":
        return (
          <Badge variant="outline">{t("settings.subscription.free")}</Badge>
        );
    }
  };

  const formatPrice = (amount: number | null, currency: string) => {
    if (amount === null) return null;
    return `${amount / 100} ${currency.toUpperCase()}`;
  };

  return (
    <SettingsSection
      title={t("settings.subscription.subscription")}
      description={t("settings.subscription.manage_subscription")}
    >
      {isQueryLoading ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-12" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("settings.subscription.current_plan")}
              </label>
              <div className="flex items-center gap-2">
                {subscriptionStatus?.tier &&
                  getStatusBadge(subscriptionStatus.tier)}
              </div>
            </div>

            {subscriptionStatus?.hasActiveSubscription && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t("settings.subscription.billing_period")}
                  </label>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(subscriptionStatus.startDate)} -{" "}
                    {formatDate(subscriptionStatus.endDate)}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="space-y-4">
            {!subscriptionStatus?.hasActiveSubscription ? (
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="flex items-center gap-2 font-semibold">
                        {t("settings.subscription.paid_plan")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t("settings.subscription.unlock_bigger_quota")}
                      </p>
                      {hasYearlyPricing && (
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setBillingPeriod("monthly")}
                            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                              billingPeriod === "monthly"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            {t("settings.subscription.monthly")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setBillingPeriod("yearly")}
                            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                              billingPeriod === "yearly"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            {t("settings.subscription.yearly")}
                          </button>
                        </div>
                      )}
                      {currentPrice && currentPrice.amount ? (
                        <span className="flex items-baseline gap-2">
                          <p className="mt-2 text-lg font-bold">
                            {formatPrice(currentPrice.amount, currentPrice.currency)}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            /{billingPeriod === "yearly"
                              ? t("settings.subscription.per_year")
                              : t("settings.subscription.per_month")}
                          </span>
                          <span className="text-xs italic text-muted-foreground">
                            ({t("settings.subscription.excl_vat")})
                          </span>
                        </span>
                      ) : (
                        <Skeleton className="h-4 w-24" />
                      )}
                      {billingPeriod === "yearly" &&
                        subscriptionPrice?.monthly?.amount &&
                        subscriptionPrice?.yearly?.amount && (
                          <p className="mt-1 text-xs text-green-600">
                            {t("settings.subscription.yearly_savings", {
                              amount: formatPrice(
                                subscriptionPrice.monthly.amount * 12 -
                                  subscriptionPrice.yearly.amount,
                                subscriptionPrice.monthly.currency,
                              ),
                            })}
                          </p>
                        )}
                    </div>
                    <Button
                      onClick={() =>
                        createCheckoutSession.mutate({ billingPeriod })
                      }
                      disabled={isLoading}
                      size="lg"
                      className="shadow-md transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
                    >
                      {isLoading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {t("settings.subscription.subscribe_now")}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    onClick={() => createPortalSession.mutate()}
                    disabled={isLoading}
                    variant="outline"
                  >
                    {isLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {t("settings.subscription.manage_billing")}
                  </Button>
                </div>

                {subscriptionStatus.cancelAtPeriodEnd && (
                  <Alert>
                    <AlertDescription>
                      {t("settings.subscription.subscription_canceled", {
                        date: formatDate(subscriptionStatus.endDate),
                      })}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </SettingsSection>
  );
}
