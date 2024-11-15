#!/usr/bin/env node
import { Command } from 'commander';
import { WalletEngine } from "@helix/engine"

export default (program: Command) => {
  program
    .command('create')
    .alias("c")
    .description('Create a new wallet')
    .action((options) => {
      console.log("Wallet engine", WalletEngine);
    });
};
