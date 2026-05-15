export type ActivitySearchParamValue = string | readonly string[] | undefined;
type SearchParamEntry = readonly [string, unknown];
type RawSearchParamEntry = readonly [string, ActivitySearchParamValue];

function appendNonEmptyValue(searchParams: URLSearchParams, key: string, value: unknown) {
  if (typeof value !== 'string') {
    return;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return;
  }

  searchParams.append(key, trimmed);
}

export function buildActivitySearchParams(entries: Iterable<SearchParamEntry>) {
  const searchParams = new URLSearchParams();

  for (const entry of Array.from(entries)) {
    const [key, value] = entry;
    if (Array.isArray(value)) {
      for (const item of value) {
        appendNonEmptyValue(searchParams, key, item);
      }
      continue;
    }

    appendNonEmptyValue(searchParams, key, value);
  }

  return searchParams;
}

export function buildActivityHref(pathname: string, entries: Iterable<SearchParamEntry>) {
  const searchParams = buildActivitySearchParams(entries);
  return searchParams.size > 0 ? `${pathname}?${searchParams.toString()}` : pathname;
}

export function buildRawSearchParams(entries: Iterable<RawSearchParamEntry>) {
  const searchParams = new URLSearchParams();

  for (const entry of Array.from(entries)) {
    const [key, value] = entry;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') {
          searchParams.append(key, item);
        }
      }
      continue;
    }

    if (typeof value === 'string') {
      searchParams.append(key, value);
    }
  }

  return searchParams;
}
