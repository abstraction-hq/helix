#!/usr/bin/env node
import * as chains from "viem/chains";
import {
  createPublicClient,
  http,
  PublicClient,
  Address,
  erc20Abi,
  Hex,
  encodeFunctionData,
  zeroAddress,
} from "viem";
import { StorageEngine } from "../storage/index.js";
import MagicpayAbi from "./MagicPay.abi.json" assert { type: "json" };

export const magicPayAddress: Address =
  "0x09aa0fbf1670826b4a3c193ef729d673e9a75ebd";

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

  async buildTransfer2Transaction(
    tokenAddress: Address,
    inAmount: bigint,
    walletAddress: Address,
    receiver: Address,
    outAmount: bigint,
    outReceiver: Address,
    proof: any,
    publicSignals: any,
    message: Hex
  ): Promise<unknown> {
    const inputs = [publicSignals[0], publicSignals[1]] as readonly Hex[];
    const outputs = [
      {
        owner: receiver,
        encryptedAmount: publicSignals[2] as Hex,
      },
      {
        owner: walletAddress,
        encryptedAmount: publicSignals[3] as Hex,
      },
    ] as any;

    let value = BigInt(0);
    
    if (tokenAddress == zeroAddress) {
      value += inAmount;
    }

    if (outAmount > BigInt(0)) {
      // TODO: calulate fee
    }

    const transaction = {
      to: magicPayAddress,
      data: encodeFunctionData({
        abi: MagicpayAbi,
        functionName: "pay2",
        args: [tokenAddress, inputs, outputs, inAmount, outAmount, outReceiver, proof, message],
      }),
      value
    };

    return transaction;
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

  async fetchTokenDetails(
    address: Address,
    walletAddress: Address,
  ): Promise<any> {
    const details = await this.#client.multicall({
      contracts: [
        {
          address,
          abi: erc20Abi,
          functionName: "name",
        },
        {
          address,
          abi: erc20Abi,
          functionName: "symbol",
        },
        {
          address,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [walletAddress],
        },
      ],
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
