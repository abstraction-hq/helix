#!/usr/bin/env node
import { Hash } from "viem";
import { StorageEngine } from "../storage/index.js";

export class UTXOEngine {
  #storage: StorageEngine;

  constructor(storage: StorageEngine) {
    this.#storage = storage;
  }

  import = async (transaction: Hash) => {
  }
}
