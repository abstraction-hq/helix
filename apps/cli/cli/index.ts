#!/usr/bin/env node
import { FormatEngine, FormatType } from "@helix/format";
import { StorageEngine } from "@helix/storage";
import { KeyringEngine } from "@helix/keyring";
import { NetworkEngine } from "@helix/network";
import { input, password, rawlist } from "@inquirer/prompts";

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
  #storage: StorageEngine;
  #keyring: KeyringEngine;
  #network: NetworkEngine;

  constructor(
    storage: StorageEngine,
    format: FormatEngine,
    keyring: KeyringEngine,
    network: NetworkEngine,
  ) {
    this.#format = format;
    this.#storage = storage;
    this.#keyring = keyring;
    this.#network = network;

    this.#commands = new Map<string, Command>();
    // register command
    this.#registerCommand(
      "help",
      this.handleHelp.bind(this),
      "Print all available commands",
    );
    this.#registerCommand(
      "create",
      this.handleCreateWallet.bind(this),
      "Create a new wallet",
    );
    this.#registerCommand(
      "address",
      this.handleGetAllAddresses.bind(this),
      "Get addresses list",
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
      "send",
      this.handleSend.bind(this),
      "Send transaction",
    );
    this.#registerCommand(
      "balance",
      this.handleFetchBalance.bind(this),
      "Fetch balance",
    );
    this.#registerCommand(
      "networks",
      this.handleGetNetworks.bind(this),
      "Get all networks",
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
      console.error(
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
    console.log("\nAvailable commands:");
    this.#commands.forEach((command, name) => {
      console.log(`  ${name.padEnd(20)} ${command.description}`);
    });
    console.log("\nType 'help <command>' for more details about a command.");
  }

  async handleCreateWallet(_: { [key: string]: string }) {
    if (this.#keyring.isExitSeed()) {
      console.log(
        this.#format.format("\n     Wallet exited!\n", FormatType.INFO, true),
      );

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
        this.#format.format(
          "\n     Wallet not found!\n",
          FormatType.ERROR,
          true,
        ),
      );

      return;
    }
    const storage = this.#storage.getData();
    console.log(
      "\n     Active address: ",
      this.#format.format(
        storage?.defaultAddress?.evm || "",
        FormatType.SUCCESS,
        true,
      ),
      "\n",
    );
  }

  async handleSetDefaultAddress(args: { [key: string]: string }) {
    console.log("set address");
  }

  async handleAddAddress(args: { [key: string]: string }) {
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
      "\n     New address: ",
      this.#format.format(newAddress, FormatType.SUCCESS, true),
      "\n",
    );
  }

  async handleGetAllAddresses(_: { [key: string]: string }) {
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

    const data = this.#storage.getData();
    console.log("\n     Addresses: ");

    data.addresses.evm.forEach((address: string, index: number) => {
      console.log(
        "       (",
        index + 1,
        "):",
        this.#format.format(address, FormatType.SUCCESS, true),
        index == data.addresses.evm.length - 1 ? "\n" : "",
      );
    });
  }

  async handleFetchBalance(args: { [key: string]: string }) {
    console.log("Fetch balance");
  }

  async handleFetchPortfolio(args: { [key: string]: string }) {
    console.log("Fetch portfolio");
  }

  async handleGetNetworks(_: { [key: string]: string }) {
    const totalNetworks = this.#network.totalSupportedNetworks();
    console.log(
      "\n     Support",
      totalNetworks,
      "netwoks. See",
      this.#format.format(
        "https://github.com/wevm/viem/blob/main/src/chains/index.ts",
        FormatType.INFO,
        true,
      ),
      "for full list.\n",
    );
  }

  async handleClearTerminal(_: { [key: string]: string }) {
    console.clear();
  }

  async handleGetDefaultNetwork(args: { [key: string]: string }) {
    console.log("Get default networks");
  }

  async handleChangeNetwork(args: { [key: string]: string }) {
    console.log("change networks");
  }

  async handleSetDefaultNetwork(args: { [key: string]: string }) {
    console.log("set network");
  }

  async handleSend(args: { [key: string]: string }) {
    this.#namespaces.push("send (type 'exit' on any prompt to exit)");
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

    if (args["network"] === undefined) {
      if (args["n"] === undefined) {
        const data = await input({
          message: "Enter network name:",
          validate: (value) =>
            this.#network.isSupportedNetwork(value) || value === "exit"
              ? true
              : `Network not supported, see ${this.#format.format("networks", FormatType.INFO, true)} for full list`,
          theme: {
            prefix: this.#formatPrefix(),
          },
        });
        if (data === "exit") {
          this.#namespaces.pop();
          return;
        }
        args["network"] = data;
      } else {
        args["network"] = args["n"];
      }
    }

    if (args["from"] === undefined) {
      if (args["f"] === undefined) {
        const data = await rawlist({
          message: "Select from wallet:",
          choices: this.#storage
            .getData()
            .addresses.evm.map((address: string, index: number) => ({
              value: index + 1,
              name: address,
            }))
            .concat({ value: "exit", name: "Exit" }),
          theme: {
            prefix: this.#formatPrefix(),
          },
        });
        if (data === "exit") {
          this.#namespaces.pop();
          return;
        }
        args["from"] = data as string;
      } else {
        args["from"] = args["f"];
      }
    }

    if (args["to"] === undefined) {
      if (args["t"] === undefined) {
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
        args["to"] = data;
      } else {
        args["to"] = args["t"];
      }
    }

    if (args["data"] === undefined) {
      if (args["d"] === undefined) {
        const data = await input({
          message: "Enter calldata:",
          // TODO validate address format
          theme: {
            prefix: this.#formatPrefix(),
          },
        });
        if (data === "exit") {
          this.#namespaces.pop();
          return;
        }
        args["data"] = data;
      } else {
        args["data"] = args["d"];
      }
    }

    console.log(args);

    console.log("Send");
    this.#namespaces.pop();
  }
}
