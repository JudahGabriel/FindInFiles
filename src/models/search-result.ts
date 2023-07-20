import { SearchResultMatch } from "./search-result-match";

export interface SearchResult {
    searchedFileName: string;
    match: SearchResultMatch | null;
    error: Error | null;
    searchedFileCount: number;
}