  // Shared types + helpers for the Discover page.
  
  export type Producer = {
    id: string;
    username: string | null;
    display_name: string | null;
  };
  
  export type DiscoverBeat = {
    id: string;
    title: string | null;
    bpm: number | null;
    key: string | null;
    genre: string | null;
    moods: string[] | null;
    semantic_tags: string[] | null;
    preview_url: string | null;
    cover_url: string | null;
    producer_id: string | null;
    producer_username: string | null;
    producer_display_name: string | null;
    starting_price: number | null;
    currency: string | null;
    play_count: number;
    total_count: number;
    analysis_status: "completed" | "skipped";
  };
  
  export type Facets = {
    genres: string[];
    keys: string[];
    tags: string[];
    producers: Producer[];
  };
  
  export type Filters = {
    q: string;
    genre: string;
    key: string;
    producer: string;
    bpmMin: string;
    bpmMax: string;
    priceMin: string;
    priceMax: string;
    sort: string;
    moods: string[];
    tags: string;
  };
  
  export const DEFAULT_FILTERS: Filters = {
    q: "",
    genre: "",
    key: "",
    producer: "",
    bpmMin: "",
    bpmMax: "",
    priceMin: "",
    priceMax: "",
    sort: "newest",
    moods: [],
    tags: "",
  };
  
  export const EMPTY_FACETS: Facets = {
    genres: [],
    keys: [],
    tags: [],
    producers: [],
  };
  
  export const PAGE_SIZE = 24;
  
  export function parseFiltersFromUrl(): Filters {
    if (typeof window === "undefined") {
      return DEFAULT_FILTERS;
    }
  
    const params = new URLSearchParams(window.location.search);
    const moods = params.get("moods");
  
    return {
      q: params.get("q") ?? "",
      genre: params.get("genre") ?? "",
      key: params.get("key") ?? "",
      producer: params.get("producer") ?? "",
      bpmMin: params.get("bpmMin") ?? "",
      bpmMax: params.get("bpmMax") ?? "",
      priceMin: params.get("priceMin") ?? "",
      priceMax: params.get("priceMax") ?? "",
      sort: params.get("sort") ?? "newest",
      moods: moods ? moods.split(",").filter(Boolean) : [],
      tags: params.get("tags") ?? "",
    };
  }
  
  export function buildQueryString(filters: Filters, offset = 0) {
    const params = new URLSearchParams();
  
    if (filters.q.trim()) params.set("q", filters.q.trim());
    if (filters.genre) params.set("genre", filters.genre);
    if (filters.key) params.set("key", filters.key);
    if (filters.producer) params.set("producer", filters.producer);
    if (filters.bpmMin) params.set("bpmMin", filters.bpmMin);
    if (filters.bpmMax) params.set("bpmMax", filters.bpmMax);
    if (filters.priceMin) params.set("priceMin", filters.priceMin);
    if (filters.priceMax) params.set("priceMax", filters.priceMax);
  
    if (filters.moods.length > 0) {
      params.set("moods", filters.moods.join(","));
    }
  
    if (filters.tags.trim()) {
      params.set(
        "tags",
        filters.tags
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
          .join(","),
      );
    }
  
    params.set("sort", filters.sort);
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(offset));
  
    return params.toString();
  }
  
  export function formatPrice(price: number | null, currency: string | null) {
    if (price === null || price === undefined) {
      return "Price unavailable";
    }
  
    const symbol =
      currency === "USD" ? "$" : currency ? `${currency} ` : "$";
  
    return `From ${symbol}${Number(price).toFixed(2)}`;
  }