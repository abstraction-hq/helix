#!/usr/bin/env node
import { FormatEngine, FormatType } from "@helix/format";
import { input } from "@inquirer/prompts";

type CommandHandler = (args: string[]) => Promise<void>;

interface Command {
  handler: CommandHandler;
  description: string;
}

class HelixCLI {
  #namespaces: string[] = [];
  #commands: Map<string, Command>;
  // engines
  #format: FormatEngine;

  constructor() {
    this.#format = new FormatEngine();

    this.#commands = new Map<string, Command>();
    // register command
    //
    this.#registerCommand("help", this.handleHelp.bind(this), "Print all available commands");
    this.#registerCommand("create", this.handleCreateWallet.bind(this), "Create a new wallet");
    this.#registerCommand("address", this.handleGetDefaultAddress.bind(this), "Get default address");
    this.#registerCommand("addresses", this.handleGetAllAddresses.bind(this), "Get all addresses created");
    this.#registerCommand("set-address", this.handleSetDefaultAddress.bind(this), "Set default address");
    this.#registerCommand("add-address", this.handleAddAddress.bind(this), "Add address");
    this.#registerCommand("send", this.handleSend.bind(this), "Send transaction");
    this.#registerCommand("balance", this.handleFetchBalance.bind(this), "Fetch balance");
    this.#registerCommand("port", this.handleFetchPortfolio.bind(this), "Fetch portfolio");
    this.#registerCommand("networks", this.handleGetNetworks.bind(this), "Get all networks");
    this.#registerCommand("network", this.handleGetDefaultNetwork.bind(this), "Get default networks");
    this.#registerCommand("set-network", this.handleSetDefaultNetwork.bind(this), "Set default network");
  }

  #registerCommand(name: string, handler: CommandHandler, description: string) {
    this.#commands.set(name, { handler, description });
  }

  #formatPrefix() {
    let prefix =
      this.#format.format("# Helix wallet ", FormatType.SUCCESS, true) + " >";
    for (const namespace of this.#namespaces) {
      prefix +=
        " " + this.#format.format(namespace, FormatType.INFO, true) + " >";
    }
    return prefix;
  }

  #styleAnswer(text: string) {
    const commandSplit = text.split(" ");
    const cmd = this.#commands.get(commandSplit[0] as string);
    if (!cmd) {
      return this.#format.format(text, FormatType.ERROR, false);
    } else {
      return this.#format.format(text, FormatType.SUCCESS, false);
    }
  }

  async #handleAnswer(command: string) {
    if (command.length == 0) {
      return;
    }
    const commandSplit = command.split(" ");
    const cmd = this.#commands.get(commandSplit[0] as string);

    if (cmd) {
      await cmd.handler(commandSplit);
    } else {
      console.error(
        `Unknown command: '${this.#format.format(command, FormatType.ERROR, true)}'. Type '${this.#format.format("help", FormatType.DEFAULT, true)}' for a list of commands.`,
      );
    }
  }

  #handleExit() {
    console.log("Exit the Helix CLI.");
  }

  async #loop() {
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
        this.#handleExit();
        break;
      }
    }
  }

  start() {
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
    this.#loop();
  }

  async handleHelp(args: string[]) {
    console.log("\nAvailable commands:");
    this.#commands.forEach((command, name) => {
      console.log(`  ${name.padEnd(20)} ${command.description}`);
    });
    console.log("\nType 'help <command>' for more details about a command.");
  }

  async handleCreateWallet(args: string[]) {
    console.log("Create wallet");
  }

  async handleGetDefaultAddress(args: string[]) {
    console.log("Get address");
  }

  async handleSetDefaultAddress(args: string[]) {
    console.log("set address");
  }

  async handleAddAddress(args: string[]) {
    console.log("add address");
  }

  async handleGetAllAddresses(args: string[]) {
    console.log("Get addresses");
  }

  async handleFetchBalance(args: string[]) {
    console.log("Fetch balance");
  }

  async handleFetchPortfolio(args: string[]) {
    console.log("Fetch portfolio");
  }

  async handleGetNetworks(args: string[]) {
    console.log("Get networks");
  }

  async handleGetDefaultNetwork(args: string[]) {
    console.log("Get default networks");
  }

  async handleChangeNetwork(args: string[]) {
    console.log("change networks");
  }

  async handleSetDefaultNetwork(args: string[]) {
    console.log("set network");
  }

  async handleSend(args: string[]) {
    console.log("Send");
  }
}

const cli = new HelixCLI();

cli.start();
