// wallet.ts
import { Command } from 'commander';

export function addWalletCommands(program: Command) {
  const wallet = program.command('wallet').description('Manage wallets');

  wallet
    .command('create')
    .description('Create a new wallet')
    .action(() => {
      console.log('New wallet created!');
      // Add logic for wallet creation here
    });

  wallet
    .command('address')
    .description('Get wallet address')
    .action(() => {
      console.log('Your wallet address: 0x1234...');
      // Add logic to fetch and display the wallet address here
    });

  wallet
    .command('send')
    .description('Send cryptocurrency to another address')
    .option('-a, --amount <amount>', 'Amount to send')
    .option('-r, --recipient <recipient>', 'Recipient address')
    .action((options) => {
      if (!options.amount || !options.recipient) {
        console.error('Error: Both amount and recipient are required.');
        process.exit(1);
      }
      console.log(`Sending ${options.amount} ETH to ${options.recipient}`);
      // Add logic to send ETH here
    });

  wallet
    .command('send-token')
    .description('Send a token to another address')
    .option('-t, --token <token>', 'Token name or address')
    .option('-a, --amount <amount>', 'Amount to send')
    .option('-r, --recipient <recipient>', 'Recipient address')
    .action((options) => {
      if (!options.token || !options.amount || !options.recipient) {
        console.error('Error: Token, amount, and recipient are required.');
        process.exit(1);
      }
      console.log(
        `Sending ${options.amount} of ${options.token} to ${options.recipient}`
      );
      // Add logic to send tokens here
    });
}
