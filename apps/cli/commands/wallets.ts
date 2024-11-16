import { Command } from "./types";

export const walletCommands: Command[] = [
  {
    name: "balance",
    description: "Check the balance of your wallet.",
    handler: (args: string[]) => {
      // Replace with actual balance logic
      console.log("Fetching balance... (example: 2.34 ETH)");
    },
  },
  {
    name: "send",
    description: "Send cryptocurrency to an address.",
    handler: (args: string[]) => {
      if (args.length !== 2) {
        console.log("Usage: send <amount> <to>");
        return;
      }
      const [amount, address] = args;
      console.log(`Sending ${amount} to ${address}...`);
    },
  },
];
