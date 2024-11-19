#!/usr/bin/env node
import { FormatEngine } from "@helix/format";
import { StorageEngine } from "@helix/storage";
import { KeyringEngine } from "@helix/keyring";
import { CryptoEngine } from "@helix/crypto";
import { NetworkEngine } from "@helix/network";

import { HelixCLI } from "./cli";

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
