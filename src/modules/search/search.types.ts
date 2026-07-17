export interface SearchQuery {
  q: string;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  success: boolean;
  events: unknown[];
  organizations: unknown[];
}

export interface SearchSuggestion {
  id: string;
  title: string;
  type: "event" | "organization";
}