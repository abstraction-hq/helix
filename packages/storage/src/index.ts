#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

export const DEFAULT_CONFIG_PATH = path.resolve(process.env.HOME || "", ".helix-wallet/storage.json");

export type StorageConfig = {
  [key: string]: any; // Allow arbitrary key-value pairs
};

export class StorageEngine {
  #configPath: string;
  #config: StorageConfig;

  constructor(configPath?: string) {
    this.#configPath = configPath || DEFAULT_CONFIG_PATH;
    this.#config = this.load();
  }

  load(): StorageConfig {
    try {
      if (fs.existsSync(this.#configPath)) {
        const configData = fs.readFileSync(this.#configPath, 'utf8');
        this.#config = JSON.parse(configData);
      } else {
        this.#config = {};
      }
    } catch (error) {
      console.error(`Failed to load config from ${this.#configPath}:`, error);
    }
    return this.#config;
  }

  getConfig(): StorageConfig {
    return this.#config;
  }

  setConfig(newConfig: StorageConfig): void {
    this.#config = { ...this.#config, ...newConfig };
  }

  async save(): Promise<void> {
    try {
      const configDir = path.dirname(this.#configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      fs.writeFileSync(this.#configPath, JSON.stringify(this.#config, null, 2), 'utf8');
    } catch (error) {
      console.error(`Failed to save config to ${this.#configPath}:`, error);
    }
  }
}
