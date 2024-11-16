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

  testEncryptDecrypt(): void {
    const newSeeds = this.generateNewSeeds();
    console.log("New seeds: ", newSeeds);
    const entropy = mnemonicToEntropy(newSeeds);
    console.log("Entropy: ", entropy);
    const password = "password";

    const encrypted = this.#crypto.encryptAesGcm(entropy, password) as string;
    console.log("Encrypted: ", encrypted);
    const decrypted = this.#crypto.decryptAesGcm(encrypted, password) as string;
    console.log("Decrypted: ", decrypted);

    const mnemonic = entropyToMnemonic(decrypted);

    console.log("Decrypted mnemonic: ", mnemonic);
  }

  generateNewSeeds(): string {
    return generateMnemonic();
  }

  isExitSeed(): boolean {
    return this.#config.seed !== undefined;
  }

  async persistSeed(seeds: string, password: string): Promise<void> {
    const entropy = mnemonicToEntropy(seeds);
    this.#config["seed"] = seeds;
  }

  async isUnlock(): Promise<boolean> {
    return false
  }

  async signMessage(index: number, sign: Function, message: string): Promise<string> {
    return ""
  }
}
