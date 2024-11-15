// network.ts
import { Command } from 'commander';

export function addNetworkCommands(program: Command) {
  const network = program.command('network').description('Manage networks');

  network
    .command('add')
    .description('Add a new network')
    .option('-n, --name <name>', 'Network name')
    .option('-u, --url <url>', 'Network RPC URL')
    .action((options) => {
      if (!options.name || !options.url) {
        console.error('Error: Both network name and RPC URL are required.');
        process.exit(1);
      }
      console.log(`Added network: ${options.name} with URL: ${options.url}`);
      // Add logic to save the network details
    });

  network
    .command('remove')
    .description('Remove an existing network')
    .option('-n, --name <name>', 'Network name')
    .action((options) => {
      if (!options.name) {
        console.error('Error: Network name is required.');
        process.exit(1);
      }
      console.log(`Removed network: ${options.name}`);
      // Add logic to remove the network
    });

  network
    .command('update')
    .description('Update an existing network')
    .option('-n, --name <name>', 'Network name')
    .option('-u, --url <url>', 'New network RPC URL')
    .action((options) => {
      if (!options.name || !options.url) {
        console.error('Error: Both network name and new RPC URL are required.');
        process.exit(1);
      }
      console.log(`Updated network: ${options.name} with new URL: ${options.url}`);
      // Add logic to update the network details
    });
}
