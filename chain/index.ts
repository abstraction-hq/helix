#!/usr/bin/env node
import * as chains from "viem/chains";
import { createPublicClient, http, PublicClient, Address, erc20Abi } from "viem";
import { StorageEngine } from "../storage/index.js";

export class ChainEngine {
  #storage: StorageEngine;
  #client: PublicClient;
  constructor(storage: StorageEngine) {
    this.#storage = storage;
    const data = this.#storage.getData();
    const activeChain = data["activeChain"] || "mainnet";
    const chain = (chains as any)[activeChain];
    this.#client = createPublicClient({
      chain,
      transport: http(),
    }) as PublicClient;
  }

  async saveActiveChain(chain: string): Promise<void> {
    this.#client = createPublicClient({
      chain: (chains as any)[chain],
      transport: http(),
    }) as PublicClient;
    const data = this.#storage.getData();
    data["activeChain"] = chain;
    this.#storage.setData(data);
    await this.#storage.save();
  }

  async fetchBalance(address: Address): Promise<bigint> {
    const balance = await this.#client.getBalance({ address });
    return balance;
  }

  async fetchTokenDetails(address: Address, walletAddress: Address): Promise<any> {
    const details = await this.#client.multicall({
      contracts: [
        {
          address,
          abi: erc20Abi,
          functionName: "name"
        },
        {
          address,
          abi: erc20Abi,
          functionName: "symbol"
        },
        {
          address,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [walletAddress]
        },
      ]
    });

    return details;
  }

  currencySymbol(): string {
    return this.#client.chain?.nativeCurrency.symbol || "ETH";
  }

  currencyDecimal(): number {
    return this.#client.chain?.nativeCurrency.decimals || 18;
  }

  getActiveChain(): string {
    return this.#client.chain?.name || "";
  }

  totalSupportedChains(): number {
    return Object.keys(chains).length;
  }

  isSupportedChain(chain: string): boolean {
    return (chains as any)[chain] !== undefined;
  }
}
