import { XRPC, CredentialManager } from "@atcute/client";
import { env } from "./env.js";

export const getRPC = async () => {
  const manager = new CredentialManager({ service: env.SERVICE });
  const rpc = new XRPC({ handler: manager });
  await manager.login({ identifier: env.DID, password: env.PASSWORD });
  return rpc;
};
