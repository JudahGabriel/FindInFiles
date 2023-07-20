import { LitElement, TemplateResult, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { repeat } from "lit-html/directives/repeat.js";
import { DirectoryService } from "../services/directory-service";
import { homeStyles } from "./app-home.styles";
import { SearchResultMatch } from "../models/search-result-match";
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/badge/badge.js';
import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';
import '@shoelace-style/shoelace/dist/components/tab/tab.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/format-bytes/format-bytes.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import "@shoelace-style/shoelace/dist/components/drawer/drawer";
import SlDrawer from "@shoelace-style/shoelace/dist/components/drawer/drawer";
import { sharedStyles } from "../styles/shared-styles";
import { statusService } from "../services/status-service";

@customElement("app-home")
export class AppHome extends LitElement {

    @state() searchErrors: Error[] = [];
    @state() query = "";
    @state() searchDirectory: FileSystemDirectoryHandle | null = null;
    @state() maxFileSizeInBytes = 5000000;
    @state() fileExtensions: string[] = [];
    @state() status: "searching" | "stopped" | "completed" = "stopped";
    @state() searchResults: SearchResultMatch[] = [];
    @state() previewText = "Fetching...";
    private readonly directoryService = new DirectoryService();

    static styles = [sharedStyles, homeStyles];

    constructor() {
        super();
    }

    render(): TemplateResult {
        return html`
            <div class="home-main d-flex flex-column">
                ${this.renderSearchSection()}
                ${this.renderResultsSection()}
            </div>

            ${this.renderPreviewer()}
        `;
    }

    renderSearchSection(): TemplateResult {
        const directoryLabelClass= this.searchDirectory ? "" : "d-none";
        const canSearch = this.query.length > 0 && !!this.searchDirectory && this.status !== "searching";
        return html`
            <div class="search-settings-container d-flex flex-column">
                <h1><img src="/assets/icons/48x48.png" width="32" height="32" /> FindinFiles</h1>
                <sl-input label="Query" @input="${this.queryUpdated}" placeholder="Type your search term"></sl-input>
                <div class="d-flex flex-column gap-1">
                    Choose directory
                    <sl-button @click="${this.chooseDirectory}">Choose directory...</sl-button>
                    <sl-input class="${directoryLabelClass}" disabled value="${this.searchDirectory?.name || ""}"></sl-input>
                </div>
                <sl-input label="Extensions" help-text="File extensions, separated by comma. Leave blank to search all file types." value="*"></sl-input>
                <sl-input label="Max size (MB)" type="number" min="0" max="100" value="5" style="max-width: 200px;" @input="${(e: InputEvent) => this.maxFileSizeChanged((e.target as HTMLInputElement).value)}" help-text="Max size of files to search"></sl-input>
                <sl-button variant="primary" size="large" @click="${this.search}" ?disabled="${!canSearch}">Search</sl-button>
            </div>
        `;
    }

    renderResultsSection(): TemplateResult {
        return html`
            <sl-tab-group>
                <sl-tab slot="nav" panel="results">
                    Results
                    ${this.renderSearchResultsCount()}
                </sl-tab>
                <sl-tab slot="nav" panel="errors">
                    Errors 
                    ${this.renderErrorCount()}
                </sl-tab>
                
                <sl-tab-panel name="results" class="d-flex gap-1">
                    ${repeat(this.searchResults, r => this.renderSearchResultMatch(r))}
                </sl-tab-panel>
                <sl-tab-panel name="errors">
                    
                </sl-tab-panel>
            </sl-tab-group>
        `;
    }

    renderSearchResultsCount(): TemplateResult {
        const spinnerClass = this.status === "searching" ? "" : "d-none";
        return html`
            (${this.searchResults.length})
            &nbsp;
            <sl-spinner class="${spinnerClass}"></sl-spinner>
        `;
    }

    renderErrorCount(): TemplateResult {
        if (this.searchErrors.length === 0) {
            return html`(0)`;
        }
        return html`(<sl-badge variant="warning">${this.searchErrors.length}</sl-badge>)`;
    }

    renderSearchResultMatch(match: SearchResultMatch): TemplateResult {
        return html`
            <sl-card class="card-header">
                <div slot="header" class="d-flex justify-space-between align-items-center">
                    ${match.file.name}
                    <sl-icon-button name="box-arrow-up-right" label="Open" @click="${() => this.showPreview(match.file)}"></sl-icon-button>
                </div>

                <p>${match.snippet}</p>

                <div slot="footer" class="d-flex flex-column">
                    <sl-format-bytes value="${match.file.size}"></sl-format-bytes>
                    ${match.file.type}
                    <sl-format-date date="${match.file.lastModified}"></sl-format-date>
                </div>
            </sl-card>
        `;
    }

    renderPreviewer(): TemplateResult {
        return html`
            <sl-drawer label="Drawer" class="drawer-overview">
                <pre class="text-preview">${this.previewText}</pre>
                <sl-button class="close-btn" slot="footer" variant="primary" @click="${() => (this.shadowRoot?.querySelector("sl-drawer") as SlDrawer).hide()}">Close</sl-button>
            </sl-drawer>
        `;
    }

    reset() {
        this.searchErrors = [];
        statusService.status = "";
        this.clearSearchResults();
    }

    queryUpdated(e: InputEvent) {
        this.query = (e.target as HTMLInputElement).value;
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
            this.searchDirectory = await (window as any).showDirectoryPicker();
            await this.directoryChosen();
        } catch (error) {
            console.error("Error choosing directory", error);
        }
    }

    async directoryChosen() {
        if (!this.searchDirectory) {
            statusService.status = "No directory chosen. Please choose a directory.";
            return;
        }

        statusService.status = "Enumerating directory, one moment...";
        const contents = await this.directoryService.enumerateFilesAndFolders(this.searchDirectory);
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

        if (this.status === "stopped") {
            statusService.status = `Ready to search ${fileCount} files in ${dirCount} directories`;
        }
    }

    clearSearchResults() {
        this.searchResults = [];
    }

    async search() {
        this.reset();

        const currentQuery = this.query;
        if (!currentQuery) {
            statusService.status = "No search query. Type a query before searching.";
            return;
        }

        if (!this.searchDirectory) {
            statusService.status = "No directory chosen. Please choose a directory.";
            return;
        }

        statusService.status = `Searching for '${this.query}' in files...`;
        this.status = "searching";

        let searchedFileCount = 0;
        const statusTextUpdateHandle = setInterval(() => statusService.status = `Searching for ${currentQuery} in ${searchedFileCount} files - ${this.searchResults.length} matches.`, 250);
        const searchResults = this.directoryService.search(this.searchDirectory, currentQuery, this.fileExtensions, this.maxFileSizeInBytes);
        for await (const searchResult of searchResults) {
            if (searchResult.error) {
                this.searchErrors = this.searchErrors.concat(searchResult.error);
            } if (searchResult.match) {
                this.searchResults = this.searchResults.concat(searchResult.match);
            }

            searchedFileCount = searchResult.searchedFileCount;
        }

        clearTimeout(statusTextUpdateHandle);
        this.status = "completed";
        statusService.status = `Search complete. Found ${this.searchResults.length} matches in ${searchedFileCount} files.`;
    }

    async showPreview(file: File) {
        this.previewText = "Fetching...";
        this.shadowRoot?.querySelector("sl-drawer")?.show();
        this.directoryService.readAllTextAsync(file)
            .then(res => this.previewText = res)
            .catch(error => this.previewText = `Unable to load text. ${error}`);
    }
}