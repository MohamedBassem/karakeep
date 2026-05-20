import { StyleSheet, View } from "react-native";
import { useColorScheme } from "@/lib/useColorScheme";
import { Avatar } from "@/components/ui/Avatar";
import { Text } from "@/components/ui/Text";

interface UserProfileHeaderProps {
  image?: string | null;
  name?: string | null;
  email?: string | null;
}

export function UserProfileHeader({
  image,
  name,
  email,
}: UserProfileHeaderProps) {
  const { colors } = useColorScheme();
  return (
    <View style={styles.container}>
      <Avatar image={image} name={name} size={88} />
      <View style={styles.textGroup}>
        <Text style={styles.name}>{name || "User"}</Text>
        {email && (
          <Text style={[styles.email, { color: colors.mutedForeground }]}>
            {email}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    gap: 8,
    paddingVertical: 24,
  },
  textGroup: {
    alignItems: "center",
    gap: 4,
  },
  name: {
    fontSize: 20,
    fontWeight: "600",
  },
  email: {
    fontSize: 14,
  },
});
