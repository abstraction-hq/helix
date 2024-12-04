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

  async storeKeyring(
    privateKey: Hex,
    encryptionPublicKey: string,
    encryptionPrivateKey: string,
    password: string,
  ): Promise<void> {
    const account = privateKeyToAccount(privateKey);
    const data = this.#storage.getData();
    data.encryptedPrivateKey = this.#crypto.encryptAesGcm(
      privateKey,
      password,
    ) as string;
    data.passwordHash = hashMessage(password);
    data.encryptionPublicKey = encryptionPublicKey;
    data.encryptionPrivateKey = encryptionPrivateKey;
    data.address = account.address;

    this.#storage.setData(data);
    await this.#storage.save();
  }

  getAddress(): Address {
    const data = this.#storage.getData();
    return data.address;
  }

  getAddressFromPrivateKey(privateKey: Hex): Address {
    const account = privateKeyToAccount(privateKey);
    return account.address;
  }

  getEncryptionPublicKey(): string {
    const data = this.#storage.getData();
    return data.encryptionPublicKey;
  }

  getEncryptionPrivateKey(): string {
    const data = this.#storage.getData();
    return data.encryptionPrivateKey;
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

    const signedTx = await account.signTransaction(transaction);
    return signedTx;
  }

  async signTransactionWithPrivateKey(
    transaction: Transaction,
    privateKey: string,
  ): Promise<string> {
    const account = privateKeyToAccount(privateKey as Hex);

    const signedTx = await account.signTransaction(transaction);
    return signedTx;
  }
}
