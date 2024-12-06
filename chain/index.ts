#!/usr/bin/env node
import {
  createPublicClient,
  http,
  PublicClient,
  Address,
  erc20Abi,
  Hex,
  encodeFunctionData,
  zeroAddress,
  Transaction,
  decodeFunctionData,
} from "viem";
import { StorageEngine } from "../storage/index.js";
import * as chains from "./chains.js";
import MagicpayAbi from "./MagicPay.abi.json" assert { type: "json" };
import OnchainProfileAbi from "./OnchainProfile.abi.json" assert { type: "json" };

export const magicPayAddress: Address =
  "0x7e33db170e8b1FF05599064405fdF1F06b7d7D75";

export const onchainProfileContractAddress: Address =
  "0x9A62aedb42A10c4E105198C889B348e297886501";

export class ChainEngine {
  #storage: StorageEngine;
  #client: PublicClient;
  #dataLayer: PublicClient;

  constructor(storage: StorageEngine) {
    this.#storage = storage;
    const data = this.#storage.getData();
    const activeChain = data["activeChain"] || "holesky";
    const chain = (chains as any)[activeChain];
    this.#client = createPublicClient({
      chain,
      transport: http(),
    }) as PublicClient;
    this.#dataLayer = createPublicClient({
      chain: chains.dataLayer,
      transport: http(),
    }) as PublicClient;
  }

  buildScanLinkTransaction(hash: Hex): string {
    return this.#client.chain?.blockExplorers?.default.url + "/tx/" + hash;
  }

  async getTransaction(hash: Hex): Promise<any> {
    return await this.#client.getTransaction({ hash });
  }

  decodePay2Transaction(data: Hex): any {
    return decodeFunctionData({
      abi: MagicpayAbi,
      data,
    }).args;
  }

  async buildStoreEncryptionKeyTransaction(
    encryptionKey: string,
    nonce: Hex,
  ): Promise<any> {
    const transaction = {
      to: onchainProfileContractAddress,
      data: encodeFunctionData({
        abi: OnchainProfileAbi,
        functionName: "setProfile",
        args: [
          {
            publicEncryptionKey: encryptionKey,
            nonce: nonce,
          },
        ],
      }),
      gas: 300000n,
      gasPrice: 250000000n,
    };

    return transaction;
  }

  async sendStoreEncryptionKeyTransaction(
    serializedTransaction: Hex,
  ): Promise<boolean> {
    const hash = await this.#dataLayer.sendRawTransaction({
      serializedTransaction,
    });

    const receipt = await this.#dataLayer.waitForTransactionReceipt({ hash });
    return receipt.status == "success";
  }

  async sendTransaction(serializedTransaction: Hex): Promise<Hex> {
    const txHash = await this.#client.sendRawTransaction({
      serializedTransaction,
    });

    return txHash;
  }

  waitForTransactionReceipt = async (hash: Hex): Promise<any> => {
    const receipt = await this.#client.waitForTransactionReceipt({ hash });
    return receipt;
  };

  async buildTransfer2Transaction(
    tokenAddress: Address,
    inAmount: bigint,
    walletAddress: Address,
    receiver: Address,
    outAmount: bigint,
    outReceiver: Address,
    proof: any,
    publicSignals: any,
    messages: Hex[],
  ): Promise<Transaction> {
    const inputs = [publicSignals[0], publicSignals[1]] as readonly Hex[];
    const outputs = [
      {
        owner: receiver,
        encryptedAmount: publicSignals[2] as Hex,
        message: messages[0],
      },
      {
        owner: walletAddress,
        encryptedAmount: publicSignals[3] as Hex,
        message: messages[1]
      },
    ] as any;

    let value = BigInt(0);

    if (tokenAddress == zeroAddress) {
      value += inAmount;
    }

    if (outAmount > BigInt(0)) {
      // TODO: calulate fee
    }

    const transaction: Transaction =
      (await this.#client.prepareTransactionRequest({
        account: walletAddress,
        to: magicPayAddress,
        data: encodeFunctionData({
          abi: MagicpayAbi,
          functionName: "pay2",
          args: [
            tokenAddress,
            inputs,
            outputs,
            inAmount,
            outAmount,
            outReceiver,
            proof,
          ],
        }),
        value,
      } as any)) as Transaction;

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
