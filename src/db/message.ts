import { countGrapheme } from "unicode-segmenter";
import { ctx } from "../index.js";
import { CHARLIMIT, GRAPHLIMIT } from "../utils/env.js";
import { Message } from "../utils/types.js";

const validateMessage = (msg: string) =>
  countGrapheme(msg) <= GRAPHLIMIT && msg.length <= CHARLIMIT;

const getMessage = async (uri: string) => {
  return ctx.db
    .selectFrom("messages")
    .where("uri", "=", uri)
    .selectAll()
    .executeTakeFirst();
};

const addMessage = async (msg: Message) => {
  if (!validateMessage(msg.msg.content)) return;
  await ctx.db
    .insertInto("messages")
    .values({
      uri: msg.uri,
      cid: msg.cid,
      did: msg.did,
      room: msg.msg.room,
      facets: JSON.stringify(msg.msg.facets) ?? null,
      reply: JSON.stringify(msg.msg.reply) ?? null,
      content: msg.msg.content,
      indexed_at: Date.now(),
    })
    .executeTakeFirst();
  ctx.logger.info(`Added message: ${msg.uri}`);
};

const updateMessage = async (msg: Message) => {
  if (!validateMessage(msg.msg.content)) return;
  (await getMessage(msg.uri)) ?? (await addMessage(msg));
  await ctx.db
    .updateTable("messages")
    .set({
      cid: msg.cid,
      content: msg.msg.content,
      facets: JSON.stringify(msg.msg.facets) ?? null,
      updated_at: Date.now(),
    })
    .where("uri", "=", msg.uri)
    .executeTakeFirst();
  ctx.logger.info(`Updated message: ${msg.uri}`);
};

const deleteMessage = async (uri: string) => {
  const res = await ctx.db
    .deleteFrom("messages")
    .where("uri", "=", uri)
    .returning("room as room")
    .executeTakeFirst();
  ctx.logger.info(`Deleted message: ${uri}`);
  return res;
};

export { getMessage, addMessage, updateMessage, deleteMessage };
