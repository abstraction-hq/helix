#!/usr/bin/env node
import { Command } from "commander";
import { addWalletCommands } from "./cmd/wallet";

const program = new Command();

program
  .name('helix')
  .description('Most powerful cli wallet. Built by developers for developers')
  .version('1.0.0');


addWalletCommands(program);

program.parse(process.argv);
