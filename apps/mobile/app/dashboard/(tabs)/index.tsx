import { Pressable, View } from "react-native";
import { router } from "expo-router";
import UpdatingBookmarkList from "@/components/bookmarks/UpdatingBookmarkList";
import { TailwindResolver } from "@/components/TailwindResolver";
import CustomSafeAreaView from "@/components/ui/CustomSafeAreaView";
import FloatingActionButton from "@/components/ui/FloatingActionButton";
import PageTitle from "@/components/ui/PageTitle";
import { Text } from "@/components/ui/Text";
import { Search } from "lucide-react-native";

export default function Home() {
  return (
    <CustomSafeAreaView>
      <UpdatingBookmarkList
        query={{ archived: false }}
        header={
          <View className="flex flex-col gap-1">
            <PageTitle title="Home" className="pb-2" />
            <Pressable
              className="flex flex-row items-center gap-1 rounded-lg border border-input bg-card px-4 py-1"
              onPress={() => router.push("/dashboard/search")}
            >
              <TailwindResolver
                className="text-muted"
                comp={(styles) => (
                  <Search size={16} color={styles?.color?.toString()} />
                )}
              />
              <Text className="text-muted">Search</Text>
            </Pressable>
          </View>
        }
      />
      <FloatingActionButton />
    </CustomSafeAreaView>
  );
}
