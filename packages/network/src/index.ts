#!/usr/bin/env node
import * as chains from "viem/chains";

export class NetworkEngine {
  constructor() {}

  totalSupportedNetworks(): number {
    return Object.keys(chains).length;
  }

  isSupportedNetwork(network: string): boolean {
    return (chains as any)[network] !== undefined;
  }
}
