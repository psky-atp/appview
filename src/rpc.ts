import { XRPC, CredentialManager } from "@atcute/client";
import {
  AppBskyFeedPost,
  SocialPskyFeedPost,
  Brand,
  ComAtprotoRepoApplyWrites,
} from "@atcute/client/lexicons";
import "@atcute/bluesky/lexicons";
import { env } from "./env.js";

export const getRPC = async () => {
  const manager = new CredentialManager({ service: env.SERVICE });
  const rpc = new XRPC({ handler: manager });
  await manager.login({ identifier: env.DID, password: env.PASSWORD });
  return rpc;
};

export const writeRecords = async (rpc: XRPC, post: string, rkey: string) => {
  const timestamp = new Date().toISOString();

  const writes: Brand.Union<ComAtprotoRepoApplyWrites.Create>[] = [
    {
      $type: "com.atproto.repo.applyWrites#create",
      collection: "app.bsky.feed.post",
      rkey: rkey,
      value: {
        $type: "app.bsky.feed.post",
        text: post,
        createdAt: timestamp,
      } as AppBskyFeedPost.Record,
    },
    {
      $type: "com.atproto.repo.applyWrites#create",
      collection: "social.psky.feed.post",
      rkey: rkey,
      value: {
        $type: "social.psky.feed.post",
        text: post,
      } as SocialPskyFeedPost.Record,
    },
  ];

  await rpc
    .call("com.atproto.repo.applyWrites", {
      data: { repo: env.DID, writes: writes },
    })
    .catch((err) => console.log(err));

  return rkey;
};
