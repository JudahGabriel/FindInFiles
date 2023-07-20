import { SearchResult } from "../models/search-result";

/**
 * Service that provides access to files and folders.
 */
export class DirectoryService {
    // Generator that returns all the files from the chosen directory and its subdirectories.
    async * enumerateFiles(dir: FileSystemDirectoryHandle): AsyncGenerator<FileSystemFileHandle> {
        const iterator = this.enumerateFilesAndFolders(dir);
        let entry = await iterator.next();
        while (entry && !entry.done) {
            if (entry.value.kind === "file") {
                yield entry.value;
            }

            entry = await iterator.next();
        }
    }

    // Generator function that returns all the files and folders recursively from the chosen directory.
    async * enumerateFilesAndFolders(dir: FileSystemDirectoryHandle): AsyncGenerator<FileSystemDirectoryHandle | FileSystemFileHandle> {
        const directoriesToSearch = [dir];
        while (directoriesToSearch.length > 0) {
            const dir = directoriesToSearch.pop()!;
            yield dir;

            // Go through all the contents of this directory
            const dirContents = (dir as any).entries() as AsyncIterableIterator<[string, FileSystemDirectoryHandle | FileSystemFileHandle]>;
            let entry = await dirContents.next();
            while (!entry.done) {
                const entryHandle = entry.value[1];
                if (entryHandle.kind === "directory") {
                    directoriesToSearch.push(entryHandle);
                } else {
                    yield entryHandle;
                }

                entry = await dirContents.next();
            }
        }
    }

    async * search(dir: FileSystemDirectoryHandle, query: string, extensions: string[], maxFileSizeInBytes: number): AsyncGenerator<SearchResult> {
        if (query.length === 0) {
            return;
        }

        const enumerator = this.enumerateFiles(dir);
        let fileEntry = await enumerator.next();
        let searchedFileCount = 1;
        const progressIndicator: SearchResult = {
            match: null,
            error: null,
            searchedFileCount: 0,
            searchedFileName: ""
        };
        while (!!fileEntry && !fileEntry.done) {
            let fileEntryValue: FileSystemFileHandle | null = null;
            try {
                fileEntryValue = fileEntry.value;
                const file = await fileEntryValue.getFile();
                const fileNameLower = file.name.toLocaleLowerCase();

                // See if the file fits our criteria.
                const matchesExtensions =
                    extensions.length === 0 ||
                    extensions.some(e => e === "*" || fileNameLower.endsWith(e.toLowerCase()));
                const isAcceptableSize = file.size <= maxFileSizeInBytes;

                // Yield it back.
                if (matchesExtensions && isAcceptableSize) {
                    const fileContents = await this.readAllTextAsync(file);
                    const indexOfSearchTerm = (fileContents || "").indexOf(query);
                    if (fileContents && indexOfSearchTerm !== -1) {
                        const searchResult: SearchResult = {
                            match: {
                                file: file,
                                snippet: this.getSearchResultSnippet(query, fileContents, indexOfSearchTerm),
                                matchIndex: indexOfSearchTerm,
                                query: query
                            },
                            error: null,
                            searchedFileCount: searchedFileCount,
                            searchedFileName: fileEntryValue.name
                        };
                        yield searchResult;
                    } else {
                        // No match. Yield back the progress.
                        progressIndicator.searchedFileCount = searchedFileCount;
                        progressIndicator.searchedFileName = fileEntryValue.name;
                        yield progressIndicator;
                    }
                }
            } catch (error) {
                let errorObj: Error;
                if (error instanceof Error) {
                    error.message += ` Additional contenxt: fileName: ${fileEntryValue?.name}`;
                    errorObj = error;
                } else {
                    errorObj = new Error(`Error reading file ${fileEntryValue?.name || ' - enumeration error '} - ${error}`);
                }

                const errorResult: SearchResult = {
                    error: errorObj,
                    match: null,
                    searchedFileCount: searchedFileCount,
                    searchedFileName: fileEntryValue?.name || ''
                };
                yield errorResult;
            } finally {
                searchedFileCount++;
            }

            fileEntry = await enumerator.next();
        }
    }

    async readAllTextAsync(file: File): Promise<string> {
        // loadstart progress load abort error loadend
        return new Promise((resolve, reject) => {
            const fileReader = new FileReader();
            fileReader.onload = () => resolve(fileReader.result as string);
            fileReader.onerror = () => reject(fileReader.error);
            fileReader.onabort = () => reject(fileReader.error);
            // onloadend fires whether error or success. When it fires, unhook us.
            fileReader.onloadend = () => {
                fileReader.onload = null;
                fileReader.onerror = null;
                fileReader.onabort = null;
                fileReader.onloadend = null;
            };

            fileReader.readAsText(file);
        });
    }

    private getSearchResultSnippet(query: string, fileContents: string, indexOfSearchTerm: number) {
        const charPadding = 20;
        const start = Math.max(0, indexOfSearchTerm - charPadding);
        const end = Math.min(fileContents.length - 1, indexOfSearchTerm + query.length + charPadding);
        const startEllipsis = start === 0 ? "" : "...";
        const endEllipsis = end === fileContents.length - 1 ? "" : "...";
        return startEllipsis + fileContents.substring(start, end) + endEllipsis;
    }
}