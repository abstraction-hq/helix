#!/usr/bin/env node
import { FormatEngine, FormatType } from "../format/index.js";
import { KeyringEngine } from "../keyring/index.js";
import { ChainEngine } from "../chain/index.js";
import { TokenEngine } from "../token/index.js";
import { UTXOEngine } from "../utxo/index.js";
import enquirer from "enquirer";
import { plonk } from "snarkjs";
import { Address, parseUnits } from "viem";

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
  #commands: Map<string, Command> = new Map();

  #isRunning = true;

  constructor(
    format: FormatEngine,
    keyring: KeyringEngine,
    chain: ChainEngine,
    token: TokenEngine,
    utxo: UTXOEngine,
  ) {
    this.#format = format;
    this.#keyring = keyring;
    this.#chain = chain;
    this.#token = token;
    this.#utxo = utxo;

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
      description: "Get all addresses",
      handler: this.getAddresses,
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
    if (!this.#keyring.isExitSeed()) {
      console.log(
        this.#format.format("Wallet not found!", FormatType.ERROR, true),
      );

      return;
    }

    const tokenAddress = (await enquirer.prompt({
      type: "input",
      name: "tokenAddress",
      message: "Enter the token address(enter for native token):",
    })) as { tokenAddress: Address };

    console.log("Token Address:", tokenAddress.tokenAddress);

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

    console.log(inAmount.amount, receiver.receiver);

    const inAmountParsed = parseUnits(inAmount.amount.toString(), 18).toString();

    const proveParameters = {
      inPublicAmount: inAmountParsed,
      outPublicAmount: "0",
      inputAmounts: ["0", "0"],
      inputSecrets: ["0", "0"],
      outputAmounts: [inAmountParsed, "0"],
      outputSecrets: [Math.floor(Math.random() * 1000000), "0"],
    };
    try {
      let { proof, publicSignals } = await plonk.fullProve(
        proveParameters,
        "circuits/transfer2.wasm",
        "circuits/circuit_final.zkey",
      );

      console.log("Proof:", proof);
      console.log("Public Signals:", publicSignals);
    } catch (error) {
      console.log(error);
      return
    }
  };

  privateSend: CommandHandler = async () => {
    if (!this.#keyring.isExitSeed()) {
      console.log(
        this.#format.format("Wallet not found!", FormatType.ERROR, true),
      );

      return;
    }

    console.log("Send token privately");
  };

  getAddresses: CommandHandler = async () => {
    if (!this.#keyring.isExitSeed()) {
      console.log(
        this.#format.format("Wallet not found!", FormatType.ERROR, true),
      );

      return;
    }

    const addresses = this.#keyring.getAddresses();
    const activeAddress = this.#keyring.getActiveAddress();

    console.log("Addresses:");
    addresses.forEach((address: string, index: number) => {
      console.log(
        "(",
        index + 1,
        "):",
        activeAddress == address
          ? this.#format.format(address, FormatType.SUCCESS)
          : address,
      );
    });
  };

  createWallet: CommandHandler = async () => {
    if (this.#keyring.isExitSeed()) {
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

    const seed = this.#keyring.generateNewSeeds();
    console.log(
      this.#format.format("New Seed Generated:", FormatType.SUCCESS),
      this.#format.format(seed, FormatType.INFO, true),
    );
    const { confirmSeed } = (await enquirer.prompt({
      type: "confirm",
      name: "confirmSeed",
      message: `Please save your seed and don't share it with anyone?`,
    })) as { confirmSeed: boolean };

    if (!confirmSeed) {
      console.log(
        this.#format.format(
          "You must save your seed to create a wallet!",
          FormatType.ERROR,
          true,
        ),
      );
      return;
    }

    await this.#keyring.persistSeed(seed, enterPassword.enterPassword);

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

  start = async () => {
    console.log(
      `Welcome to Helix CLI, type ${this.#format.format("`help`", FormatType.SUCCESS)} to see available commands`,
    );
    while (this.#isRunning) {
      try {
        const response: { command: string } = (await enquirer.prompt({
          type: "input",
          name: "command",
          validate: this.#validateCommand,
          format: this.#highlightCommand,
          message: "➜",
        })) as { command: string };

        if (!response || !response.command) {
          continue;
        }

        if (response.command === "exit") {
          break;
        }

        try {
          await this.handleCommand(response.command.split(" "));
        } catch (error) {
          console.log(error);
          continue;
        }
      } catch (error) {
        try {
          console.log(
            `(To exit, press ${this.#format.format("Ctrl+C", FormatType.DEBUG)} again)`,
          );
          await enquirer.prompt({
            type: "input",
            name: "command",
            validate: this.#validateCommand,
            format: this.#highlightCommand,
            message: "➜",
          });
        } catch (error) {
          break;
        }
        continue;
      }
    }
    console.log("Goodbye!");
  };
}
