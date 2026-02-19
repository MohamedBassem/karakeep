"use client";

import type translation from "@/lib/i18n/locales/en/translation.json";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { SlidersHorizontal, ToggleLeft, ToggleRight, X } from "lucide-react";

import { parseSearchQuery } from "@karakeep/shared/searchQueryParser";
import type { Matcher } from "@karakeep/shared/types/search";

const SOURCE_VALUES = [
  "api",
  "web",
  "cli",
  "mobile",
  "extension",
  "singlefile",
  "rss",
  "import",
] as const;

const TYPE_VALUES = ["link", "text", "media"] as const;

type FilterType =
  | "is:fav"
  | "is:archived"
  | "is:tagged"
  | "is:inlist"
  | "is:broken"
  | "type"
  | "url"
  | "title"
  | "tag"
  | "list"
  | "after"
  | "before"
  | "feed"
  | "source";

type SearchTranslationKey = `search.${keyof typeof translation.search}`;

interface FilterTypeDefinition {
  value: FilterType;
  labelKey: SearchTranslationKey;
  category: "status" | "content" | "organization" | "date" | "source";
  hasValue: boolean;
  valueType?: "text" | "date" | "select-source" | "select-type";
}

const FILTER_TYPE_DEFINITIONS: FilterTypeDefinition[] = [
  {
    value: "is:fav",
    labelKey: "search.builder_favorited",
    category: "status",
    hasValue: false,
  },
  {
    value: "is:archived",
    labelKey: "search.builder_archived",
    category: "status",
    hasValue: false,
  },
  {
    value: "is:tagged",
    labelKey: "search.builder_has_tags",
    category: "status",
    hasValue: false,
  },
  {
    value: "is:inlist",
    labelKey: "search.builder_in_list",
    category: "status",
    hasValue: false,
  },
  {
    value: "is:broken",
    labelKey: "search.builder_broken_link",
    category: "status",
    hasValue: false,
  },
  {
    value: "type",
    labelKey: "search.builder_type",
    category: "status",
    hasValue: true,
    valueType: "select-type",
  },
  {
    value: "url",
    labelKey: "search.builder_url",
    category: "content",
    hasValue: true,
    valueType: "text",
  },
  {
    value: "title",
    labelKey: "search.builder_title_contains",
    category: "content",
    hasValue: true,
    valueType: "text",
  },
  {
    value: "tag",
    labelKey: "search.builder_tag",
    category: "organization",
    hasValue: true,
    valueType: "text",
  },
  {
    value: "list",
    labelKey: "search.builder_list",
    category: "organization",
    hasValue: true,
    valueType: "text",
  },
  {
    value: "feed",
    labelKey: "search.builder_feed",
    category: "organization",
    hasValue: true,
    valueType: "text",
  },
  {
    value: "after",
    labelKey: "search.builder_after",
    category: "date",
    hasValue: true,
    valueType: "date",
  },
  {
    value: "before",
    labelKey: "search.builder_before",
    category: "date",
    hasValue: true,
    valueType: "date",
  },
  {
    value: "source",
    labelKey: "search.builder_source",
    category: "source",
    hasValue: true,
    valueType: "select-source",
  },
];

interface FilterCondition {
  id: string;
  filterType: FilterType;
  value: string;
  negated: boolean;
}

let nextId = 0;
function generateId() {
  return `filter-${++nextId}`;
}

function formatFilterValue(value: string): string {
  if (/[\s:]/.test(value)) {
    return `"${value}"`;
  }
  return value;
}

function buildQueryString(
  filters: FilterCondition[],
  freeText: string,
): string {
  const parts: string[] = [];

  for (const filter of filters) {
    const neg = filter.negated ? "-" : "";
    const def = FILTER_TYPE_DEFINITIONS.find(
      (d) => d.value === filter.filterType,
    );
    if (!def) continue;

    if (!def.hasValue) {
      parts.push(`${neg}${filter.filterType}`);
    } else if (filter.value.trim()) {
      switch (filter.filterType) {
        case "tag":
          parts.push(`${neg}#${formatFilterValue(filter.value.trim())}`);
          break;
        case "type":
          parts.push(`${neg}is:${filter.value.trim()}`);
          break;
        default:
          parts.push(
            `${neg}${filter.filterType}:${formatFilterValue(filter.value.trim())}`,
          );
          break;
      }
    }
  }

  const text = freeText.trim();
  if (text) {
    parts.push(text);
  }

  return parts.join(" ");
}

function parseMatcherToFilters(matcher: Matcher): FilterCondition[] {
  const filters: FilterCondition[] = [];

  function processMatcher(m: Matcher) {
    switch (m.type) {
      case "favourited":
        filters.push({
          id: generateId(),
          filterType: "is:fav",
          value: "",
          negated: !m.favourited,
        });
        break;
      case "archived":
        filters.push({
          id: generateId(),
          filterType: "is:archived",
          value: "",
          negated: !m.archived,
        });
        break;
      case "tagged":
        filters.push({
          id: generateId(),
          filterType: "is:tagged",
          value: "",
          negated: !m.tagged,
        });
        break;
      case "inlist":
        filters.push({
          id: generateId(),
          filterType: "is:inlist",
          value: "",
          negated: !m.inList,
        });
        break;
      case "brokenLinks":
        filters.push({
          id: generateId(),
          filterType: "is:broken",
          value: "",
          negated: !m.brokenLinks,
        });
        break;
      case "type":
        filters.push({
          id: generateId(),
          filterType: "type",
          value:
            m.typeName === "asset"
              ? "media"
              : (m.typeName as "link" | "text"),
          negated: m.inverse,
        });
        break;
      case "url":
        filters.push({
          id: generateId(),
          filterType: "url",
          value: m.url,
          negated: m.inverse,
        });
        break;
      case "title":
        filters.push({
          id: generateId(),
          filterType: "title",
          value: m.title,
          negated: m.inverse,
        });
        break;
      case "tagName":
        filters.push({
          id: generateId(),
          filterType: "tag",
          value: m.tagName,
          negated: m.inverse,
        });
        break;
      case "listName":
        filters.push({
          id: generateId(),
          filterType: "list",
          value: m.listName,
          negated: m.inverse,
        });
        break;
      case "rssFeedName":
        filters.push({
          id: generateId(),
          filterType: "feed",
          value: m.feedName,
          negated: m.inverse,
        });
        break;
      case "dateAfter":
        filters.push({
          id: generateId(),
          filterType: "after",
          value: m.dateAfter.toISOString().split("T")[0],
          negated: m.inverse,
        });
        break;
      case "dateBefore":
        filters.push({
          id: generateId(),
          filterType: "before",
          value: m.dateBefore.toISOString().split("T")[0],
          negated: m.inverse,
        });
        break;
      case "source":
        filters.push({
          id: generateId(),
          filterType: "source",
          value: m.source,
          negated: m.inverse,
        });
        break;
      case "and":
        m.matchers.forEach(processMatcher);
        break;
      case "or":
        // Can't represent OR in the flat builder, skip
        break;
      case "age":
        // Age uses relative dates which are complex, skip for builder
        break;
    }
  }

  processMatcher(matcher);
  return filters;
}

function FilterValueInput({
  definition,
  value,
  onChange,
}: {
  definition: FilterTypeDefinition;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();

  switch (definition.valueType) {
    case "text":
      return (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("search.builder_enter_value")}
          className="h-8 flex-1"
        />
      );
    case "date":
      return (
        <Input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 flex-1"
        />
      );
    case "select-source":
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="h-8 flex-1">
            <SelectValue placeholder={t("search.builder_select_source")} />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_VALUES.map((src) => (
              <SelectItem key={src} value={src}>
                {src}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "select-type":
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="h-8 flex-1">
            <SelectValue placeholder={t("search.builder_select_type")} />
          </SelectTrigger>
          <SelectContent>
            {TYPE_VALUES.map((type) => (
              <SelectItem key={type} value={type}>
                {t(`common.bookmark_types.${type}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    default:
      return null;
  }
}

function FilterRow({
  filter,
  onUpdate,
  onRemove,
}: {
  filter: FilterCondition;
  onUpdate: (id: string, updates: Partial<FilterCondition>) => void;
  onRemove: (id: string) => void;
}) {
  const { t } = useTranslation();
  const definition = FILTER_TYPE_DEFINITIONS.find(
    (d) => d.value === filter.filterType,
  );

  return (
    <div className="flex items-center gap-1.5">
      <Select
        value={filter.filterType}
        onValueChange={(v) =>
          onUpdate(filter.id, { filterType: v as FilterType, value: "" })
        }
      >
        <SelectTrigger className="h-8 w-[140px] shrink-0 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>{t("search.builder_category_status")}</SelectLabel>
            {FILTER_TYPE_DEFINITIONS.filter((d) => d.category === "status").map(
              (d) => (
                <SelectItem key={d.value} value={d.value}>
                  {t(d.labelKey)}
                </SelectItem>
              ),
            )}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>{t("search.builder_category_content")}</SelectLabel>
            {FILTER_TYPE_DEFINITIONS.filter(
              (d) => d.category === "content",
            ).map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {t(d.labelKey)}
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>
              {t("search.builder_category_organization")}
            </SelectLabel>
            {FILTER_TYPE_DEFINITIONS.filter(
              (d) => d.category === "organization",
            ).map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {t(d.labelKey)}
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>{t("search.builder_category_date")}</SelectLabel>
            {FILTER_TYPE_DEFINITIONS.filter((d) => d.category === "date").map(
              (d) => (
                <SelectItem key={d.value} value={d.value}>
                  {t(d.labelKey)}
                </SelectItem>
              ),
            )}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>{t("search.builder_category_source")}</SelectLabel>
            {FILTER_TYPE_DEFINITIONS.filter(
              (d) => d.category === "source",
            ).map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {t(d.labelKey)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {definition?.hasValue && (
        <FilterValueInput
          definition={definition}
          value={filter.value}
          onChange={(v) => onUpdate(filter.id, { value: v })}
        />
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 shrink-0 px-2",
          filter.negated && "text-destructive",
        )}
        onClick={() => onUpdate(filter.id, { negated: !filter.negated })}
        title={
          filter.negated
            ? t("search.builder_negated")
            : t("search.builder_not_negated")
        }
      >
        {filter.negated ? (
          <ToggleRight className="size-4" />
        ) : (
          <ToggleLeft className="size-4" />
        )}
        <span className="ml-1 text-xs">
          {filter.negated
            ? t("search.builder_not")
            : t("search.builder_match")}
        </span>
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 shrink-0 px-1.5"
        onClick={() => onRemove(filter.id)}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}

export function SearchQueryBuilder({
  currentQuery,
  onApply,
}: {
  currentQuery: string;
  onApply: (query: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [freeText, setFreeText] = useState("");
  const [initialized, setInitialized] = useState(false);

  const initFromQuery = useCallback(
    (query: string) => {
      if (initialized) return;
      setInitialized(true);

      if (!query.trim()) return;

      const parsed = parseSearchQuery(query);
      if (parsed.result === "invalid") return;

      if (parsed.text) {
        setFreeText(parsed.text);
      }

      if (parsed.matcher) {
        const parsedFilters = parseMatcherToFilters(parsed.matcher);
        if (parsedFilters.length > 0) {
          setFilters(parsedFilters);
        }
      }
    },
    [initialized],
  );

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen && !initialized) {
        initFromQuery(currentQuery);
      }
      setOpen(isOpen);
    },
    [currentQuery, initialized, initFromQuery],
  );

  const addFilter = useCallback(() => {
    setFilters((prev) => [
      ...prev,
      {
        id: generateId(),
        filterType: "is:fav",
        value: "",
        negated: false,
      },
    ]);
  }, []);

  const updateFilter = useCallback(
    (id: string, updates: Partial<FilterCondition>) => {
      setFilters((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...updates } : f)),
      );
    },
    [],
  );

  const removeFilter = useCallback((id: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleApply = useCallback(() => {
    const query = buildQueryString(filters, freeText);
    onApply(query);
    setOpen(false);
  }, [filters, freeText, onApply]);

  const handleClear = useCallback(() => {
    setFilters([]);
    setFreeText("");
  }, []);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5"
          title={t("search.builder_title")}
        >
          <SlidersHorizontal className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[480px] p-4"
        align="end"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="space-y-3">
          <div className="text-sm font-medium">
            {t("search.builder_title")}
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">
              {t("search.builder_text_search")}
            </label>
            <Input
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder={t("search.builder_text_placeholder")}
              className="h-8"
            />
          </div>

          {filters.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">
                {t("search.builder_filters")}
              </label>
              <div className="space-y-1.5">
                {filters.map((filter) => (
                  <FilterRow
                    key={filter.id}
                    filter={filter}
                    onUpdate={updateFilter}
                    onRemove={removeFilter}
                  />
                ))}
              </div>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addFilter}
            className="h-8 w-full text-xs"
          >
            {t("search.builder_add_filter")}
          </Button>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="h-8 flex-1"
            >
              {t("search.builder_clear")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              className="h-8 flex-1"
            >
              {t("search.builder_apply")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
