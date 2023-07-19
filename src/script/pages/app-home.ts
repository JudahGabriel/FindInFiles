import { css, html, CSSResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';

// For more info on the @pwabuilder/pwainstall component click here https://github.com/pwa-builder/pwa-install
import '@pwabuilder/pwainstall';
import { BootstrapBase } from '../common/bootstrap-base';

@customElement('app-home')
export class AppHome extends BootstrapBase {

  @state() fileReadErrors: string[] = [];
  @state() canSearch = false;
  @state() searchResults = [];
  @state() query = "";
  @state() chosenDir: FileSystemDirectoryHandle | null = null;
  @state() maxFileSizeInBytes = 5000000;
  @state() fileExtensions: string[] = [];
  @state() isSearching = false;
  @state() status = "";
  @state() fileMatches = [];

  static get styles() {
    const localStyles = css``;
    return [
      super.styles as CSSResult,
      localStyles
    ];
  }

  constructor() {
    super();
  }

  firstUpdated() {
  }

  render() {
    return html`
      <div class="content" role="main">
        <h1 class="display-1">Find In Files</h1>
        <h3>
          A utility for finding text content in your files
        </h3>
      
        <div class="card">
      
          <div class="card-body">
            <ol>
      
              <li>
                <button type="button" class="btn btn-secondary" @click="${this.chooseDirectory}">Choose a directory</button>
                <p class="text-muted">
                  <small>We'll search this directory and all its subdirectories recursively</small>
                </p>
              </li>
      
              <li>
                <p>
                  What string are you looking for? <input id="searchInput" class="form-control" type="text"
                    placeholder="Type your search term" @input="${this.queryUpdated}">
                </p>
              </li>
      
              <li>
                <p>
                  Optionally narrow your search:
                </p>
                <div class="input-group mb-3">
                  <span class="input-group-text">Max file size</span>
                  <input id="maxSizeInput" type="number" min="0" max="100000" value="5" class="form-control"
                    aria-label="Megabytes" style="max-width: 100px;"
                    @input="${(e: InputEvent) => this.maxFileSizeChanged((e.target as HTMLInputElement).value)}">
                  <span class="input-group-text">MB</span>
                </div>
                <div>
                  <div class="input-group mb-3">
                    <span class="input-group-text">Extensions</span>
                    <input id="fileExtensionsInput" placeholder=".txt, .js, .ts" class="form-control"
                      style="max-width: 100px;" value="*"
                      @input="${(e: InputEvent) => this.fileExtensionsChanged((e.target as HTMLInputElement)?.value || '')}" />
                  </div>
                  <p class="form-text">
                    Use * to search all files, or use comma-separated extension list, e.g. ".txt, .js, .ts"
                  </p>
                </div>
      
              </li>
      
              <li>
                <button type="submit" class="btn btn-primary" ?disabled="${this.canSearch}"
                  @input="${this.search}">Search</button>
              </li>
      
            </ol>
            <div class="card-footer text-muted">
              <div id="statusLabelSpinner" class="spinner-border" role="status" style="display: none;">
                <span class="visually-hidden">Loading...</span>
              </div>
              <p id="statusLabel"></p>
            </div>
      
      
          </div>
        </div>
      
        <!-- Where we show search results -->
        <div id="search-results" class="accordion">
        </div>
      
      
      </div>
    `;
  }

  reset() {
    this.fileReadErrors = [];
    this.searchResults = [];
    this.status = "";
    this.clearSearchResults();
  }

  queryUpdated(text: string) {
    this.query = text;
    this.updateSearchEnabled();
  }

  updateSearchEnabled() {
    this.canSearch = !!this.query && !!this.chosenDir && !this.isSearching;
  }

  fileExtensionsChanged(extensions: string) {
    if (extensions === "*" || extensions === "") {
      this.fileExtensions = [];
    } else {
      this.fileExtensions = extensions.split(',')
        .map(e => e.trim())
        .filter(e => e.length > 0);
    }
  }

  maxFileSizeChanged(size: string) {
    const sizeVal = parseFloat(size);
    this.maxFileSizeInBytes = sizeVal * 1000000;
  }

  async chooseDirectory() {
    this.reset();
    try {
      this.chosenDir = await (window as any).showDirectoryPicker();
      this.updateSearchEnabled();
      await this.directoryChosen();
    } catch (error) {
      console.error("Error choosing directory", error);
    }
  }

  async directoryChosen() {
    this.status = "Enumerating directory, one moment...";
    const contents = await this.enumerateDirContents();
    let entry = await contents.next();
    let dirCount = 0;
    let fileCount = 0;
    while (entry && !entry.done) {
      if (entry.value.kind === "directory") {
        dirCount++;
      } else {
        fileCount++;
      }

      entry = await contents.next();
    }

    this.status = `Ready to search ${fileCount} files in ${dirCount} directories`;
  }

  clearSearchResults() {
    this.searchResults = [];
  }

  // Generator function that returns all the files and folders recursively from the chosen directory.
  async * enumerateDirContents() {
    if (!this.chosenDir) {
      this.status = "No directory chosen. Please choose a directory.";
      return;
    }

    const directoriesToSearch = [this.chosenDir];
    while (directoriesToSearch.length > 0) {
      const dir = directoriesToSearch.pop()!;
      yield dir;

      // Go through all the contents of this directory
      const dirContents = dir.entries();
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

  // Generator that returns all the files from the chosen directory and its subdirectories.
  async * enumerateFiles() {
    const contents = await this.enumerateDirContents();
    let entry = await contents.next();
    while (entry && !entry.done) {
      if (entry.value.kind === "file") {
        yield entry;
      }

      entry = await contents.next();
    }
  }

  async search() {
    this.reset();

    if (this.query) {
      this.status = "No search query. Type a query before searching.";
      return;
    }

    this.status = `Searching for '${this.query}' in files...`;
    this.isSearching = true;
    this.updateSearchEnabled();

    let searchedFileCount = 0;
    const files = await this.enumerateFiles();
    let fileEntry = await files.next();
    let statusTextUpdateHandle = setInterval(() => this.status = `Searching... ${this.fileMatches.length} matches in ${searchedFileCount} searched files.`, 250);
    while (!!fileEntry && !fileEntry.done) {
      try {
        const fileEntryValue = fileEntry.value;
        const file = await (fileEntryValue.value as any).getFile();
        const matchesExtensions = this.fileNameMatchesExtensions(file.name);
        const isAcceptableSize = file.size <= this.maxFileSizeInBytes;
        if (matchesExtensions && isAcceptableSize) {
          const fileContents = await this.readAllTextAsync(file);
          const indexOfSearchTerm = fileContents.indexOf(this.query);
          if (fileContents && indexOfSearchTerm !== -1) {
            const match = { file: file, snippet: this.getSearchResultSnippet(fileContents, indexOfSearchTerm), index: indexOfSearchTerm };
            this.showMatch(match);
          }
        }
      } catch (error) {
        this.fileReadErrors.push(error);
      } finally {
        searchedFileCount++;
      }

      fileEntry = await files.next();
    }

    clearTimeout(statusTextUpdateHandle);
    this.setStatus(`Found ${this.fileMatches.length} matches in ${searchedFileCount} searched files.`);
    console.log("matches: ", this.fileMatches);
    console.log("errors:", this.fileReadErrors);
    this.isSearching = false;
    this.updateSearchEnabled();
  }

  showMatch(searchResult) {
    this.fileMatches.push(searchResult);

    // Clone the search result template
    const searchResultNode = this.searchResultTemplate.content.cloneNode(true);
    this.populateSearchResultNode(searchResult);

  }

  populateSearchResultNode(node, searchResult) {

  }

  async readAllTextAsync(file: File): Promise<string> {
    // loadstart progress load abort error loadend
    return new Promise((resolve, reject) => {

      if (file.size > this.maxFileSizeInBytes) {
        reject(`File ${file.name} is too large, weighing in at ${file.size}. Max size allowed is ${this.maxFileSizeInBytes}`);
      }

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

  getSearchResultSnippet(fileContents, indexOfSearchTerm) {
    const charPadding = 10;
    const start = Math.max(0, indexOfSearchTerm - charPadding);
    const end = Math.min(fileContents.length - 1, indexOfSearchTerm + this.query.length + charPadding);
    const startEllipsis = start === 0 ? "" : "...";
    const endEllipsis = end === fileContents.length - 1 ? "" : "...";
    return startEllipsis + fileContents.substring(start, end) + endEllipsis;
  }

  fileNameMatchesExtensions(fileName) {
    if (this.fileExtensions.length === 0) {
      return true;
    }

    return this.fileExtensions.some(ext => fileName.endsWith(ext));
  }
}
