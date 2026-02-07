import MarkdownEditor from "@/components/ui/markdown/markdown-editor";
import { MarkdownReadonly } from "@/components/ui/markdown/markdown-readonly";
import { toast } from "sonner";

import { useUpdateBookmark } from "@karakeep/shared-react/hooks/bookmarks";

export function BookmarkMarkdownComponent({
  children: bookmark,
  readOnly = true,
}: {
  children: {
    id: string;
    content: {
      text: string;
    };
  };
  readOnly?: boolean;
}) {
  const { mutate: updateBookmarkMutator, isPending } = useUpdateBookmark({
    onSuccess: () => {
      toast.success("Note updated!");
    },
    onError: () => {
      toast.error("Something went wrong");
    },
  });

  const onSave = (text: string) => {
    updateBookmarkMutator({
      bookmarkId: bookmark.id,
      text,
    });
  };

  return (
    <div className="h-full">
      {readOnly ? (
        <MarkdownReadonly onSave={onSave}>
          {bookmark.content.text}
        </MarkdownReadonly>
      ) : (
        <MarkdownEditor onSave={onSave} isSaving={isPending}>
          {bookmark.content.text}
        </MarkdownEditor>
      )}
    </div>
  );
}
