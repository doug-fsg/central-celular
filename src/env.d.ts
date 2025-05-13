/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_QUEPASA_TOKEN: string
  readonly VITE_QUEPASA_USER_EMAIL: string
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 