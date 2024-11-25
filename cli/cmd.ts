import { Command } from 'commander';
import packageJson from '../package.json' assert {type: 'json'};

export class HelixCLI {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupCommands();
  }

  private getVersion(): string {
    return packageJson.version;
  }

  private setupCommands() {
    this.program
      .name('helix')
      .description('Helix Crypto Wallet Terminal')
      .version(this.getVersion());

    // Add commands
    this.program
      .command('balance')
      .description('Check your wallet balance')
      .action(() => this.showBalance());

    this.program
      .command('send')
      .description('Send crypto to another wallet')
      .requiredOption('-a, --address <address>', 'Recipient address')
      .requiredOption('-v, --value <value>', 'Amount to send')
      .action((options) => this.sendCrypto(options));

    this.program
      .command('history')
      .description('Show transaction history')
      .action(() => this.showHistory());

    this.program
      .command('exit')
      .description('Exit the Helix terminal')
      .action(() => this.exit());
  }

  private showBalance() {
    console.log('Fetching your wallet balance...');
    // Logic to fetch and display the balance
    console.log('Your balance is: 10.5 ETH');
  }

  private sendCrypto(options: { address: string; value: string }) {
    console.log(`Sending ${options.value} ETH to ${options.address}...`);
    // Logic to send crypto
    console.log('Transaction completed successfully.');
  }

  private showHistory() {
    console.log('Fetching your transaction history...');
    // Logic to fetch and display transaction history
    console.log('Transaction history:');
    console.log('- Sent 1 ETH to 0x123... on 2024-11-24');
    console.log('- Received 0.5 ETH from 0x456... on 2024-11-23');
  }

  private exit() {
    console.log('Exiting Helix Crypto Wallet Terminal. Goodbye!');
    process.exit(0);
  }

  public start() {
    this.program.parse(process.argv);
  }
}

