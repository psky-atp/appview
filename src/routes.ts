import { FastifyInstance } from "fastify";
import type { AppContext } from "./index.js";
import { GetPostsInterface, GetPostsSchema } from "./lib/schemas.js";

let ipSet: Record<string, number> = {};
const serverState = (sessionCount: number) =>
  `{"$type": "serverState", "sessionCount": ${sessionCount}}`;

export const createRouter = (server: FastifyInstance, ctx: AppContext) => {
  server.register(async () => {
    const stream = server.websocketServer;
    stream.setMaxListeners(0);

    server.get("/subscribe", { websocket: true }, (socket, req) => {
      if (!ipSet[req.ip]) {
        ipSet[req.ip] = 1;
        stream.emit("message", serverState(Object.keys(ipSet).length));
      } else {
        ipSet[req.ip] += 1;
      }
      socket.send(serverState(Object.keys(ipSet).length));
      const callback = (data: any) => {
        socket.send(String(data));
      };
      stream.on("message", callback);
      socket.on("close", () => {
        stream.removeListener("data", callback);
        ipSet[req.ip] -= 1;
        if (ipSet[req.ip] == 0) {
          delete ipSet[req.ip];
          stream.emit("message", serverState(Object.keys(ipSet).length));
        }
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
          cid: rec.cid,
          post: rec.post,
          facets: rec.facets ? JSON.parse(rec.facets) : undefined,
          reply: rec.reply ? JSON.parse(rec.reply) : undefined,
          handle: rec.handle,
          nickname: rec.nickname ?? undefined,
          indexedAt: rec.indexed_at,
          updatedAt: rec.updated_at ?? undefined,
        })),
      };

      res.code(200).send(data);
    },
  );
};
