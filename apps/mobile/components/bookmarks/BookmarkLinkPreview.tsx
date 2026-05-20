import { useCallback, useState } from "react";
import {
  Linking,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import ImageView from "react-native-image-viewing";
import WebView from "react-native-webview";
import {
  ShouldStartLoadRequest,
  WebViewSourceUri,
} from "react-native-webview/lib/WebViewTypes";
import * as WebBrowser from "expo-web-browser";
import { Text } from "@/components/ui/Text";
import { useAssetUrl } from "@/lib/hooks";
import { useReaderSettings, WEBVIEW_FONT_FAMILIES } from "@/lib/readerSettings";
import { useColorScheme } from "@/lib/useColorScheme";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, X } from "lucide-react-native";

import {
  useCreateHighlight,
  useDeleteHighlight,
  useUpdateHighlight,
} from "@karakeep/shared-react/hooks/highlights";
import { useReadingProgress } from "@karakeep/shared-react/hooks/reading-progress";
import { useTRPC } from "@karakeep/shared-react/trpc";
import { BookmarkTypes, ZBookmark } from "@karakeep/shared/types/bookmarks";

import FullPageError from "../FullPageError";
import FullPageSpinner from "../ui/FullPageSpinner";
import BookmarkAssetImage from "./BookmarkAssetImage";
import BookmarkHtmlHighlighterDom from "./BookmarkHtmlHighlighterDom";
import { PDFViewer } from "./PDFViewer";

function openUrlExternally(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    void WebBrowser.openBrowserAsync(url);
  } else if (
    url.startsWith("mailto:") ||
    url.startsWith("tel:") ||
    url.startsWith("sms:")
  ) {
    void Linking.openURL(url);
  }
  // Ignore javascript: and other schemes
}

export function BookmarkLinkBrowserPreview({
  bookmark,
}: {
  bookmark: ZBookmark;
}) {
  if (bookmark.content.type !== BookmarkTypes.LINK) {
    throw new Error("Wrong content type rendered");
  }

  const bookmarkUrl = bookmark.content.url;

  const onShouldStartLoadWithRequest = useCallback(
    (request: ShouldStartLoadRequest) => {
      const bookmarkOrigin = new URL(bookmarkUrl).origin;
      if (request.url.startsWith(bookmarkOrigin)) {
        return true;
      }
      openUrlExternally(request.url);
      return false;
    },
    [bookmarkUrl],
  );

  return (
    <WebView
      startInLoadingState={true}
      mediaPlaybackRequiresUserAction={true}
      source={{ uri: bookmarkUrl }}
      setSupportMultipleWindows={false}
      onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
    />
  );
}

export function BookmarkLinkPdfPreview({ bookmark }: { bookmark: ZBookmark }) {
  if (bookmark.content.type !== BookmarkTypes.LINK) {
    throw new Error("Wrong content type rendered");
  }

  const asset = bookmark.assets.find((r) => r.assetType == "pdf");

  const assetSource = useAssetUrl(asset?.id ?? "");

  if (!asset) {
    return <PdfMissing message="Asset has no PDF" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <PDFViewer source={assetSource.uri ?? ""} headers={assetSource.headers} />
    </View>
  );
}

function PdfMissing({ message }: { message: string }) {
  const { colors } = useColorScheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Text>{message}</Text>
    </View>
  );
}

export function BookmarkLinkReaderPreview({
  bookmark,
}: {
  bookmark: ZBookmark;
}) {
  const { isDarkColorScheme: isDark, colors } = useColorScheme();
  const { settings: readerSettings } = useReaderSettings();
  const api = useTRPC();

  const {
    data: bookmarkWithContent,
    error,
    isLoading,
    refetch,
  } = useQuery(
    api.bookmarks.getBookmark.queryOptions({
      bookmarkId: bookmark.id,
      includeContent: true,
    }),
  );

  const { data: highlights } = useQuery(
    api.highlights.getForBookmark.queryOptions({
      bookmarkId: bookmark.id,
    }),
  );

  const { mutate: createHighlight } = useCreateHighlight();
  const { mutate: updateHighlight } = useUpdateHighlight();
  const { mutate: deleteHighlight } = useDeleteHighlight();

  const {
    showBanner,
    bannerPercent,
    onContinue,
    onDismiss,
    restorePosition,
    readingProgressOffset,
    readingProgressAnchor,
    onSavePosition,
    onScrollPositionChange,
  } = useReadingProgress({
    bookmarkId: bookmark.id,
  });

  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const handleLinkPress = useCallback((url: string) => {
    openUrlExternally(url);
  }, []);

  const handleImagePress = useCallback((src: string) => {
    setViewingImage(src);
  }, []);

  if (isLoading) {
    return <FullPageSpinner />;
  }

  if (error) {
    return <FullPageError error={error.message} onRetry={refetch} />;
  }

  if (bookmarkWithContent?.content.type !== BookmarkTypes.LINK) {
    throw new Error("Wrong content type rendered");
  }

  const contentStyle: React.CSSProperties = {
    fontFamily: WEBVIEW_FONT_FAMILIES[readerSettings.fontFamily],
    fontSize: `${readerSettings.fontSize}px`,
    lineHeight: String(readerSettings.lineHeight),
    color: isDark ? "#e5e7eb" : "#374151",
    padding: "16px",
    background: isDark ? "#000000" : "#ffffff",
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ImageView
        visible={!!viewingImage}
        imageIndex={0}
        onRequestClose={() => setViewingImage(null)}
        doubleTapToZoomEnabled={true}
        images={viewingImage ? [{ uri: viewingImage }] : []}
      />
      {showBanner && (
        <View
          style={[
            readerStyles.banner,
            {
              borderBottomColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        >
          <BookOpen size={16} color={colors.mutedForeground} />
          <Text
            style={{
              flex: 1,
              fontSize: 14,
              color: colors.mutedForeground,
            }}
          >
            {bannerPercent && bannerPercent > 0
              ? `Continue where you left off (${bannerPercent}%)`
              : "Continue where you left off"}
          </Text>
          <TouchableOpacity
            onPress={onContinue}
            style={[
              readerStyles.continueButton,
              { backgroundColor: colors.primary },
            ]}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "500",
                color: colors.primaryForeground,
              }}
            >
              Continue
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDismiss} style={{ padding: 4 }}>
            <X size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      )}
      <BookmarkHtmlHighlighterDom
        htmlContent={bookmarkWithContent.content.htmlContent ?? ""}
        contentStyle={contentStyle}
        highlights={highlights?.highlights ?? []}
        readingProgressOffset={readingProgressOffset}
        readingProgressAnchor={readingProgressAnchor}
        restoreReadingPosition={restorePosition}
        onSavePosition={onSavePosition}
        onScrollPositionChange={onScrollPositionChange}
        onLinkPress={handleLinkPress}
        onImagePress={handleImagePress}
        onHighlight={(h) =>
          createHighlight({
            startOffset: h.startOffset,
            endOffset: h.endOffset,
            color: h.color,
            bookmarkId: bookmark.id,
            text: h.text,
            note: h.note ?? null,
          })
        }
        onUpdateHighlight={(h) =>
          updateHighlight({
            highlightId: h.id,
            color: h.color,
            note: h.note,
          })
        }
        onDeleteHighlight={(h) =>
          deleteHighlight({
            highlightId: h.id,
          })
        }
        dom={{ scrollEnabled: true }}
      />
    </View>
  );
}

export function BookmarkLinkArchivePreview({
  bookmark,
}: {
  bookmark: ZBookmark;
}) {
  const asset =
    bookmark.assets.find((r) => r.assetType == "precrawledArchive") ??
    bookmark.assets.find((r) => r.assetType == "fullPageArchive");

  const assetSource = useAssetUrl(asset?.id ?? "");

  const originUri = assetSource.uri;
  const onShouldStartLoadWithRequest = useCallback(
    (request: ShouldStartLoadRequest) => {
      // Allow loading the archive asset itself
      if (
        originUri &&
        (request.url === originUri || request.url.startsWith(originUri))
      ) {
        return true;
      }
      openUrlExternally(request.url);
      return false;
    },
    [originUri],
  );

  if (!asset) {
    return <PdfMissing message="Asset has no offline archive" />;
  }

  const webViewUri: WebViewSourceUri = {
    uri: assetSource.uri!,
    headers: assetSource.headers,
  };

  return (
    <WebView
      startInLoadingState={true}
      mediaPlaybackRequiresUserAction={true}
      source={webViewUri}
      decelerationRate={0.998}
      setSupportMultipleWindows={false}
      onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
    />
  );
}

export function BookmarkLinkScreenshotPreview({
  bookmark,
}: {
  bookmark: ZBookmark;
}) {
  const asset = bookmark.assets.find((r) => r.assetType == "screenshot");

  const assetSource = useAssetUrl(asset?.id ?? "");
  const [imageZoom, setImageZoom] = useState(false);

  if (!asset) {
    return <PdfMissing message="Asset has no screenshot" />;
  }

  return (
    <View style={{ flex: 1, gap: 8 }}>
      <ImageView
        visible={imageZoom}
        imageIndex={0}
        onRequestClose={() => setImageZoom(false)}
        doubleTapToZoomEnabled={true}
        images={[assetSource]}
      />
      <Pressable onPress={() => setImageZoom(true)}>
        <BookmarkAssetImage
          assetId={asset.id}
          style={{ height: "100%", width: "100%" }}
          contentFit="contain"
        />
      </Pressable>
    </View>
  );
}

const readerStyles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  continueButton: {
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
});
