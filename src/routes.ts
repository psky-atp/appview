import { FastifyInstance } from "fastify";
import type { AppContext } from "./index.js";
import { GetPostsInterface, GetPostsSchema } from "./lib/schemas.js";

export const createRouter = (server: FastifyInstance, ctx: AppContext) => {
  server.register(async () => {
    const stream = server.websocketServer;
    stream.setMaxListeners(0);

    server.get("/subscribe", { websocket: true }, (socket) => {
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
        .orderBy("indexed_at", "desc")
        .limit(req.query.limit)
        .offset(req.query.cursor ?? 0)
        .innerJoin("accounts", "posts.account_did", "accounts.did")
        .selectAll()
        .execute();

      const data = {
        cursor: posts.length + (req.query.cursor ?? 0),
        posts: posts.map((rec) => ({
          did: rec.did,
          rkey: rec.uri.split("/").pop(),
          post: rec.post,
          facets: rec.facets ? JSON.parse(rec.facets) : undefined,
          reply: rec.reply ? JSON.parse(rec.reply) : undefined,
          handle:
            rec.handle === "psky.social" ? "anon.psky.social" : rec.handle,
          nickname: rec.nickname,
          indexedAt: rec.indexed_at,
          updatedAt: rec.updated_at,
        })),
      };

      res.code(200).send(data);
    },
  );
};
