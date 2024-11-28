#!/usr/bin/env node

import { StorageEngine } from "../storage/index.js";

export class ZKPayEngine {
  #storage: StorageEngine

  constructor(storage: StorageEngine) {
    this.#storage = storage;
  }

  importTransaction = async () => {
    // TODO
  }
}
