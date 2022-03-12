import { css, html, CSSResult } from 'lit';
import { property, customElement } from 'lit/decorators.js';

// For more info on the @pwabuilder/pwainstall component click here https://github.com/pwa-builder/pwa-install
import '@pwabuilder/pwainstall';
import { BootstrapBase } from '../common/bootstrap-base';

@customElement('app-home')
export class AppHome extends BootstrapBase {
  // For more information on using properties and state in lit
  // check out this link https://lit.dev/docs/components/properties/
  @property() message = 'Welcome!';

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

  async firstUpdated() {
    // this method is a lifecycle even in lit
    // for more info check out the lit docs https://lit.dev/docs/components/lifecycle/
    console.log('This is your home page');
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
                <fast-button appearance="primary">Submit</fast-button>
                <button type="button" id="chooseDirectoryBtn" class="btn btn-secondary">Choose a directory</button>
                <p class="text-muted">
                  <small>We'll search this directory and all its subdirectories recursively</small>
                </p>
              </li>

              <li>
                <p>
                  What string are you looking for? <input id="searchInput" class="form-control" type="text" placeholder="Type your search term">
                </p>
              </li>

              <li>
                <p>
                  Optionally narrow your search:
                </p>
                <div class="input-group mb-3">
                  <span class="input-group-text">Max file size</span>
                  <input id="maxSizeInput" type="number" min="0" max="100000" value="5" class="form-control" aria-label="Megabytes" style="max-width: 100px;">
                  <span class="input-group-text">MB</span>
                </div>
                <div>
                  <div class="input-group mb-3">
                    <span class="input-group-text">Extensions</span>
                    <input id="fileExtensionsInput" placeholder=".txt, .js, .ts" class="form-control" style="max-width: 100px;" value="*" />
                  </div>
                  <p class="form-text">
                    Use * to search all files, or use comma-separated extension list, e.g. ".txt, .js, .ts"
                  </p>
                </div>

              </li>

              <li>
                <button id="searchBtn" type="submit" class="btn btn-primary" disabled>Search</button>
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
}
