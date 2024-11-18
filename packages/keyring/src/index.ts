#!/usr/bin/env node
import { english, generateMnemonic, mnemonicToAccount } from 'viem/accounts';
import { StorageEngine, Data } from "@helix/storage"
import { CryptoEngine } from "@helix/crypto"
import { mnemonicToEntropy } from 'bip39';
import { hashMessage, keccak256 } from 'viem';

export class KeyringEngine {
  #storage: StorageEngine;
  #crypto: CryptoEngine;

  constructor(storage: StorageEngine = new StorageEngine()) {
    this.#storage = storage;
    this.#crypto = new CryptoEngine();
  }

  generateNewSeeds(): string {
    return generateMnemonic(english);
  }

  isExitSeed(): boolean {
    const data = this.#storage.getData();
    return data.encryptedSeed !== undefined;
  }

  async persistSeed(mnemonic: string, password: string): Promise<void> {
    const account = mnemonicToAccount(mnemonic);
    const encrypted = this.#crypto.encryptAesGcm(mnemonicToEntropy(mnemonic), password) as string;
    const data = this.#storage.getData();
    data["passwordHash"] = hashMessage(password);
    data["encryptedSeed"] = encrypted;
    // TODO: prepare for multichain
    data["addresses"] = {
      "evm": [account.address]
    };
    data["defaultAddress"] = {
      "evm": account.address
    };

    this.#storage.setData(data);
    await this.#storage.save();
  }

  async isUnlock(): Promise<boolean> {
    return false
  }

  async signMessage(index: number, sign: Function, message: string): Promise<string> {
    return ""
  }
}
