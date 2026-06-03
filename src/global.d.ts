import type { NeuroApi } from '../electron/preload';

declare global {
  interface Window {
    neuro: NeuroApi;
  }

  // <webview> is an Electron-only element; declare a loose JSX intrinsic so TSX compiles.
  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          partition?: string;
          allowpopups?: boolean | string;
          useragent?: string;
        },
        HTMLElement
      >;
    }
  }
}

export {};
