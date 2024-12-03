#!/usr/bin/env node
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { StorageEngine } from "../storage/index.js";
import { CryptoEngine } from "../crypto/index.js";
import { Address, hashMessage, Hex, Transaction } from "viem";

export class KeyringEngine {
  #storage: StorageEngine;
  #crypto: CryptoEngine;
  #password: string | undefined;

  constructor(storage: StorageEngine, crypto: CryptoEngine) {
    this.#storage = storage;
    this.#crypto = crypto;
  }

  generateNewPrivateKey(): Hex {
    return generatePrivateKey();
  }

  isExitedKeypair(): boolean {
    const data = this.#storage.getData();
    return data.encryptedPrivateKey !== undefined;
  }

  isValidatePassword(password: string): boolean {
    const data = this.#storage.getData();
    return data.passwordHash === hashMessage(password);
  }

  unlock(password: string): boolean {
    if (!this.isValidatePassword(password)) {
      return false;
    }
    this.#password = password;
    return true;
  }

  async savePrivateKey(privateKey: Hex, password: string): Promise<void> {
    const account = privateKeyToAccount(privateKey);
    const encrypted = this.#crypto.encryptAesGcm(
      privateKey,
      password,
    ) as string;
    const data = this.#storage.getData();
    data.passwordHash = hashMessage(password);
    data.encryptedPrivateKey = encrypted;
    data.address = account.address;
    data.encryptionKey = this.#crypto.getEncryptionPublicKey(privateKey);

    this.#storage.setData(data);
    await this.#storage.save();
  }

  getAddress(): Address {
    const data = this.#storage.getData();
    return data.address;
  }

  getEncryptionPublicKey(): Hex {
    const data = this.#storage.getData();
    return data.encryptionKey;
  }

  async isUnlock(): Promise<boolean> {
    return this.#password !== undefined;
  }

  async encryptMessage(message: string, publicKey: Hex) {
    if (!this.#password) {
      throw new Error("Must unlock keyring first");
    }
    const data = this.#storage.getData();
  }

  async signTransaction(
    transaction: Transaction,
    password: string,
  ): Promise<string> {
    const data = this.#storage.getData();
    const privateKey = this.#crypto.decryptAesGcm(
      data.encryptedPrivateKey,
      password,
    ) as string;
    const account = privateKeyToAccount(privateKey as Hex);

    const signature = await account.signTransaction(transaction);
    return signature;
  }
}
