import { format } from "date-fns";

export function normalizeI18nLanguage(language: string | undefined) {
  if (!language) {
    return undefined;
  }

  if (language === "zhtw") {
    return "zh-TW";
  }

  return language.replace("_", "-");
}

export function formatLocalDate(
  date: Date,
  formatStr: string,
  language?: string,
) {
  const locale = normalizeI18nLanguage(language);

  if (formatStr === "PP, p") {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }

  if (formatStr === "PPP") {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "long",
    }).format(date);
  }

  return format(date, formatStr);
}
