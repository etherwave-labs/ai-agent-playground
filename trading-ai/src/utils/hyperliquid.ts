import * as hl from "@nktkas/hyperliquid";
import { Wallet } from "ethers";

const privKey = process.env.HL_PRIVKEY as string;
const wallet   = new Wallet(privKey);

const transport = new hl.HttpTransport({ isTestnet: false });

const info  = new hl.InfoClient({ transport });
const exch  = new hl.ExchangeClient({ wallet, transport });