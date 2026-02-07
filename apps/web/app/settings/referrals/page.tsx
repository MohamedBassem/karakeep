import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ReferralSettings from "@/components/settings/ReferralSettings";
import { useTranslation } from "@/lib/i18n/server";

import serverConfig from "@karakeep/shared/config";

export async function generateMetadata(): Promise<Metadata> {
  // oxlint-disable-next-line rules-of-hooks
  const { t } = await useTranslation();
  return {
    title: `${t("settings.referrals.referrals")} | Karakeep`,
  };
}

export default async function ReferralsPage() {
  if (!serverConfig.stripe.isConfigured || !serverConfig.referrals.enabled) {
    redirect("/settings");
  }

  return <ReferralSettings />;
}
