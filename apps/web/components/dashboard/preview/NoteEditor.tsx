import MarkdownEditor from "@/components/ui/markdown/markdown-editor";
import { toast } from "@/components/ui/sonner";
import { useClientConfig } from "@/lib/clientConfig";

import type { ZBookmark } from "@karakeep/shared/types/bookmarks";
import { useUpdateBookmark } from "@karakeep/shared-react/hooks/bookmarks";

export function NoteEditor({
  bookmark,
  disabled,
}: {
  bookmark: ZBookmark;
  disabled?: boolean;
}) {
  const demoMode = !!useClientConfig().demoMode;

  const { mutate: updateBookmarkMutator, isPending } = useUpdateBookmark({
    onSuccess: () => {
      toast({
        description: "The bookmark has been updated!",
      });
    },
    onError: () => {
      toast({
        description: "Something went wrong while saving the note",
        variant: "destructive",
      });
    },
  });

  const onSave = (note: string) => {
    if (note === bookmark.note) {
      return;
    }
    updateBookmarkMutator({
      bookmarkId: bookmark.id,
      note,
    });
  };

  if (demoMode || disabled) {
    return (
      <div className="h-44 w-full overflow-auto rounded bg-background p-2 text-sm text-gray-400 opacity-50 dark:text-gray-300">
        {bookmark.note ?? "Write some notes ..."}
      </div>
    );
  }

  return (
    <div className="h-64 w-full overflow-hidden rounded border bg-background">
      <MarkdownEditor onSave={onSave} isSaving={isPending}>
        {bookmark.note ?? ""}
      </MarkdownEditor>
    </div>
  );
}
