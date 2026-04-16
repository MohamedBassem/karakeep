/**
 * MIME type used in HTML5 drag-and-drop dataTransfer to identify
 * bookmark-list drags (used for reordering lists in the sidebar).
 */
export const LIST_DRAG_MIME = "application/x-karakeep-list";

export interface ListDragPayload {
  id: string;
  parentId: string | null;
}

export function encodeListDragPayload(payload: ListDragPayload): string {
  return JSON.stringify(payload);
}

export function decodeListDragPayload(
  value: string | undefined | null,
): ListDragPayload | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "id" in parsed &&
      typeof (parsed as ListDragPayload).id === "string"
    ) {
      const id = (parsed as ListDragPayload).id;
      const parentId = (parsed as ListDragPayload).parentId ?? null;
      return { id, parentId };
    }
  } catch {
    // Fall through.
  }
  return null;
}
