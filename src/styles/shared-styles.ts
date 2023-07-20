import { css } from 'lit';

// these styles can be imported from any component
// for an example of how to use this, check /pages/about-about.ts
export const sharedStyles = css`
  @media(min-width: 1000px) {
    sl-card {
      max-width: 70vw;
    }
  }

  main {
    margin-top: 80px;
  }

  .d-none {
    display: none;
  }

  .d-flex {
    display: flex;
  }

  .flex-column {
    flex-direction: column;
  }

  .justify-space-between {
    justify-content: space-between;
  }

  .align-items-center {
    align-items: center;
  }

  .gap-0 {
    gap: 0;
  }

  .gap-1 {
    gap: 0.5em;
  }

  .gap-2 {
    gap: 1em;
  }
`;