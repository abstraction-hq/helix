import { defineChain } from "viem";

export const victionTestnet = defineChain({
  id: 89,
  name: "Viction Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Viction",
    symbol: "VIC",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc-testnet.viction.xyz"],
      webSocket: ["wss://ws-testnet.viction.xyz"],
    },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://testnet.vicscan.xyz" },
  },
  testnet: true,
});

export { mainnet, sepolia, holesky } from "viem/chains";

export const dataLayer = victionTestnet;
