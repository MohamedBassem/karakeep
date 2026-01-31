import { ScrollView, View } from "react-native";
import CustomSafeAreaView from "@/components/ui/CustomSafeAreaView";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import { api } from "@/lib/trpc";
import { Database, HardDrive } from "lucide-react-native";
import colors from "tailwindcss/colors";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

interface QuotaProgressBarProps {
  percentage: number;
  isNearLimit: boolean;
  isAtLimit: boolean;
}

function QuotaProgressBar({
  percentage,
  isNearLimit,
  isAtLimit,
}: QuotaProgressBarProps) {
  const getProgressColor = () => {
    if (isAtLimit) return "bg-red-500";
    if (isNearLimit) return "bg-orange-500";
    return "bg-blue-500";
  };

  return (
    <View className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <View
        className={`h-full ${getProgressColor()}`}
        style={{ width: `${percentage}%` }}
      />
    </View>
  );
}

interface QuotaItemProps {
  title: string;
  icon: React.ReactNode;
  used: number;
  quota: number | null;
  unlimited: boolean;
  formatter: (value: number) => string;
  description: string;
}

function QuotaItem({
  title,
  icon,
  used,
  quota,
  unlimited,
  formatter,
  description,
}: QuotaItemProps) {
  const percentage =
    unlimited || !quota ? 0 : Math.min((used / quota) * 100, 100);
  const isNearLimit = percentage > 80;
  const isAtLimit = percentage >= 100;

  return (
    <View className="gap-3">
      <View className="flex flex-row items-center gap-2">
        {icon}
        <Text className="font-medium">{title}</Text>
      </View>

      <View className="gap-2">
        <View className="flex flex-row justify-between">
          <Text className="text-sm text-muted-foreground">{description}</Text>
          <Text className={isAtLimit ? "font-medium text-red-500" : ""}>
            {formatter(used)}
            {!unlimited && quota !== null && ` / ${formatter(quota)}`}
          </Text>
        </View>

        {!unlimited && quota && (
          <QuotaProgressBar
            percentage={percentage}
            isNearLimit={isNearLimit}
            isAtLimit={isAtLimit}
          />
        )}

        {unlimited && (
          <Text className="text-xs text-muted-foreground">Unlimited usage</Text>
        )}

        {isAtLimit && (
          <Text className="text-xs text-red-500">Quota limit reached</Text>
        )}

        {isNearLimit && !isAtLimit && (
          <Text className="text-xs text-orange-500">
            Approaching quota limit
          </Text>
        )}
      </View>
    </View>
  );
}

function QuotaLoadingSkeleton() {
  return (
    <View className="gap-6">
      <View className="gap-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-2 w-full" />
      </View>
      <View className="gap-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-2 w-full" />
      </View>
    </View>
  );
}

export default function QuotaPage() {
  const {
    data: quotaUsage,
    isLoading,
    error,
  } = api.subscriptions.getQuotaUsage.useQuery();

  return (
    <CustomSafeAreaView>
      <ScrollView className="w-full" contentContainerClassName="px-4 py-2">
        <View className="w-full rounded-xl bg-card p-4">
          <Text className="mb-1 text-lg font-semibold">Usage & Quotas</Text>
          <Text className="mb-4 text-sm text-muted-foreground">
            Track your current usage against your plan limits
          </Text>

          {isLoading ? (
            <QuotaLoadingSkeleton />
          ) : error ? (
            <Text className="text-red-500">
              Failed to load quota information
            </Text>
          ) : quotaUsage ? (
            <View className="gap-6">
              <QuotaItem
                title="Bookmarks"
                icon={<Database size={16} color={colors.gray[500]} />}
                used={quotaUsage.bookmarks.used}
                quota={quotaUsage.bookmarks.quota}
                unlimited={quotaUsage.bookmarks.unlimited}
                formatter={formatNumber}
                description="Total bookmarks saved"
              />

              <QuotaItem
                title="Storage"
                icon={<HardDrive size={16} color={colors.gray[500]} />}
                used={quotaUsage.storage.used}
                quota={quotaUsage.storage.quota}
                unlimited={quotaUsage.storage.unlimited}
                formatter={formatBytes}
                description="Assets and file storage"
              />
            </View>
          ) : null}
        </View>

        <View className="mt-4 w-full rounded-xl bg-card p-4">
          <Text className="text-sm text-muted-foreground">
            To manage your subscription, please use the web app or contact
            support.
          </Text>
        </View>
      </ScrollView>
    </CustomSafeAreaView>
  );
}
