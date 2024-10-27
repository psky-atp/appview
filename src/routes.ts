import { FastifyInstance } from "fastify";
import type { AppContext } from "./index.js";
import {
  GetMessagesI,
  GetMessagesSchema,
  SocketQueryI,
  SocketQuerySchema,
} from "./lib/schemas.js";

let ipSet: Record<string, number> = {};
const serverState = (sessionCount: number) =>
  `{"$type": "serverState", "sessionCount": ${sessionCount}}`;

export const createRouter = (server: FastifyInstance, ctx: AppContext) => {
  server.register(async () => {
    const stream = server.websocketServer;
    stream.setMaxListeners(0);

    server.get<{ Querystring: SocketQueryI }>(
      "/subscribe",
      { schema: { querystring: SocketQuerySchema }, websocket: true },
      (socket, req) => {
        if (!ipSet[req.ip]) {
          ipSet[req.ip] = 1;
          stream.emit("message", serverState(Object.keys(ipSet).length));
        } else {
          ipSet[req.ip] += 1;
        }
        socket.send(serverState(Object.keys(ipSet).length));
        const callback = (data: any) => {
          if (
            !req.query.wantedRooms ||
            req.query.wantedRooms?.includes(JSON.parse(data).room)
          )
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
      },
    );
  });

  server.get<{ Querystring: GetMessagesI }>(
    "/xrpc/social.psky.chat.getMessages",
    { schema: { querystring: GetMessagesSchema } },
    async (req, res) => {
      const { uri } = req.query;
      let query = ctx.db.selectFrom("messages").selectAll("messages");
      if (uri) query = query.where("room", "=", uri);
      const messages = await query
        .innerJoin("users", "messages.did", "users.did")
        .orderBy("indexed_at", "desc")
        .where("users.active", "=", 1)
        .limit(req.query.limit)
        .offset(req.query.cursor ?? 0)
        .select(["handle", "nickname"])
        .execute();

      const data = {
        cursor: messages.length + (req.query.cursor ?? 0),
        messages: messages.map((rec) => ({
          did: rec.did,
          rkey: rec.uri.split("/").pop(),
          cid: rec.cid,
          room: rec.room,
          content: rec.content,
          facets:
            rec.facets && JSON.stringify(rec.facets) !== "null" ?
              rec.facets
            : undefined,
          reply: rec.reply ?? undefined,
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
