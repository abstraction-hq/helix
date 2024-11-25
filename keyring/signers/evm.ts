import { IKeypair, ISigner } from "./types.js";

export class EVMSigner implements ISigner {
  async signMessage(
    message: string,
    keypair: IKeypair,
    options?: unknown,
  ): Promise<string> {
    return "";
  }
  async generateKeypair(
    mnemonic: string,
    index: number,
    options?: unknown,
  ): Promise<IKeypair> {
    return {
      address: "",
      publicKey: "",
      privateKey: "",
    };
  }
}
