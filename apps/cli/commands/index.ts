#!/usr/bin/env node
import sendCmd from "./send";
import createWalletCmd from "./createWallet";
import addressCmd from "./address";

export default [
  createWalletCmd,
  addressCmd,
  sendCmd,
];

