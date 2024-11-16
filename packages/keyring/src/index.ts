#!/usr/bin/env node
import { generateMnemonic, mnemonicToEntropy, entropyToMnemonic } from 'bip39';
import { StorageEngine, StorageConfig } from "@helix/storage"
import { CryptoEngine } from "@helix/crypto"

export class KeyringEngine {
  #storage: StorageEngine;
  #config: StorageConfig;
  #crypto: CryptoEngine;

  constructor(storage: StorageEngine = new StorageEngine()) {
    this.#storage = storage;
    this.#config = this.#storage.getConfig();
    this.#crypto = new CryptoEngine();
  }

  generateNewSeeds(): string {
    return generateMnemonic();
  }

  isExitSeed(): boolean {
    return this.#config.encryptedSeed !== undefined;
  }

  async persistSeed(seeds: string, password: string): Promise<void> {
    const entropy = mnemonicToEntropy(seeds);
    const encrypted = this.#crypto.encryptAesGcm(entropy, password) as string;
    this.#config["encryptedSeed"] = encrypted;


    this.#storage.setConfig(this.#config);
    await this.#storage.save();
  }

  async isUnlock(): Promise<boolean> {
    return false
  }

  async signMessage(index: number, sign: Function, message: string): Promise<string> {
    return ""
  }
}
