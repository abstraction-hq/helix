#!/usr/bin/env node --no-warnings
import { FormatEngine, FormatType } from "./format/index.js";
import { StorageEngine } from "./storage/index.js";
import { KeyringEngine } from "./keyring/index.js";
import { CryptoEngine } from "./crypto/index.js";
import { ChainEngine } from "./chain/index.js";
import { TokenEngine } from "./token/index.js";

import { HelixCLI } from "./cli/index.js";

import updateNotifier from "update-notifier";
import packageJson from "./package.json" assert { type: "json" };

updateNotifier({ pkg: packageJson }).notify();

async function main() {
  // init engines
  const storage = await StorageEngine.getInstance();
  const crypto = new CryptoEngine();
  const format = new FormatEngine();
  const keyring = new KeyringEngine(storage, crypto);
  const chain = new ChainEngine(storage);
  const token = new TokenEngine(storage);

  const cli = new HelixCLI(format, keyring, chain, token);
  cli.start()
}

main();
