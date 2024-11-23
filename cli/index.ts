#!/usr/bin/env node
import { FormatEngine, FormatType } from "../format/index.js";
import { KeyringEngine } from "../keyring/index.js";
import { ChainEngine } from "../chain/index.js";
import { input, password } from "@inquirer/prompts";
import { formatUnits } from "viem";

type CommandHandler = (args: { [key: string]: string }) => Promise<void>;

interface Command {
  handler: CommandHandler;
  description: string;
}

export class HelixCLI {
  #namespaces: string[] = [];
  #commands: Map<string, Command>;

  // engines
  #format: FormatEngine;
  #keyring: KeyringEngine;
  #chain: ChainEngine;

  constructor(
    format: FormatEngine,
    keyring: KeyringEngine,
    chain: ChainEngine,
  ) {
    this.#format = format;
    this.#keyring = keyring;
    this.#chain = chain;

    this.#commands = new Map<string, Command>();
    // register command
    this.#registerCommand(
      "help",
      this.handleHelp.bind(this),
      "Print all available commands",
    );
    this.#registerCommand(
      "info",
      this.handleGetInfo.bind(this),
      "Get wallet information",
    );
    this.#registerCommand(
      "create",
      this.handleCreateWallet.bind(this),
      "Create a new wallet",
    );
    this.#registerCommand(
      "import",
      this.handleImportWallet.bind(this),
      "Import exited wallet",
    );
    this.#registerCommand(
      "address",
      this.handleGetActiveAddress.bind(this),
      "Get active address",
    );
    this.#registerCommand(
      "addresses",
      this.handleGetAllAddresses.bind(this),
      "Get all created addresses",
    );
    this.#registerCommand(
      "add-address",
      this.handleAddAddress.bind(this),
      "Add address",
    );
    this.#registerCommand(
      "clear",
      this.handleClearTerminal.bind(this),
      "Clear terminal",
    );
    this.#registerCommand(
      "transfer",
      this.handleTransfer.bind(this),
      "Transfer cryptocurrency",
    );
    this.#registerCommand(
      "balance",
      this.handleFetchBalance.bind(this),
      "Fetch balance",
    );
    this.#registerCommand(
      "chain",
      this.handleGetActiveChain.bind(this),
      "Get active chain",
    );
    this.#registerCommand(
      "chains",
      this.handleGetChains.bind(this),
      "Get all chains",
    );
    this.#registerCommand(
      "exit",
      async () => {
        throw new Error("exit");
      },
      "Exit wallet terminal",
    );
  }

  #registerCommand(name: string, handler: CommandHandler, description: string) {
    this.#commands.set(name, { handler, description });
  }

  #formatPrefix() {
    let prefix =
      this.#format.format("# Helix wallet ", FormatType.SUCCESS, false) + " >";
    for (const namespace of this.#namespaces) {
      prefix +=
        " " + this.#format.format(namespace, FormatType.INFO, false) + " >";
    }
    return prefix;
  }

  #styleAnswer(text: string) {
    let commandSplit = text.split(" ");
    const mainCommand = commandSplit[0];
    const cmd = this.#commands.get(mainCommand as string);
    commandSplit.shift();
    if (!cmd) {
      return (
        this.#format.format(mainCommand as string, FormatType.ERROR, false) +
        " " +
        commandSplit.join(" ")
      );
    } else {
      return (
        this.#format.format(mainCommand as string, FormatType.SUCCESS, false) +
        " " +
        commandSplit.join(" ")
      );
    }
  }

  parseCommand(commandParts: string[]): { [key: string]: string } {
    const command: { [key: string]: string } = {
      action: commandParts[0] as string, // The first element is the action
    };

    for (const part of commandParts.slice(1)) {
      const [key, value] = part.split(":") as [string, string];
      command[key] = value; // Keep values as plain strings
    }

    return command;
  }

  async #handleAnswer(answer: string) {
    if (answer.length == 0) {
      return;
    }
    const commandSplit = answer.split(" ");
    const command = this.parseCommand(commandSplit);
    const cmd = this.#commands.get(command["action"] as string);

    if (cmd) {
      await cmd.handler(command);
    } else {
      console.log(
        `Unknown command: '${this.#format.format(answer, FormatType.ERROR, true)}'. Type '${this.#format.format("help", FormatType.DEFAULT, true)}' for a list of commands.`,
      );
    }
  }

  async start() {
    console.log(
      this.#format.format(
        "Welcome to Helix Crypto Wallet Terminal.",
        FormatType.SUCCESS,
        true,
      ),
    );
    console.log(
      this.#format.format(
        `Type '${this.#format.format("help", FormatType.DEFAULT, true)}' to list available commands.\n`,
        FormatType.INFO,
      ),
    );

    while (true) {
      try {
        const answer = await input({
          message: "",
          theme: {
            prefix: this.#formatPrefix(),
            style: {
              answer: (text: string) => this.#styleAnswer(text),
            },
          },
        });

        await this.#handleAnswer(answer);
      } catch (err) {
        console.log("Exit helix wallet terminal.");
        break;
      }
    }
  }

  async handleHelp(args: { [key: string]: string }) {
    console.log("Available commands:");
    this.#commands.forEach((command, name) => {
      console.log(`  ${name.padEnd(20)} ${command.description}`);
    });
    console.log("\nType 'help <command>' for more details about a command.");
  }

  async handleImportWallet(_: { [key: string]: string }) {
    if (this.#keyring.isExitSeed()) {
      console.log(this.#format.format("Wallet exited!", FormatType.INFO, true));

      return;
    }
    this.#namespaces.push("Import Wallet");
    const enterPassword = await password({
      message: "Enter a password for your wallet:",
      mask: "*",
      validate: (value) => {
        return value.length < 8
          ? "Password must be at least 8 characters"
          : true;
      },
      theme: {
        prefix: this.#formatPrefix(),
      },
    });
    await password({
      message: "Confirm the password:",
      mask: "*",
      validate: (value) => {
        return value !== enterPassword
          ? "Password does not match. Please try again."
          : true;
      },
      theme: {
        prefix: this.#formatPrefix(),
      },
    });

    const seed = await password({
      message: `Input your seed phrase:`,
      mask: "*",
      validate: (value) => {
        return this.#keyring.isValidMnemonic(value)
          ? true
          : "Invalid seed format";
      },
      theme: {
        prefix: this.#formatPrefix(),
      },
    });

    await this.#keyring.persistSeed(seed, enterPassword);

    console.log(
      this.#format.format(
        "Import wallet successfully!",
        FormatType.SUCCESS,
        true,
      ),
    );
    this.#namespaces.pop();
  }

  async handleCreateWallet(_: { [key: string]: string }) {
    if (this.#keyring.isExitSeed()) {
      console.log(this.#format.format("Wallet exited!", FormatType.INFO, true));

      return;
    }
    this.#namespaces.push("Create Wallet");
    const enterPassword = await password({
      message: "Enter a password for your wallet:",
      mask: "*",
      validate: (value) => {
        return value.length < 8
          ? "Password must be at least 8 characters"
          : true;
      },
      theme: {
        prefix: this.#formatPrefix(),
      },
    });
    await password({
      message: "Confirm the password:",
      mask: "*",
      validate: (value) => {
        return value !== enterPassword
          ? "Password does not match. Please try again."
          : true;
      },
      theme: {
        prefix: this.#formatPrefix(),
      },
    });

    const seed = this.#keyring.generateNewSeeds();
    console.log(
      this.#format.format(
        "\n     New Seed Generated:",
        FormatType.SUCCESS,
        false,
      ),
    );
    console.log(
      this.#format.format(`\n           ${seed}\n`, FormatType.INFO, true),
    );

    await input({
      message: `Please save your seed and don't share it with anyone? (type ${this.#format.format("yes", FormatType.SUCCESS, true)} to confirm):`,
      validate: (value) => {
        return value !== "yes" ? "Please type 'yes' to confirm" : true;
      },
      theme: {
        prefix: this.#formatPrefix(),
        style: {
          answer: (text: string) =>
            text === "yes"
              ? this.#format.format(text, FormatType.SUCCESS, false)
              : this.#format.format(text, FormatType.ERROR, false),
        },
      },
    });

    await this.#keyring.persistSeed(seed, enterPassword);

    console.log(
      this.#format.format(
        "\n     Create wallet successfully!\n",
        FormatType.SUCCESS,
        true,
      ),
    );
    this.#namespaces.pop();
  }

  async handleGetActiveAddress(_: { [key: string]: string }) {
    if (!this.#keyring.isExitSeed()) {
      console.log(
        this.#format.format("Wallet not found!", FormatType.ERROR, true),
      );

      return;
    }
    const activeAddress = this.#keyring.getActiveAddress();
    console.log(
      "Active address: ",
      this.#format.format(activeAddress, FormatType.SUCCESS, true),
    );
  }

  async handleSetDefaultAddress(args: { [key: string]: string }) {
    console.log("set address");
  }

  async handleAddAddress(args: { [key: string]: string }) {
    if (!this.#keyring.isExitSeed()) {
      console.log(
        this.#format.format("Wallet not found!", FormatType.ERROR, true),
      );

      return;
    }
    this.#namespaces.push("Add Address");
    const enterPassword = await password({
      message: "Enter a password to unlock your wallet:",
      mask: "*",
      validate: (value) => {
        return !this.#keyring.isValidatePassword(value)
          ? "Password is incorrect. Please try again."
          : true;
      },
      theme: {
        prefix: this.#formatPrefix(),
      },
    });

    const newAddress = await this.#keyring.addAddress(enterPassword);
    console.log(
      "New address: ",
      this.#format.format(newAddress, FormatType.SUCCESS, true),
    );

    this.#namespaces.pop();
  }

  async handleGetAllAddresses(_: { [key: string]: string }) {
    if (!this.#keyring.isExitSeed()) {
      console.log(
        this.#format.format("\nWallet not found!\n", FormatType.ERROR, true),
      );

      return;
    }

    const addresses = this.#keyring.getAddresses();

    addresses.forEach((address: string, index: number) => {
      console.log(
        "(",
        index + 1,
        "):",
        this.#format.format(address, FormatType.SUCCESS, true),
      );
    });
  }

  async handleFetchBalance(args: { [key: string]: string }) {
    if (!this.#keyring.isExitSeed()) {
      console.log(
        this.#format.format("\nWallet not found!\n", FormatType.ERROR, true),
      );

      return;
    }
    const activeAddress = this.#keyring.getActiveAddress();
    const userBalance = await this.#chain.fetchBalance(
      "0x4fff0f708c768a46050f9b96c46c265729d1a62f",
    );

    const currencySymbol = this.#chain.currencySymbol();
    const currencyDecimal = this.#chain.currencyDecimal();

    console.log(
      "Balance",
      this.#format.format(
        formatUnits(userBalance, currencyDecimal),
        FormatType.SUCCESS,
        true,
      ),
      currencySymbol,
    );
  }

  async handleFetchPortfolio(args: { [key: string]: string }) {
    console.log("Fetch portfolio");
  }

  async handleGetInfo(_: { [key: string]: string }) {
    if (!this.#keyring.isExitSeed()) {
      console.log(
        this.#format.format("\nWallet not found!\n", FormatType.ERROR, true),
      );

      return;
    }
    const activeChain = this.#chain.getActiveChain();
    console.log(
      "Active chain: ",
      this.#format.format(activeChain, FormatType.SUCCESS, true),
    );
    const activeAddress = this.#keyring.getActiveAddress();
    console.log(
      "Active address: ",
      this.#format.format(activeAddress, FormatType.SUCCESS, true),
    );
  }

  async handleGetActiveChain(_: { [key: string]: string }) {
    const activeChain = this.#chain.getActiveChain();
    console.log(
      "Active chain: ",
      this.#format.format(activeChain, FormatType.SUCCESS, true),
    );
  }

  async handleGetChains(_: { [key: string]: string }) {
    const totalChains = this.#chain.totalSupportedChains();
    console.log(
      "Support",
      totalChains,
      "chains. See",
      this.#format.format(
        "https://github.com/wevm/viem/blob/main/src/chains/index.ts",
        FormatType.INFO,
        true,
      ),
      "for full list.",
    );
  }

  async handleClearTerminal(_: { [key: string]: string }) {
    console.clear();
  }

  async handleTransfer(args: { [key: string]: string }) {
    this.#namespaces.push("Send");
    if (!this.#keyring.isExitSeed()) {
      console.log(
        this.#format.format(
          "\n     Wallet not found!\n",
          FormatType.ERROR,
          true,
        ),
      );

      return;
    }

    if (args["receiver"] === undefined) {
      if (args["r"] === undefined) {
        const data = await input({
          message: "Enter receiver address:",
          // TODO validate address format || exit
          theme: {
            prefix: this.#formatPrefix(),
          },
        });
        if (data === "exit") {
          this.#namespaces.pop();
          return;
        }
        args["receiver"] = data;
      } else {
        args["receiver"] = args["r"];
      }
    }

    if (args["token"] === undefined) {
      if (args["t"] === undefined) {
        const data = await input({
          message: "Select token to transfer:",
          // TODO validate address format
          theme: {
            prefix: this.#formatPrefix(),
          },
        });
        if (data === "exit") {
          this.#namespaces.pop();
          return;
        }
        args["token"] = data;
      } else {
        args["token"] = args["t"];
      }
    }

    if (args["amount"] === undefined) {
      if (args["a"] === undefined) {
        const data = await input({
          message: "Select asset to transfer:",
          // TODO validate address format
          theme: {
            prefix: this.#formatPrefix(),
          },
        });
        if (data === "exit") {
          this.#namespaces.pop();
          return;
        }
        args["asset"] = data;
      } else {
        args["asset"] = args["a"];
      }
    }

    args["value"] = await input({
      message: "Enter amount to transfer:",
      // TODO validate number
      theme: {
        prefix: this.#formatPrefix(),
      },
    });

    console.log(args);

    console.log("Send");
    this.#namespaces.pop();
  }
}
