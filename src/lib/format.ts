export function formatDate(iso: string, lang: "zh" | "en"): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function categoryPath(category: "blog" | "tech"): string {
  return category === "blog" ? "/blog" : "/tech";
}