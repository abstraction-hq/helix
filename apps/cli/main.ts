#!/usr/bin/env node
import readline from "readline";
import { KeyringEngine } from "@helix/keyring";
import { FormatEngine, FormatType } from "@helix/format";

type CommandHandler = (args: string[]) => void;

interface Command {
  handler: CommandHandler;
  description: string;
}

class HelixTerminal {
  #rl: readline.Interface;
  #commands: Map<string, Command>;

  // engines
  #keyring: KeyringEngine;
  #format: FormatEngine;

  constructor() {
    this.#rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "Helix > ",
    });

    this.#commands = new Map<string, Command>();

    // Initialize engines
    this.#keyring = new KeyringEngine();
    this.#format = new FormatEngine();

    // Register commands
    this.#registerCommands();
  }

  #precheckWalletExited(): boolean {
    if (!this.#keyring.isExitSeed()) {
      console.log(
        `No seed found. Type '${this.#format.format("create", FormatType.SUCCESS, true)}' to create new seed or '${this.#format.format("import", FormatType.SUCCESS, true)}' to import exited seed.`,
      );
      return false;
    }
    return true;
  }

  #asyncPrompt(question: string, hideInput = false): Promise<string> {
    return new Promise(async (resolve) => {
      this.#rl.question(question, (answer) => resolve(answer.trim()));
    });
  }

  start() {
    this.#keyring.testEncryptDecrypt();
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
    this.#precheckWalletExited();
    this.#rl.prompt();

    this.#rl.on("line", (line: string) => {
      const [command, ...args] = line.trim().split(/\s+/);

      if (!command) {
        console.log(`No command entered. Type '${this.#format.format("help", FormatType.DEFAULT, true)}' for a list of commands.`);
        this.#rl.prompt();
        return;
      }

      const cmd = this.#commands.get(command);
      if (cmd) {
        cmd.handler.call(this, args);
      } else {
        console.error(
          `Unknown command: '${this.#format.format(command, FormatType.DEFAULT, true)}'. Type '${this.#format.format("help", FormatType.DEFAULT, true)}' for a list of commands.`,
        );
      }
      this.#rl.prompt();
    });

    this.#rl.on("close", () => {
      console.log("Exiting Helix terminal. Goodbye!");
      process.exit(0);
    });
  }

  #registerCommands() {
    this.#registerCommand("help", this.#displayHelp, "Show this help message.");
    this.#registerCommand(
      "balance",
      this.#getBalance,
      "Check the balance of your wallet.",
    );
    this.#registerCommand(
      "send",
      this.#sendCrypto,
      "Send cryptocurrency to an address.",
    );
    this.#registerCommand("create", this.#createWallet, "Create new wallet.");
    this.#registerCommand("exit", this.#exit, "Exit the Helix terminal.");
    // Add more commands here
  }

  #registerCommand(name: string, handler: CommandHandler, description: string) {
    this.#commands.set(name, { handler, description });
  }

  #displayHelp(args: string[]) {
    console.log("\nAvailable commands:");
    this.#commands.forEach((command, name) => {
      console.log(`  ${name.padEnd(20)} ${command.description}`);
    });
    console.log("\nType 'help <command>' for more details about a command.");
  }

  async #createWallet(args: string[]) {
    console.log("Creating a new wallet...");
    const password = await this.#asyncPrompt(
      "Create a password for your wallet: ",
      true,
    );
    const confirmPassword = await this.#asyncPrompt("Confirm your password: ");

    if (password !== confirmPassword) {
      console.log(
        this.#format.format(
          "Passwords do not match. Wallet creation aborted.",
          FormatType.ERROR,
        ),
      );
      return;
    }

    const seed = this.#keyring.generateNewSeeds();
    console.log("New Seed Generated");
    console.log(this.#format.format(`     ${seed}`, FormatType.INFO, true));

    let isSaveAnswer = "";

    while (isSaveAnswer !== "yes") {
      isSaveAnswer = await this.#asyncPrompt(
        `Please save your seed and don't share it with anyone? (type ${this.#format.format("create", FormatType.SUCCESS, true)} to confirm): `,
      );
    }

    this.#keyring.persistSeed(seed, password);

    console.log("New wallet created!");
  }

  #getBalance(args: string[]) {
    // Replace with actual wallet balance logic
    console.log("Fetching balance... (example: 2.34 ETH)");
  }

  #sendCrypto(args: string[]) {
    if (args.length !== 2) {
      console.log("Usage: send <amount> <to>");
      return;
    }

    const [amount, address] = args;
    console.log(`Sending ${amount} to ${address}...`);
  }

  #exit(args: string[]) {
    this.#rl.close();
  }
}

// Start the terminal
const terminal = new HelixTerminal();
terminal.start();
