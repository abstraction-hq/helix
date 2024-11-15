#!/usr/bin/env node
import sendCmd from "./send";
import createWalletCmd from "./createWallet";

export default [
  createWalletCmd,
  sendCmd,
];

