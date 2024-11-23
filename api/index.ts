import axios from "axios";

const API_ENDPOINT = "https://api.rabby.io/v1/user";

export class APIEngine {
  #apiEndpoint: string;
  constructor(apiEndpoint?: string) {
    this.#apiEndpoint = apiEndpoint || API_ENDPOINT;
  }

  async getUserBalance(address: string, chain: string): Promise<unknown> {
    try {
      const token = await axios.get(
        `${this.#apiEndpoint}/token_list?chain=${chain}&id=${address}&is_all=true`,
      );
      return token.data;
    } catch (error) {
      console.log(error);
    }
  }
}
