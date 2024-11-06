import { countGrapheme } from "unicode-segmenter";
import { ctx } from "../index.js";
import { Room } from "../utils/types.js";

const validateRoomName = (name: string) =>
  countGrapheme(name) <= 32 && name.length <= 320;

const validateTopic = (topic: string) => {
  return countGrapheme(topic) <= 256 && topic.length <= 2560 ? topic : null;
};

const getRoom = (uri: string) => {
  return ctx.db
    .selectFrom("rooms")
    .where("uri", "=", uri)
    .selectAll()
    .executeTakeFirst();
};

const addRoom = async (room: Room) => {
  if (!validateRoomName) return;
  if (await getRoom(room.uri)) return;
  const res = await ctx.db
    .insertInto("rooms")
    .values({
      uri: room.uri,
      cid: room.cid,
      owner_did: room.owner,
      name: room.room.name,
      topic: room.room.topic && validateTopic(room.room.topic),
      allowlist: JSON.stringify(room.room.allowlist) ?? null,
      denylist: JSON.stringify(room.room.denylist) ?? null,
      updated_at: Date.now(),
    })
    .executeTakeFirst();
  ctx.logger.info(`Added room: ${room.uri}`);
  return res;
};

const updateRoom = async (room: Room) => {
  if (!validateRoomName) return;
  const a = await getRoom(room.uri);
  if (a && a.uri !== room.uri) return;
  const res = (await getRoom(room.uri)) ?? (await addRoom(room));
  await ctx.db
    .updateTable("rooms")
    .set({
      name: room.room.name,
      cid: room.cid,
      topic: room.room.topic && validateTopic(room.room.topic),
      allowlist: JSON.stringify(room.room.allowlist) ?? null,
      denylist: JSON.stringify(room.room.denylist) ?? null,
      updated_at: Date.now(),
    })
    .where("uri", "=", room.uri)
    .executeTakeFirst();
  ctx.logger.info(`Updated room: ${room.uri}`);
  return res;
};

const deleteRoom = async (uri: string) => {
  await ctx.db.deleteFrom("rooms").where("uri", "=", uri).executeTakeFirst();
  ctx.logger.info(`Deleted room: ${uri}`);
};

export { getRoom, addRoom, updateRoom, deleteRoom };
