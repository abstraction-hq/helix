#!/usr/bin/env node
import { Address } from "viem";
import { StorageEngine } from "../storage/index.js";

export class TokenEngine {
  #storage: StorageEngine;

  constructor(storage: StorageEngine) {
    this.#storage = storage;
  }

  getTokens(chain: string): {
    [token: string]: { name: string; symbol: string; decimals: number };
  } {
    const data = this.#storage.getData();
    return data["tokens"][chain] || {};
  }

  async addToken(
    chain: string,
    token: Address,
    name: string,
    symbol: string,
    decimals: number,
  ): Promise<void> {
    const data = this.#storage.getData();
    data["tokens"] = data["tokens"] || {};
    data["tokens"][chain] = data["tokens"][chain] || {};
    data["tokens"][chain][token] = { name, symbol, decimals };
    this.#storage.setData(data);
    await this.#storage.save();
  }

  async removeToken(chain: string, token: Address): Promise<void> {
    const data = this.#storage.getData();
    data["tokens"] = data["tokens"] || {};
    data["tokens"][chain] = data["tokens"][chain] || {};
    delete data["tokens"][chain][token];
    this.#storage.setData(data);
    await this.#storage.save();
  }
}
