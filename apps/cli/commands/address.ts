#!/usr/bin/env node
import { Command } from 'commander';

export default (program: Command) => {
  program
    .command('address')
    .alias("a")
    .description('Get current active address')
    .action((options) => {
    });
};
