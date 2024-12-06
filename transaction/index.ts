#!/usr/bin/env node
import { Address, Hash, Hex } from "viem";
import { StorageEngine } from "../storage/index.js";

export interface Transaction {
  chain: string;
  tokenAddress: Address;
  amount: string;
  secretNumber: string;
}

export class TransactionEngine {
  #storage: StorageEngine;

  constructor(storage: StorageEngine) {
    this.#storage = storage;
  }

  import = async (chain: string, tokenAddress: Address, amount: string, secretNumber: string) => {
    const txs = this.#storage.getData()["transactions"] || [];
    txs.push({
      chain,
      tokenAddress,
      amount,
      secretNumber
    })
    this.#storage.setData({ transactions: txs });

    await this.#storage.save();
  };

  getTransactions = async (): Promise<Transaction[]> => {
    const txs = this.#storage.getData()["transactions"] || [];

    return txs;
  };
}
