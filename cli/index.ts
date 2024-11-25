#!/usr/bin/env node
import { Command } from "commander";
import { input, password, rawlist } from "@inquirer/prompts";
import { formatUnits, isAddress, Address } from "viem";
import { FormatEngine, FormatType } from "../format/index.js";
import { KeyringEngine } from "../keyring/index.js";
import { ChainEngine } from "../chain/index.js";
import { TokenEngine } from "../token/index.js";
import packageJson from "../package.json" assert { type: "json" };

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
      .name("helix")
      .description("Helix Crypto Wallet Terminal")
      .version(packageJson.version);

    this.#registerCommands();
  }

  #registerCommands() {
    this.#program
      .command("create")
      .description("Create a new wallet")
      .action(this.handleCreateWallet.bind(this));
    this.#program
      .command("import")
      .description("Import exited wallet")
      .action(this.handleImportWallet.bind(this));
    this.#program
      .command("address")
      .description("Get wallet address")
      .action(this.handleGetAllAddresses.bind(this));
    this.#program
      .command("add-address")
      .description("Add address")
      .action(this.handleAddAddress.bind(this));
    this.#program
      .command("set-address")
      .description("Set active address")
      .action(this.handleSetActiveAddress.bind(this));
    this.#program
      .command("transfer")
      .description("Transfer cryptocurrency")
      .action(this.handleTransfer.bind(this));
    this.#program
      .command("balance")
      .description("Fetch balance")
      .action(this.handleFetchBalance.bind(this));
    this.#program
      .command("chain")
      .description("Get all chains")
      .action(this.handleGetChains.bind(this));
    this.#program
      .command("set-chain")
      .description("Set active chain")
      .action(this.handleSetActiveChain.bind(this));
    this.#program
      .command("tokens")
      .description("Get all tokens")
      .action(this.handleListTokens.bind(this));
    this.#program
      .command("add-token")
      .description("Add custom token")
      .action(this.handleAddToken.bind(this));
    this.#program
      .command("remove-token")
      .description("Remove custom token")
      .action(this.handleRemoveToken.bind(this));
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
      this.#format.format("New Seed Generated:", FormatType.SUCCESS, false),
      this.#format.format(seed, FormatType.INFO, true),
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
        "Create wallet successfully!",
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

  async handleAddAddress(_: { [key: string]: string }) {
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

  async handleSetActiveAddress(_: { [key: string]: string }) {
    if (!this.#keyring.isExitSeed()) {
      console.log(
        this.#format.format("Wallet not found!", FormatType.ERROR, true),
      );

      return;
    }

    const selectedAddress = (await rawlist({
      message: "Select from wallet:",
      choices: this.#keyring.getAddresses().map((address: string) => address),
    })) as string;

    await this.#keyring.setActiveAddress(selectedAddress);
    console.log("Set active address successfully!");
  }

  async handleGetAllAddresses(_: { [key: string]: string }) {
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
          ? this.#format.format(address, FormatType.SUCCESS, true)
          : address,
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
    const acitveChain = this.#chain.getActiveChain();
    console.log(
      "Active chain: ",
      this.#format.format(acitveChain, FormatType.SUCCESS, true),
    );
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

  async handleSetActiveChain(_: { [key: string]: string }) {
    const selectedChain = await input({
      message: "Select chain to set active:",
      // TODO validate chain name
      validate: (value) =>
        this.#chain.isSupportedChain(value)
          ? true
          : `Chain not supported, See ${this.#format.format(
              "https://github.com/wevm/viem/blob/main/src/chains/index.ts",
              FormatType.INFO,
              true,
            )} for full list.`,
    });

    await this.#chain.saveActiveChain(selectedChain);

    console.log("Set active chain successfully!");
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
