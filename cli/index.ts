#!/usr/bin/env node
import enquirer from "enquirer";
import {
  Address,
  concat,
  fromHex,
  hashMessage,
  Hex,
  parseUnits,
  toHex,
  zeroAddress,
} from "viem";
import { FormatEngine, FormatType } from "../format/index.js";
import { KeyringEngine } from "../keyring/index.js";
import { ChainEngine } from "../chain/index.js";
import { TokenEngine } from "../token/index.js";
import { UTXOEngine } from "../utxo/index.js";
import { CryptoEngine } from "../crypto/index.js";

type CommandHandler = (args: string[]) => Promise<void>;

type Command = {
  description: string;
  handler: CommandHandler;
};

export class HelixCLI {
  // engines
  #format: FormatEngine;
  #keyring: KeyringEngine;
  #chain: ChainEngine;
  #token: TokenEngine;
  #utxo: UTXOEngine;
  #crypto: CryptoEngine;
  #commands: Map<string, Command> = new Map();

  #isRunning = true;

  constructor(
    format: FormatEngine,
    keyring: KeyringEngine,
    chain: ChainEngine,
    token: TokenEngine,
    utxo: UTXOEngine,
    crypto: CryptoEngine,
  ) {
    this.#format = format;
    this.#keyring = keyring;
    this.#chain = chain;
    this.#token = token;
    this.#utxo = utxo;
    this.#crypto = crypto;

    this.#commands.set("help", {
      description: "Show available commands",
      handler: this.help,
    });
    this.#commands.set("exit", {
      description: "Exit the CLI",
      handler: this.exit,
    });
    this.#commands.set("clear", {
      description: "Clear the terminal",
      handler: this.clear,
    });
    this.#commands.set("create", {
      description: "Create a new wallet",
      handler: this.createWallet,
    });
    this.#commands.set("address", {
      description: "Get address",
      handler: this.getAddress,
    });
    this.#commands.set("deposit", {
      description: "Deposit private pool",
      handler: this.deposit,
    });
    this.#commands.set("p-send", {
      description: "Send token privately",
      handler: this.privateSend,
    });
  }

  #highlightCommand = (input: string) => {
    const command = input.split(" ")[0];
    if (command && this.#commands.has(command)) {
      return this.#format.format(command, FormatType.SUCCESS);
    }
    return input;
  };

  #validateCommand = (input: string) => {
    const command = input.split(" ")[0];
    if (!command) {
      return true;
    }
    return this.#commands.has(command) || "Invalid command";
  };

  handleCommand = async (command: string[]) => {
    const [cmd, ...args] = command;
    if (!cmd || !this.#commands.has(cmd)) {
      return;
    }

    const handler = this.#commands.get(cmd)?.handler || this.exit;
    await handler(args);
  };

  help = async () => {
    console.log("Available commands:");
    this.#commands.forEach((value, key) => {
      console.log(
        `  ${this.#format.format(key, FormatType.SUCCESS)}: ${value.description}`,
      );
    });
  };

  clear = async () => {
    console.clear();
  };

  deposit = async () => {
    if (!this.#keyring.isExitedKeypair()) {
      console.log(
        this.#format.format("Wallet not found!", FormatType.ERROR, true),
      );

      return;
    }

    /*
    const enterPassword = (await enquirer.prompt({
      type: "password",
      name: "enterPassword",
      message: "Enter your password to unlock your wallet:",
    })) as { enterPassword: string };

    if (!this.#keyring.unlock(enterPassword.enterPassword)) {
      console.log(
        this.#format.format("Password incorrect!", FormatType.ERROR, true),
      );
      return;
    }
    */

    const tokenAddress = (await enquirer.prompt({
      type: "input",
      name: "tokenAddress",
      message: "Enter the token address(enter for native token):",
    })) as { tokenAddress: Address };

    if (!tokenAddress.tokenAddress) {
      tokenAddress.tokenAddress = zeroAddress;
    }

    const inAmount = (await enquirer.prompt({
      type: "number",
      name: "amount",
      message: "Enter in amount:",
      validate: (value) => {
        return isNaN(Number(value)) ? "Amount must be a number" : true;
      },
    })) as { amount: string };

    const receiver = (await enquirer.prompt({
      type: "input",
      name: "receiver",
      message: "Enter the receiver address(enter for active address):",
    })) as { receiver: Address };

    if (!receiver.receiver) {
      receiver.receiver = this.#keyring.getAddress();
    }

    const inAmountParsed = parseUnits(inAmount.amount.toString(), 18);

    const proveParameters = {
      inPublicAmount: inAmountParsed.toString(),
      outPublicAmount: "0",
      inputAmounts: ["0", "0"],
      inputSecrets: ["0", "0"],
      outputAmounts: [inAmountParsed.toString(), "0"],
      outputSecrets: [Math.floor(Math.random() * 1e18), "0"],
    };

    console.log(proveParameters);

    const message = JSON.stringify(
      this.#crypto.encryptSymmetric(
        this.#keyring.getEncryptionPublicKey(),
        proveParameters.outputAmounts[0] + "/" + (proveParameters.outputSecrets[0] as number).toString(),
      ),
    );

    console.log("Message:", message);
    const hexMessage = toHex(message);
    console.log("Hex message", hexMessage);
    console.log("Message", fromHex(hexMessage, "string"));

    const postMessage = JSON.parse(fromHex(hexMessage, "string"));

    const decryptMessage = this.#crypto.decryptSymmetric(
      postMessage,
      this.#keyring.getEncryptionPrivateKey(),
    );

    console.log("Decrypt Message", decryptMessage);

    let [proof, publicSignals] =
      await this.#crypto.calucateZkProof(proveParameters);

    const transaction = await this.#chain.buildTransfer2Transaction(
      tokenAddress.tokenAddress,
      BigInt(inAmountParsed),
      this.#keyring.getAddress(),
      receiver.receiver,
      BigInt(0),
      zeroAddress,
      proof,
      publicSignals,
      toHex(JSON.stringify(message)),
    );

    console.log(transaction);
  };

  privateSend: CommandHandler = async () => {
    console.log("Send token privately");
  };

  getAddress: CommandHandler = async () => {
    if (!this.#keyring.isExitedKeypair()) {
      console.log(
        this.#format.format("Wallet not found!", FormatType.ERROR, true),
      );

      return;
    }

    console.log(
      "Address:",
      this.#format.format(this.#keyring.getAddress(), FormatType.SUCCESS),
    );
    console.log(
      "Encryption Key:",
      this.#format.format(
        this.#keyring.getEncryptionPublicKey(),
        FormatType.SUCCESS,
      ),
    );
  };

  createWallet: CommandHandler = async () => {
    if (this.#keyring.isExitedKeypair()) {
      console.log(this.#format.format("Wallet exited!", FormatType.INFO));

      return;
    }
    const enterPassword = (await enquirer.prompt({
      type: "password",
      name: "enterPassword",
      message: "Enter a password for your wallet:",
      validate: (value) => {
        return value.length < 8
          ? "Password must be at least 8 characters"
          : true;
      },
    })) as { enterPassword: string };
    await enquirer.prompt({
      type: "password",
      message: "Confirm the password:",
      name: "confirmPassword",
      validate: (value) => {
        return value !== enterPassword.enterPassword
          ? "Password does not match. Please try again."
          : true;
      },
    });
    const privateKey: Hex = this.#keyring.generateNewPrivateKey();
    console.log(
      this.#format.format("New Privatekey Generated:", FormatType.SUCCESS),
      this.#format.format(privateKey, FormatType.INFO, true),
    );
    const { confirmSave } = (await enquirer.prompt({
      type: "confirm",
      name: "confirmSave",
      message: `Please save your private key and don't share it with anyone?`,
    })) as { confirmSave: boolean };

    if (!confirmSave) {
      console.log(
        this.#format.format(
          "You must save your seed to create a wallet!",
          FormatType.ERROR,
          true,
        ),
      );
      return;
    }

    console.log("Creating wallet...");
    const hashPassword = hashMessage(enterPassword.enterPassword);
    const nonce: Hex = toHex(Math.floor(Math.random() * 1000000));
    const encryptionPrivateKey = hashMessage(
      concat([hashPassword, nonce]),
    ).slice(2);
    const encryptionPublicKey =
      this.#crypto.getEncryptionPublicKey(encryptionPrivateKey);

    const storeEncryptionKeyTransaction =
      await this.#chain.buildStoreEncryptionKeyTransaction(
        encryptionPublicKey,
        nonce,
      );

    const signedTx = await this.#keyring.signTransactionWithPrivateKey(
      storeEncryptionKeyTransaction,
      privateKey,
    );

    const txHash =
      await this.#chain.sendStoreEncryptionKeyTransaction(signedTx);

    const receipt =
      await this.#chain.waitForStoreEncryptionKeyTransactionReceipt(txHash);
    if (receipt.status != "success") {
      console.log(
        this.#format.format("Failed to create wallet!", FormatType.ERROR, true),
      );
      throw new Error(receipt);
    }

    await this.#keyring.storeKeyring(
      privateKey,
      encryptionPublicKey,
      encryptionPrivateKey,
      enterPassword.enterPassword,
    );

    console.log(
      this.#format.format(
        "Create wallet successfully!",
        FormatType.SUCCESS,
        true,
      ),
    );
  };

  exit = async () => {
    this.#isRunning = false;
  };

  listenForCommand = async () => {
    const response: { command: string } = (await enquirer.prompt({
      type: "input",
      name: "command",
      validate: this.#validateCommand,
      format: this.#highlightCommand,
      message: "➜",
    })) as { command: string };

    if (!response || !response.command) {
      return;
    }

    if (response.command === "exit") {
      this.exit();
      return;
    }
    await this.handleCommand(response.command.split(" "));
  };

  start = async () => {
    console.log(
      `Welcome to Helix CLI, type ${this.#format.format("`help`", FormatType.SUCCESS)} to see available commands`,
    );
    while (this.#isRunning) {
      try {
        await this.listenForCommand();
      } catch (error) {
        console.error(error);
        try {
          console.log(
            `(To exit, press ${this.#format.format("Ctrl+C", FormatType.DEBUG)} again)`,
          );
          await this.listenForCommand();
        } catch (error) {
          break;
        }
        continue;
      }
    }
    console.log("Goodbye!");
  };
}
