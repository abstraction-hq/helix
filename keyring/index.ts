#!/usr/bin/env node
import { english, generateMnemonic, mnemonicToAccount } from "viem/accounts";
import { StorageEngine } from "../storage/index.js";
import { CryptoEngine } from "../crypto/index.js";
import { mnemonicToEntropy, entropyToMnemonic, validateMnemonic } from "bip39";
import { Address, hashMessage, Transaction } from "viem";

export class KeyringEngine {
  #storage: StorageEngine;
  #crypto: CryptoEngine;

  constructor(storage: StorageEngine, crypto: CryptoEngine) {
    this.#storage = storage;
    this.#crypto = crypto;
  }

  generateNewSeeds(): string {
    return generateMnemonic(english);
  }

  isExitSeed(): boolean {
    const data = this.#storage.getData();
    return data.encryptedSeed !== undefined;
  }

  isValidatePassword(password: string): boolean {
    const data = this.#storage.getData();
    return data.passwordHash === hashMessage(password);
  }

  isValidMnemonic(mnemonic: string): boolean {
    return validateMnemonic(mnemonic);
  }

  async persistSeed(mnemonic: string, password: string): Promise<void> {
    const account = mnemonicToAccount(mnemonic);
    const encrypted = this.#crypto.encryptAesGcm(
      mnemonicToEntropy(mnemonic),
      password,
    ) as string;
    const data = this.#storage.getData();
    data["passwordHash"] = hashMessage(password);
    data["encryptedSeed"] = encrypted;
    // TODO: prepare for multichain
    data["addresses"] = {
      evm: [account.address],
    };
    data["defaultAddress"] = {
      evm: account.address,
    };

    this.#storage.setData(data);
    await this.#storage.save();
  }

  async addAddress(password: string): Promise<string> {
    const data = this.#storage.getData();
    const mnemonic = entropyToMnemonic(
      this.#crypto.decryptAesGcm(data.encryptedSeed, password) as string,
    );
    const totalAccount = Object.keys(data.addresses.evm).length;
    const newAccount = mnemonicToAccount(mnemonic, {
      addressIndex: totalAccount,
    });

    data.addresses.evm.push(newAccount.address);
    data.defaultAddress.evm = newAccount.address;

    this.#storage.setData(data);
    await this.#storage.save();

    return newAccount.address;
  }

  getActiveAddress(): Address {
    const data = this.#storage.getData();
    return data.defaultAddress.evm as Address;
  }

  getAddresses(): string[] {
    const data = this.#storage.getData();
    return data.addresses.evm;
  }

  async setActiveAddress(address: string): Promise<void> {
    const data = this.#storage.getData();
    data.defaultAddress.evm = address;
    this.#storage.setData(data);
    await this.#storage.save();
  }

  async isUnlock(): Promise<boolean> {
    return false;
  }

  async signMessage(
    index: number,
    message: string,
    password: string,
  ): Promise<string> {
    const data = this.#storage.getData();
    const mnemonic = entropyToMnemonic(
      this.#crypto.decryptAesGcm(data.encryptedSeed, password) as string,
    );
    const account = mnemonicToAccount(mnemonic, {
      addressIndex: index,
    });

    const signature = await account.signMessage({
      message,
    });
    return signature;
  }

  async signTransaction(
    index: number,
    transaction: Transaction,
    password: string,
  ): Promise<string> {
    const data = this.#storage.getData();
    const mnemonic = entropyToMnemonic(
      this.#crypto.decryptAesGcm(data.encryptedSeed, password) as string,
    );
    const account = mnemonicToAccount(mnemonic, {
      addressIndex: index,
    });

    const signature = await account.signTransaction(transaction);
    return signature;
  }
}
