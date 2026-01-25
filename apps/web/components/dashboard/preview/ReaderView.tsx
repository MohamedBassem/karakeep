import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FullPageSpinner } from "@/components/ui/full-page-spinner";
import { toast } from "@/components/ui/sonner";
import { useTranslation } from "@/lib/i18n/client";
import { api } from "@/lib/trpc";
import { AlertTriangle } from "lucide-react";

import {
  useCreateHighlight,
  useDeleteHighlight,
  useUpdateHighlight,
} from "@karakeep/shared-react/hooks/highlights";
import { BookmarkTypes } from "@karakeep/shared/types/bookmarks";

import BookmarkHTMLHighlighter from "./BookmarkHtmlHighlighter";

export default function ReaderView({
  bookmarkId,
  className,
  style,
  readOnly,
}: {
  bookmarkId: string;
  className?: string;
  style?: React.CSSProperties;
  readOnly: boolean;
}) {
  const { t } = useTranslation();
  const { data: highlights } = api.highlights.getForBookmark.useQuery({
    bookmarkId,
  });
  const { data: cachedContent, isPending: isCachedContentLoading } =
    api.bookmarks.getBookmark.useQuery(
      {
        bookmarkId,
        includeContent: true,
      },
      {
        select: (data) =>
          data.content.type == BookmarkTypes.LINK
            ? data.content.htmlContent
            : null,
      },
    );

  const { mutate: createHighlight } = useCreateHighlight({
    onSuccess: () => {
      toast({
        description: "Highlight has been created!",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        description: "Something went wrong",
      });
    },
  });

  const { mutate: updateHighlight } = useUpdateHighlight({
    onSuccess: () => {
      toast({
        description: "Highlight has been updated!",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        description: "Something went wrong",
      });
    },
  });

  const { mutate: deleteHighlight } = useDeleteHighlight({
    onSuccess: () => {
      toast({
        description: "Highlight has been deleted!",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        description: "Something went wrong",
      });
    },
  });

  let content;
  if (isCachedContentLoading) {
    content = <FullPageSpinner />;
  } else if (!cachedContent) {
    content = (
      <div className="flex h-full w-full items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("preview.fetch_error_title")}</AlertTitle>
          <AlertDescription>
            {t("preview.fetch_error_description")}
          </AlertDescription>
        </Alert>
      </div>
    );
  } else {
    content = (
      <BookmarkHTMLHighlighter
        className={className}
        style={style}
        htmlContent={cachedContent || ""}
        highlights={highlights?.highlights ?? []}
        readOnly={readOnly}
        onDeleteHighlight={(h) =>
          deleteHighlight({
            highlightId: h.id,
          })
        }
        onUpdateHighlight={(h) =>
          updateHighlight({
            highlightId: h.id,
            color: h.color,
            note: h.note,
          })
        }
        onHighlight={(h) =>
          createHighlight({
            startOffset: h.startOffset,
            endOffset: h.endOffset,
            color: h.color,
            bookmarkId,
            text: h.text,
            note: h.note ?? null,
          })
        }
      />
    );
  }
  return content;
}
