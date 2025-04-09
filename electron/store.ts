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
  hotkeys: {
    up: string;
    down: string;
    left: string;
    right: string;
    screenshot: string;
    solve: string;
    reset: string;
    hideApp: string;
    teleprompter: string;
    chat: string;
  };
}

const store = new Store<StoreSchema>({
  defaults: {
    model: "gpt-4o",
    theme: 'dark',
    opacity: 1.0,
    contentProtection: true,
    taskbarIconHidden: false,
    apiKeys: {},
    hotkeys: {
      up: 'CommandOrControl+Up',
      down: 'CommandOrControl+Down',
      left: 'CommandOrControl+Left',
      right: 'CommandOrControl+Right',
      screenshot: 'CommandOrControl+H',
      solve: 'CommandOrControl+Enter',
      reset: 'CommandOrControl+R',
      hideApp: 'CommandOrControl+B',
      teleprompter: 'CommandOrControl+T',
      chat: 'CommandOrControl+D'
    }
  },
  encryptionKey: "your-encryption-key"
}) as Store<StoreSchema> & {
  store: StoreSchema
  get: <K extends keyof StoreSchema>(key: K) => StoreSchema[K]
  set: <K extends keyof StoreSchema>(key: K, value: StoreSchema[K]) => void
}

export { store, type StoreSchema }
