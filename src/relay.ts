import { Jetstream } from "@skyware/jetstream";
import { FastifyInstance } from "fastify";
import type { AppContext } from "./index.js";
import { countGrapheme } from "unicode-segmenter";
import { CHARLIMIT, env, GRAPHLIMIT } from "./env.js";
import { resolveDid } from "./utils.js";

export function startJetstream(server: FastifyInstance, ctx: AppContext) {
  const jetstream = new Jetstream({
    wantedCollections: ["social.psky.*"],
    endpoint: "wss://jetstream2.us-west.bsky.network/subscribe",
  });

  jetstream.on("error", (err) => console.error(err));

  jetstream.onCreate("social.psky.feed.post", async (event) => {
    if (event.did.includes(env.DID)) return;
    const uri = `at://${event.did}/${event.commit.collection}/${event.commit.rkey}`;
    const post = event.commit.record.text;
    if (countGrapheme(post) > GRAPHLIMIT || post.length > CHARLIMIT) return;
    else if (!countGrapheme(post.trim())) return;

    const identity = await ctx.db
      .selectFrom("identities")
      .where("did", "=", event.did)
      .select("handle")
      .executeTakeFirst();
    const handle =
      identity === undefined ? await resolveDid(event.did) : identity.handle;
    if (identity === undefined)
      await ctx.db
        .insertInto("identities")
        .values({ did: event.did, handle: handle })
        .execute();

    const record = {
      uri: uri,
      post: post,
      handle: handle,
      indexedAt: Date.now(),
    };
    try {
      const res = await ctx.db
        .insertInto("posts")
        .values(record)
        .executeTakeFirst();
      if (res === undefined) return;
      ctx.logger.info(record);
      server.websocketServer.emit("message", JSON.stringify(record));
    } catch (err) {
      ctx.logger.error(err);
    }
  });

  jetstream.onDelete("social.psky.feed.post", async (event) => {
    const uri = `at://${event.did}/${event.commit.collection}/${event.commit.rkey}`;
    await ctx.db.deleteFrom("posts").where("uri", "=", uri).executeTakeFirst();
    ctx.logger.info(`Deleted post: ${uri}`);
  });

  jetstream.on("identity", async (event) => {
    const identity = await ctx.db
      .selectFrom("identities")
      .where("did", "=", event.did)
      .select("handle")
      .executeTakeFirst();
    if (identity !== undefined && event.identity.handle) {
      await ctx.db
        .updateTable("identities")
        .set({ did: event.did, handle: event.identity.handle })
        .where("did", "=", event.did)
        .execute();
      ctx.logger.info(
        `Updated handle: ${identity.handle} -> ${event.identity.handle}`,
      );
    }
  });

  jetstream.start();
}
