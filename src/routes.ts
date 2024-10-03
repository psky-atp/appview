import { FastifyInstance } from "fastify";
import type { AppContext } from "./index.js";
import { countGrapheme } from "unicode-segmenter";
import * as t from "tschema";
import { writeRecords } from "./rpc.js";
import * as TID from "@atcute/tid";
import { CHARLIMIT, env, GRAPHLIMIT } from "./env.js";

const PostSchema = t.object({ post: t.string() });
type PostInterface = t.Infer<typeof PostSchema>;

const GetPostsSchema = t.object({
  limit: t.integer({ minimum: 1, maximum: 100, default: 50 }),
});
type GetPostsInterface = t.Infer<typeof GetPostsSchema>;

export const createRouter = (server: FastifyInstance, ctx: AppContext) => {
  server.register(async (fastify) => {
    const stream = ctx.socketServer;
    stream.setMaxListeners(0);
    server.post<{ Body: PostInterface }>(
      "/post",
      {
        schema: { body: PostSchema },
        config: {
          rateLimit: {
            max: 20,
            timeWindow: "1m",
          },
        },
      },
      async (req, res) => {
        const post = req.body.post;

        if (countGrapheme(post) > GRAPHLIMIT || post.length > CHARLIMIT)
          return res.status(400).send("Character limit exceeded.");
        else if (!countGrapheme(post.trim()))
          return res.status(400).send("Post cannot be empty.");

        const rkey = TID.now();
        const uri = `at://${env.DID}/social.psky.feed.post/${rkey}`;
        writeRecords(ctx.rpc, post, rkey);
        const record = {
          uri: uri,
          post: post,
          indexedAt: Date.now(),
        };
        await ctx.db.insertInto("posts").values(record).executeTakeFirst();
        ctx.logger.info(record);
        stream.emit("message", JSON.stringify(record));

        return res.status(200).send(record);
      },
    );

    fastify.get("/subscribe", { websocket: true }, (socket) => {
      const callback = (data: any) => {
        socket.send(String(data));
      };
      stream.on("message", callback);
      socket.on("close", () => {
        stream.removeListener("data", callback);
      });
    });
  });

  server.get<{ Querystring: GetPostsInterface }>(
    "/posts",
    { schema: { querystring: GetPostsSchema } },
    async (req, res) => {
      const posts = await ctx.db
        .selectFrom("posts")
        .orderBy("indexedAt", "desc")
        .limit(req.query.limit)
        .selectAll()
        .execute();

      res.code(200).send(posts);
    },
  );
};
