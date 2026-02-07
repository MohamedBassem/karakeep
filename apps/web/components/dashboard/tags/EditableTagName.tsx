"use client";

import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { useUpdateTag } from "@karakeep/shared-react/hooks/tags";

import { EditableText } from "../EditableText";

export default function EditableTagName({
  tag,
  className,
}: {
  tag: { id: string; name: string };
  className?: string;
}) {
  const router = useRouter();
  const currentPath = usePathname();
  const { mutate: updateTag, isPending } = useUpdateTag({
    onSuccess: () => {
      toast.success("Tag updated!");
      if (currentPath.includes(tag.id)) {
        router.refresh();
      }
    },
  });
  return (
    <EditableText
      viewClassName={className}
      editClassName={cn("p-2", className)}
      originalText={tag.name}
      onSave={(newName) => {
        if (!newName || newName == "") {
          toast.error("You must set a name for the tag!");
          return;
        }
        updateTag(
          {
            tagId: tag.id,
            name: newName,
          },
          {
            onError: (e) => {
              toast.error(e.message);
            },
          },
        );
      }}
      isSaving={isPending}
    />
  );
}
