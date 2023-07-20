export interface SearchResultMatch {
    file: File;

    /**
     * A snippet of text containing the query match and some surrounding text.
     */
    snippet: string;

    /**
     * The index of where the query match was found in the text of the file.
     */
    matchIndex: number;

    /**
     * The query that was used to find this match.
     */
    query: string;
}