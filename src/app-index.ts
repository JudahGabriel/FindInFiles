import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import './pages/app-home';
import './components/header';
import './styles/global.css';
import { router } from './router';
import { sharedStyles } from './styles/shared-styles';
import { indexStyles } from './app-index.styles';
import { statusService } from './services/status-service';

@customElement('app-index')
export class AppIndex extends LitElement {
    @state() status: string = statusService.status;

    static styles = [sharedStyles, indexStyles];

    constructor() {
        super();
    }

    firstUpdated() {
        statusService.addEventListener("statuschanged", () => this.status = statusService.status);
        router.addEventListener('route-changed', () => {
            if ("startViewTransition" in document) {
                return (document as any).startViewTransition(() => {
                    this.requestUpdate();
                });
            }
            else {
                this.requestUpdate();
            }
        });
    }

    render() {
        return html`
            <main>
                ${router.render()}
            </main>
            <footer>
                ${this.status}
            </footer>
        `;
    }
}
