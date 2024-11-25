#!/usr/bin/env node
import { Command } from 'commander'; 
import { input, password } from "@inquirer/prompts";
import { formatUnits, isAddress, Address } from "viem";
import { FormatEngine, FormatType } from "../format/index.js";
import { KeyringEngine } from "../keyring/index.js";
import { ChainEngine } from "../chain/index.js";
import { TokenEngine } from "../token/index.js";
import packageJson from '../package.json' assert {type: 'json'};

type CommandHandler = (args: { [key: string]: string }) => Promise<void>;

export class HelixCLI {
  #program: Command;

  // engines
  #format: FormatEngine;
  #keyring: KeyringEngine;
  #chain: ChainEngine;
  #token: TokenEngine;

  constructor(
    format: FormatEngine,
    keyring: KeyringEngine,
    chain: ChainEngine,
    token: TokenEngine,
  ) {
    this.#format = format;
    this.#keyring = keyring;
    this.#chain = chain;
    this.#token = token;

    this.#program = new Command();

    this.#program
      .name('helix')
      .description('Helix Crypto Wallet Terminal')
      .version(packageJson.version);

    // register command
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
      this.handleGetAllAddresses.bind(this),
      "Get wallet address",
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
      "tokens",
      this.handleListTokens.bind(this),
      "Get all tokens",
    );
    this.#registerCommand(
      "add-token",
      this.handleAddToken.bind(this),
      "Add custom token",
    );
    this.#registerCommand(
      "remove-token",
      this.handleRemoveToken.bind(this),
      "Remove custom token",
    );
  }

  #registerCommand(name: string, handler: CommandHandler, description: string) {
    this.#program.command(name).description(description).action(handler)
  }

  public start() {
    this.#program.parse(process.argv);
  }

  async handleImportWallet(_: { [key: string]: string }) {
    if (this.#keyring.isExitSeed()) {
      console.log(this.#format.format("Wallet exited!", FormatType.INFO, true));

      return;
    }
    const enterPassword = await password({
      message: "Enter a password for your wallet:",
      mask: "*",
      validate: (value) => {
        return value.length < 8
          ? "Password must be at least 8 characters"
          : true;
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
    });

    const seed = await password({
      message: `Input your seed phrase:`,
      mask: "*",
      validate: (value) => {
        return this.#keyring.isValidMnemonic(value)
          ? true
          : "Invalid seed format";
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
  }

  async handleCreateWallet(_: { [key: string]: string }) {
    if (this.#keyring.isExitSeed()) {
      console.log(this.#format.format("Wallet exited!", FormatType.INFO, true));

      return;
    }
    const enterPassword = await password({
      message: "Enter a password for your wallet:",
      mask: "*",
      validate: (value) => {
        return value.length < 8
          ? "Password must be at least 8 characters"
          : true;
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
    const enterPassword = await password({
      message: "Enter a password to unlock your wallet:",
      mask: "*",
      validate: (value) => {
        return !this.#keyring.isValidatePassword(value)
          ? "Password is incorrect. Please try again."
          : true;
      },
    });

    const newAddress = await this.#keyring.addAddress(enterPassword);
    console.log(
      "New address: ",
      this.#format.format(newAddress, FormatType.SUCCESS, true),
    );

  }

  async handleGetAllAddresses(_: { [key: string]: string }) {
    if (!this.#keyring.isExitSeed()) {
      console.log(
        this.#format.format("\nWallet not found!\n", FormatType.ERROR, true),
      );

      return;
    }

    const addresses = this.#keyring.getAddresses();
    const activeAddress = this.#keyring.getActiveAddress();

    addresses.forEach((address: string, index: number) => {
      console.log(
        "(",
        index + 1,
        "):",
        activeAddress == address ? this.#format.format(address, FormatType.SUCCESS, true) : address,
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
    if (!this.#keyring.isExitSeed()) {
      console.log(
        this.#format.format("Wallet not found!", FormatType.ERROR, true),
      );

      return;
    }

    if (args["receiver"] === undefined) {
      if (args["r"] === undefined) {
        const data = await input({
          message: "Enter receiver address:",
          // TODO validate address format || exit
        });
        if (data === "exit") {
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
        });
        if (data === "exit") {
          return;
        }
        args["token"] = data;
      } else {
        args["token"] = args["t"];
      }
    }

    args["value"] = await input({
      message: "Enter amount to transfer:",
      // TODO validate number
    });

    console.log(args);

    console.log("Send");
  }

  async handleAddToken(args: { [key: string]: string }) {
    if (!this.#keyring.isExitSeed()) {
      console.log(
        this.#format.format("Wallet not found!", FormatType.ERROR, true),
      );
      return;
    }
    const token = (await input({
      message: "Enter token address:",
      validate: (value) => (isAddress(value) ? true : "Invalid address format"),
    })) as Address;

    const activeWallet = this.#keyring.getActiveAddress();
    const tokenDetails = await this.#chain.fetchTokenDetails(
      token,
      activeWallet,
    );
    console.log(tokenDetails);
  }

  async handleRemoveToken(args: { [key: string]: string }) {
    console.log("Remove token");
  }

  async handleListTokens(args: { [key: string]: string }) {
    console.log("List token");
  }
}
