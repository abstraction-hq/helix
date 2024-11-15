#!/usr/bin/env node
import { Command } from 'commander';

export default (program: Command) => {
  program
    .command('create-wallet')
    .alias("cw")
    .description('Create a new wallet')
    .action((options) => {
    });
};
