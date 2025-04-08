import Store from "electron-store"

interface StoreSchema {
  model: string;
  theme: 'light' | 'dark';
  opacity: number;
  contentProtection: boolean;
  taskbarIconHidden: boolean;
  apiKeys: {
    openai?: string;
    anthropic?: string;
    google?: string;
    deepseek?: string;
    meta?: string;
    deepgram?: string;
  };
}

const store = new Store<StoreSchema>({
  defaults: {
    model: "gpt-4o",
    theme: 'dark',
    opacity: 1.0,
    contentProtection: true,
    taskbarIconHidden: false,
    apiKeys: {}
  },
  encryptionKey: "your-encryption-key"
}) as Store<StoreSchema> & {
  store: StoreSchema
  get: <K extends keyof StoreSchema>(key: K) => StoreSchema[K]
  set: <K extends keyof StoreSchema>(key: K, value: StoreSchema[K]) => void
}

export { store, type StoreSchema }
