"use client";

import { useState } from "react";
import { toast } from "@/components/ui/sonner";
import { useTranslation } from "@/lib/i18n/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Check,
  Copy,
  Gift,
  Loader2,
  RefreshCw,
  UserPlus,
  Users,
} from "lucide-react";

import { useTRPC } from "@karakeep/shared-react/trpc";

import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Skeleton } from "../ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

export default function ReferralSettings() {
  const api = useTRPC();
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const { data: referralInfo, isLoading: isInfoLoading } = useQuery(
    api.referrals.getReferralInfo.queryOptions(),
  );

  const { data: referralHistory, isLoading: isHistoryLoading } = useQuery(
    api.referrals.getReferralHistory.queryOptions(),
  );

  const regenerateCode = useMutation(
    api.referrals.regenerateCode.mutationOptions({
      onSuccess: () => {
        toast({
          description: t("settings.referrals.code_regenerated"),
        });
      },
      onError: () => {
        toast({
          description: t("common.something_went_wrong"),
          variant: "destructive",
        });
      },
    }),
  );

  const copyToClipboard = async () => {
    if (referralInfo?.referralLink) {
      await navigator.clipboard.writeText(referralInfo.referralLink);
      setCopied(true);
      toast({
        description: t("settings.referrals.link_copied"),
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(date));
  };

  const formatCurrency = (cents: number | null) => {
    if (cents === null) return "-";
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getStatusBadge = (
    status: "pending" | "signed_up" | "subscribed" | "rewarded" | "expired",
  ) => {
    switch (status) {
      case "rewarded":
        return (
          <Badge variant="default" className="bg-green-500">
            {t("settings.referrals.status_rewarded")}
          </Badge>
        );
      case "subscribed":
        return (
          <Badge variant="default" className="bg-blue-500">
            {t("settings.referrals.status_subscribed")}
          </Badge>
        );
      case "signed_up":
        return (
          <Badge variant="outline">
            {t("settings.referrals.status_signed_up")}
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            {t("settings.referrals.status_pending")}
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="destructive">
            {t("settings.referrals.status_expired")}
          </Badge>
        );
    }
  };

  if (isInfoLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <div className="grid gap-4 md:grid-cols-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!referralInfo?.enabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            {t("settings.referrals.referrals")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              {t("settings.referrals.not_enabled")}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!referralInfo?.isSubscribed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            {t("settings.referrals.referrals")}
          </CardTitle>
          <CardDescription>
            {t("settings.referrals.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              {t("settings.referrals.subscribe_to_refer")}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            {t("settings.referrals.referrals")}
          </CardTitle>
          <CardDescription>
            {t("settings.referrals.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Referral Link */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("settings.referrals.your_referral_link")}
            </label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={referralInfo.referralLink || ""}
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
                title={t("settings.referrals.copy_link")}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => regenerateCode.mutate()}
                disabled={regenerateCode.isPending}
                title={t("settings.referrals.regenerate_code")}
              >
                {regenerateCode.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("settings.referrals.how_it_works")}
            </p>
          </div>

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="text-sm">
                  {t("settings.referrals.total_referred")}
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold">
                {referralInfo.stats.totalReferred}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <UserPlus className="h-4 w-4" />
                <span className="text-sm">
                  {t("settings.referrals.signed_up")}
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold">
                {referralInfo.stats.signedUp}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Gift className="h-4 w-4" />
                <span className="text-sm">
                  {t("settings.referrals.rewards_earned")}
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold">
                {referralInfo.stats.rewardsEarned}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Gift className="h-4 w-4" />
                <span className="text-sm">
                  {t("settings.referrals.total_rewards")}
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold">
                {formatCurrency(referralInfo.stats.totalRewardAmountCents)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral History */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.referrals.history")}</CardTitle>
          <CardDescription>
            {t("settings.referrals.history_description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isHistoryLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : referralHistory?.referrals.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">
              {t("settings.referrals.no_referrals")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("settings.referrals.email")}</TableHead>
                  <TableHead>{t("settings.referrals.status")}</TableHead>
                  <TableHead>
                    {t("settings.referrals.signed_up_date")}
                  </TableHead>
                  <TableHead>{t("settings.referrals.reward")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referralHistory?.referrals.map((referral) => (
                  <TableRow key={referral.id}>
                    <TableCell className="font-mono text-sm">
                      {referral.referredEmail || "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(referral.status)}</TableCell>
                    <TableCell>{formatDate(referral.usedAt)}</TableCell>
                    <TableCell>
                      {formatCurrency(referral.rewardAmountCents)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
