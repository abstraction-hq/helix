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
}

const cli = new HelixCLI();

cli.start();
