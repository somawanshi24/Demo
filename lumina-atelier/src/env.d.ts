/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REPLICATE_API_TOKEN: string;
  readonly VITE_ANTHROPIC_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
