#!/usr/bin/env node
import { Address, Hash, Hex } from "viem";
import { StorageEngine } from "../storage/index.js";

export interface UTXO {
  amount: bigint;
  hash: Hex;
  secretNumber: number;
}

export class UTXOEngine {
  #storage: StorageEngine;

  constructor(storage: StorageEngine) {
    this.#storage = storage;
  }

  import = async (transaction: Hash) => {
  }

  getUTXOs = async (tokenAddress: Address): Promise<UTXO[]> => {
    const txs = this.#storage.getData()["transactions"];
    const utxos = txs ? txs[tokenAddress] : [];

    return utxos;
  }
}
