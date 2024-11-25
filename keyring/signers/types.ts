export interface IKeypair {
  address: string;
  publicKey: string;
  privateKey: string;
}

export interface ISigner {
  signMessage(
    message: string,
    keypair: IKeypair,
    options?: unknown,
  ): Promise<string>;
  generateKeypair(
    mnemonic: string,
    index: number,
    options?: unknown,
  ): Promise<IKeypair>;
}
