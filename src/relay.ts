import { Jetstream } from "@skyware/jetstream";
import type { AppContext } from "./index.js";
import { countGrapheme } from "unicode-segmenter";
import { CHARLIMIT, GRAPHLIMIT } from "./env.js";

export function startJetstream(ctx: AppContext) {
  const jetstream = new Jetstream({
    wantedCollections: ["social.psky.*"],
  });

  jetstream.on("error", (err) => console.error(err));

  jetstream.onCreate("social.psky.feed.post", async (event) => {
    const uri = `at://${event.did}/${event.commit.collection}/${event.commit.rkey}`;
    const post = event.commit.record.text;
    if (countGrapheme(post) > GRAPHLIMIT || post.length > CHARLIMIT) return;
    else if (!countGrapheme(post.trim())) return;

    const record = {
      uri: uri,
      post: post,
      indexedAt: Date.now(),
    };
    const res = await ctx.db
      .insertInto("posts")
      .values(record)
      .executeTakeFirst();
    if (res === undefined) return;
    ctx.logger.info(record);
    ctx.socketServer.emit("message", JSON.stringify(record));
  });

  jetstream.start();
}
