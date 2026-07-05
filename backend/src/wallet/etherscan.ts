import axios from "axios";
import { config } from "../config";

export interface EtherscanTx {
  hash: string;
  from: string;
  to: string;
  value: string; // smallest unit (wei for ETH, token units for ERC20)
  confirmations: string;
  tokenDecimal?: string;
  isError?: string;
}

export async function fetchIncomingEthTxs(address: string): Promise<EtherscanTx[]> {
  const { data } = await axios.get(config.etherscanApiUrl, {
    params: {
      module: "account",
      action: "txlist",
      address,
      sort: "desc",
      apikey: config.etherscanApiKey,
    },
  });
  const result = Array.isArray(data.result) ? data.result : [];
  return result.filter(
    (tx: EtherscanTx) => tx.to?.toLowerCase() === address.toLowerCase() && tx.isError === "0" && BigInt(tx.value) > 0n
  );
}

export async function fetchIncomingTokenTxs(address: string, contractAddress: string): Promise<EtherscanTx[]> {
  const { data } = await axios.get(config.etherscanApiUrl, {
    params: {
      module: "account",
      action: "tokentx",
      address,
      contractaddress: contractAddress,
      sort: "desc",
      apikey: config.etherscanApiKey,
    },
  });
  const result = Array.isArray(data.result) ? data.result : [];
  return result.filter((tx: EtherscanTx) => tx.to?.toLowerCase() === address.toLowerCase());
}
