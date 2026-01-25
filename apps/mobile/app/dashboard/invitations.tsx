import { useState } from "react";
import { Alert, FlatList, Pressable, View } from "react-native";
import { Stack, router } from "expo-router";
import { Button } from "@/components/ui/Button";
import CustomSafeAreaView from "@/components/ui/CustomSafeAreaView";
import FullPageError from "@/components/FullPageError";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Text } from "@/components/ui/Text";
import Toast from "@/components/ui/Toast";
import { api } from "@/lib/trpc";
import { useColorScheme } from "@/lib/useColorScheme";
import { Check, X } from "lucide-react-native";

interface Invitation {
  id: string;
  listId: string;
  role: "viewer" | "editor";
  invitedAt: Date;
  list: {
    id: string;
    name: string;
    icon: string;
    description: string | null;
    owner: {
      id: string;
      name: string;
      email: string;
    } | null;
  };
}

function InvitationCard({ invitation }: { invitation: Invitation }) {
  const { colors } = useColorScheme();
  const apiUtils = api.useUtils();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);

  const acceptInvitation = api.lists.acceptInvitation.useMutation({
    onSuccess: async () => {
      Toast.show({
        type: "success",
        text1: "Invitation accepted",
        text2: `You can now access ${invitation.list.name}`,
      });
      await Promise.all([
        apiUtils.lists.getPendingInvitations.invalidate(),
        apiUtils.lists.list.invalidate(),
      ]);
      setAcceptingId(null);
    },
    onError: (error) => {
      Toast.show({
        type: "error",
        text1: "Failed to accept invitation",
        text2: error.message || "Please try again",
      });
      setAcceptingId(null);
    },
  });

  const declineInvitation = api.lists.declineInvitation.useMutation({
    onSuccess: async () => {
      Toast.show({
        type: "success",
        text1: "Invitation declined",
      });
      await apiUtils.lists.getPendingInvitations.invalidate();
      setDecliningId(null);
    },
    onError: (error) => {
      Toast.show({
        type: "error",
        text1: "Failed to decline invitation",
        text2: error.message || "Please try again",
      });
      setDecliningId(null);
    },
  });

  const handleAccept = () => {
    setAcceptingId(invitation.id);
    acceptInvitation.mutate({ invitationId: invitation.id });
  };

  const handleDecline = () => {
    Alert.alert(
      "Decline Invitation",
      `Are you sure you want to decline the invitation to "${invitation.list.name}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Decline",
          style: "destructive",
          onPress: () => {
            setDecliningId(invitation.id);
            declineInvitation.mutate({ invitationId: invitation.id });
          },
        },
      ],
    );
  };

  const isAccepting = acceptingId === invitation.id;
  const isDeclining = decliningId === invitation.id;
  const isLoading = isAccepting || isDeclining;

  return (
    <View className="mx-4 mb-4 rounded-xl border border-input bg-card p-4">
      {/* List info */}
      <View className="mb-3">
        <View className="mb-1 flex-row items-center gap-2">
          <Text variant="heading" className="flex-1">
            {invitation.list.icon} {invitation.list.name}
          </Text>
        </View>
        {invitation.list.description && (
          <Text variant="subhead" color="secondary" className="mb-2">
            {invitation.list.description}
          </Text>
        )}
        <View className="flex-row items-center gap-1">
          <Text variant="footnote" color="tertiary">
            Invited by{" "}
          </Text>
          <Text variant="footnote" color="secondary" className="font-medium">
            {invitation.list.owner?.name || "Unknown"}
          </Text>
          <Text variant="footnote" color="tertiary">
            {" "}
            •{" "}
          </Text>
          <Text variant="footnote" color="tertiary" className="capitalize">
            {invitation.role}
          </Text>
        </View>
      </View>

      {/* Action buttons */}
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button
            variant="secondary"
            size="md"
            onPress={handleDecline}
            disabled={isLoading}
          >
            {isDeclining ? (
              <Text>Declining...</Text>
            ) : (
              <>
                <X size={16} color={colors.foreground} />
                <Text>Decline</Text>
              </>
            )}
          </Button>
        </View>
        <View className="flex-1">
          <Button
            variant="primary"
            size="md"
            onPress={handleAccept}
            disabled={isLoading}
          >
            {isAccepting ? (
              <Text>Accepting...</Text>
            ) : (
              <>
                <Check size={16} color="white" />
                <Text>Accept</Text>
              </>
            )}
          </Button>
        </View>
      </View>
    </View>
  );
}

export default function Invitations() {
  const [refreshing, setRefreshing] = useState(false);
  const {
    data: invitations,
    isPending,
    error,
    refetch,
  } = api.lists.getPendingInvitations.useQuery();
  const apiUtils = api.useUtils();

  if (error) {
    return <FullPageError error={error.message} onRetry={() => refetch()} />;
  }

  if (isPending) {
    return <FullPageSpinner />;
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await apiUtils.lists.getPendingInvitations.invalidate();
    setRefreshing(false);
  };

  return (
    <CustomSafeAreaView>
      <Stack.Screen
        options={{
          title: "Pending Invitations",
          headerShown: true,
        }}
      />
      <FlatList
        className="h-full"
        contentContainerClassName="py-4"
        data={invitations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <InvitationCard invitation={item} />}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center p-8">
            <Text
              variant="heading"
              color="secondary"
              className="mb-2 text-center"
            >
              No pending invitations
            </Text>
            <Text variant="subhead" color="tertiary" className="text-center">
              You don't have any pending list invitations at the moment.
            </Text>
          </View>
        }
      />
    </CustomSafeAreaView>
  );
}
