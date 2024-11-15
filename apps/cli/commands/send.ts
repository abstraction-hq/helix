#!/usr/bin/env node
import { Command } from 'commander';

export default (program: Command) => {
  program
    .command('send')
    .alias('s')
    .description('Send cryptocurrency or tokens to another address')
    .option('-a, --amount <amount>', 'Amount to send')
    .option('-r, --recipient <recipient>', 'Recipient address')
    .option('-t, --token <token>', 'Token contract address (optional for ETH)')
    .action((options) => {
      if (!options.amount || !options.recipient) {
        console.error('Error: Amount and recipient are required.');
        process.exit(1);
      }
      const tokenInfo = options.token
        ? `Token contract: ${options.token}`
        : 'Native cryptocurrency';
      console.log(
        `Sending ${options.amount} to ${options.recipient}. ${tokenInfo}`
      );
    });
};
