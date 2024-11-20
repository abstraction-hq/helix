#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";

export const DEFAULT_DATA_PATH = path.resolve(
  process.env.HOME || "",
  ".helix-wallet/storage.json",
);

export type Data = {
  [key: string]: any; // Allow arbitrary key-value pairs
};

export class StorageEngine {
  static instance: StorageEngine | null = null;
  #dataPath: string;
  #data: Data;

  private constructor(dataPath?: string) {
    this.#dataPath = dataPath || DEFAULT_DATA_PATH;
    this.#data = {};
  }

  static async getInstance(dataPath?: string): Promise<StorageEngine> {
    if (!StorageEngine.instance) {
      const instance = new StorageEngine(dataPath);
      await instance.load(); // Load the storage data once
      StorageEngine.instance = instance;
    }
    return StorageEngine.instance;
  }

  async load(): Promise<Data> {
    try {
      if (await this.fileExists(this.#dataPath)) {
        const dataData = await fs.readFile(this.#dataPath, "utf8");
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

  setData(newData: Data): void {
    this.#data = { ...this.#data, ...newData };
  }

  async save(): Promise<void> {
    try {
      const dataDir = path.dirname(this.#dataPath);
      await fs.mkdir(dataDir, { recursive: true });
      await fs.writeFile(
        this.#dataPath,
        JSON.stringify(this.#data, null, 2),
        "utf8",
      );
    } catch (error) {
      console.error(`Failed to save data to ${this.#dataPath}:`, error);
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
