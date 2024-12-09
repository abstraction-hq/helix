#!/usr/bin/env node
import enquirer from "enquirer";
import {
  Address,
  concat,
  formatEther,
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
import { TransactionEngine } from "../transaction/index.js";
import { CryptoEngine } from "../crypto/index.js";
import { WELCOME_MESSAGE } from "../constants/index.js";

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
  #transaction: TransactionEngine;
  #crypto: CryptoEngine;
  #commands: Map<string, Command> = new Map();

  #isRunning = true;

  constructor(
    format: FormatEngine,
    keyring: KeyringEngine,
    chain: ChainEngine,
    token: TokenEngine,
    transaction: TransactionEngine,
    crypto: CryptoEngine,
  ) {
    this.#format = format;
    this.#keyring = keyring;
    this.#chain = chain;
    this.#token = token;
    this.#transaction = transaction;
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
    this.#commands.set("chain", {
      description: "Setting chain",
      handler: this.setChain,
    });
    this.#commands.set("transaction", {
      description: "Get all unspend transaction",
      handler: this.getTransactions,
    });
    this.#commands.set("deposit", {
      description: "Deposit private pool",
      handler: this.deposit,
    });
    this.#commands.set("import", {
      description: "Import transaction",
      handler: this.importTransaction,
    });
    this.#commands.set("transfer", {
      description: "Send token privately",
      handler: this.transfer,
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

  getTransactions = async () => {
    const transactions = await this.#transaction.getTransactions();
    console.log("Transactions:");
    transactions.forEach((tx) => {
      console.log("Chain:", tx.chain);
      console.log("Token Address:", tx.tokenAddress);
      console.log("Amount:", tx.amount);
      console.log("Secret Number:", tx.secretNumber);
      console.log("====================================");
    });
  };

  setChain = async () => {
    const activeChain = this.#chain.getActiveChain();
    console.log("Active Chain:", activeChain);
  };

  importTransaction: CommandHandler = async () => {
    if (!this.#keyring.isExitedKeypair()) {
      console.log(
        this.#format.format("Wallet not found!", FormatType.ERROR, true),
      );
      return;
    }
    const { transactionHash } = (await enquirer.prompt({
      type: "input",
      name: "transactionHash",
      message: "Enter the transaction hash:",
    })) as { transactionHash: string };

    const transaction = await this.#chain.getTransaction(
      transactionHash as Hex,
    );
    const transactionData = this.#chain.decodePay2Transaction(
      transaction.input,
    );

    const outputs = transactionData[2];
    console.log("Transaction data:", outputs);
  };

  deposit = async () => {
    if (!this.#keyring.isExitedKeypair()) {
      console.log(
        this.#format.format("Wallet not found!", FormatType.ERROR, true),
      );
      return;
    }

    if (!this.#keyring.isUnlocked()) {
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
    }

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

    console.log("Generating proof...");
    let [proof, publicSignals] =
      await this.#crypto.calucateZkProof(proveParameters);

    const message = toHex(
      JSON.stringify(
        this.#crypto.encryptSymmetric(
          this.#keyring.getEncryptionPublicKey(),
          proveParameters.outputAmounts[0] +
            "/" +
            (proveParameters.outputSecrets[0] as number).toString(),
        ),
      ),
    );

    const transaction = await this.#chain.buildTransfer2Transaction(
      tokenAddress.tokenAddress,
      BigInt(inAmountParsed),
      this.#keyring.getAddress(),
      receiver.receiver,
      BigInt(0),
      zeroAddress,
      proof,
      publicSignals,
      [message, "0x"],
    );

    console.log("Confirm deposit transaction:");
    console.log("Token Address:", tokenAddress.tokenAddress);
    console.log("In Amount:", formatEther(inAmountParsed));
    console.log("Receiver:", receiver.receiver);

    const { confirmTransaction } = (await enquirer.prompt({
      type: "confirm",
      name: "confirmTransaction",
      message: `Confirm send transaction?`,
    })) as { confirmTransaction: boolean };

    if (!confirmTransaction) {
      console.log(
        this.#format.format("Transaction cancel!", FormatType.INFO, true),
      );
      return;
    }

    const serializedTx = await this.#keyring.signTransaction(transaction);
    const hash = await this.#chain.sendTransaction(serializedTx);

    console.log(
      "Transaction sent:",
      this.#chain.buildScanLinkTransaction(hash),
    );
    console.log("Waiting for transaction confirmation...");
    const result = await this.#chain.waitForTransactionReceipt(hash);

    if (result.status == "success") {
      // save transaction
      this.#transaction.import(
        this.#chain.getActiveChain(),
        tokenAddress.tokenAddress,
        proveParameters.outputAmounts[0] as string,
        proveParameters.outputSecrets[0] as string,
      );
    }
  };

  transfer: CommandHandler = async () => {
    console.log("transfer token privately");
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
    await this.#keyring.storeKeyring(
      privateKey,
      enterPassword.enterPassword,
    );

    console.log("Create view key...");
    const viewKeyPreimage = await this.#keyring.signPersonalMessage(WELCOME_MESSAGE)
    console.log("View Key Preimage:", viewKeyPreimage);
    return;
    const hashPassword = hashMessage(enterPassword.enterPassword);
    const nonce: Hex = toHex(Math.floor(Math.random() * 1000000));
    const encryptionPrivateKey = hashMessage(
      concat([hashPassword, nonce]),
    ).slice(2);
    const encryptionPublicKey =
      this.#crypto.getEncryptionPublicKey(encryptionPrivateKey);

    await this.#keyring.storeKeyring(
      privateKey,
      enterPassword.enterPassword,
    );

    const storeEncryptionKeyTransaction =
      await this.#chain.buildStoreEncryptionKeyTransaction(
        encryptionPublicKey,
        nonce,
      );

    const signedTx = await this.#keyring.signTransaction(
      storeEncryptionKeyTransaction,
    );

    if (!(await this.#chain.sendStoreEncryptionKeyTransaction(signedTx))) {
      console.log(
        this.#format.format("Failed to create wallet!", FormatType.ERROR, true),
      );
      await this.#keyring.removeKeyring();
      return;
    }

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
