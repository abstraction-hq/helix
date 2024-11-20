#!/usr/bin/env node
import 'module-alias/register';

import { FormatEngine } from "@format/index";
import { StorageEngine } from "@storage/index";
import { KeyringEngine } from "@keyring/index";
import { CryptoEngine } from "@crypto/index";
import { NetworkEngine } from "@network/index";

import { HelixCLI } from "@cli/index";

async function main() {
  // init engines
  const storage = await StorageEngine.getInstance();
  const crypto = new CryptoEngine();
  const format = new FormatEngine();
  const keyring = new KeyringEngine(storage, crypto);
  const network = new NetworkEngine();

  const cli = new HelixCLI(storage, format, keyring, network);

  cli.start();
}

main();
