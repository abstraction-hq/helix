#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

export const DEFAULT_DATA_PATH = path.resolve(process.env.HOME || "", ".helix-wallet/storage.json");

export type Data = {
  [key: string]: any; // Allow arbitrary key-value pairs
};

export class StorageEngine {
  #dataPath: string;
  #data: Data;

  constructor(dataPath?: string) {
    this.#dataPath = dataPath || DEFAULT_DATA_PATH;
    this.#data = this.load();
  }

  load(): Data {
    try {
      if (fs.existsSync(this.#dataPath)) {
        const dataData = fs.readFileSync(this.#dataPath, 'utf8');
        this.#data = JSON.parse(dataData);
      } else {
        this.#data = {};
      }
    } catch (error) {
      console.error(`Failed to load data from ${this.#dataPath}:`, error);
    }
    return this.#data;
  }

  getData(): Data {
    return this.#data;
  }

  setData(newdata: Data): void {
    this.#data = { ...this.#data, ...newdata };
  }

  async save(): Promise<void> {
    try {
      const dataDir = path.dirname(this.#dataPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(this.#dataPath, JSON.stringify(this.#data, null, 2), 'utf8');
    } catch (error) {
      console.error(`Failed to save data to ${this.#dataPath}:`, error);
    }
  }
}
