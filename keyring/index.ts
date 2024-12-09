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
    password: string,
  ): Promise<void> {
    const account = privateKeyToAccount(privateKey);
    const data = this.#storage.getData();
    data.encryptedPrivateKey = this.#crypto.encryptAesGcm(
      privateKey,
      password,
    ) as string;
    data.passwordHash = hashMessage(password);
    data.address = account.address;

    this.#storage.setData(data);
    await this.#storage.save();

    // automatically unlock
    this.#password = password;
  }

  async storeEncryptionKey(
    encryptionPrivateKey: string,
    encryptionPublicKey: string,
  ): Promise<void> {
    const data = this.#storage.getData();
    data.encryptionPrivateKey = encryptionPrivateKey;
    data.encryptionPublicKey = encryptionPublicKey;

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

  isUnlocked(): boolean {
    return this.#password !== undefined;
  }

  async signPersonalMessage(message: string): Promise<Hex> {
    if (!this.isUnlocked()) {
      throw new Error("Keyring is locked");
    }
    const data = this.#storage.getData();
    const privateKey = this.#crypto.decryptAesGcm(
      data.encryptedPrivateKey,
      this.#password as string,
    ) as string;
    const account = privateKeyToAccount(privateKey as Hex);
    const signedMessage = await account.signMessage({ message });
    return signedMessage;
  }

  async signTransaction(transaction: Transaction): Promise<Hex> {
    if (!this.isUnlocked()) {
      throw new Error("Keyring is locked");
    }
    const data = this.#storage.getData();
    const privateKey = this.#crypto.decryptAesGcm(
      data.encryptedPrivateKey,
      this.#password as string,
    ) as string;
    const account = privateKeyToAccount(privateKey as Hex);

    const signedTx = await account.signTransaction(transaction);
    return signedTx;
  }
}
