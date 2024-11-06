import { countGrapheme } from "unicode-segmenter";
import { ctx } from "../index.js";
import { resolveDid } from "../utils/api.js";
import { User } from "../utils/types.js";

const validateNickname = (nickname: string | undefined) => {
  return nickname && countGrapheme(nickname) <= 32 && nickname.length <= 320 ?
      nickname
    : null;
};

const getUser = (did: string) => {
  return ctx.db
    .selectFrom("users")
    .where("did", "=", did)
    .selectAll()
    .executeTakeFirst();
};

const addUser = async (user: User) => {
  const handle = await resolveDid(user.did);
  const res = await ctx.db
    .insertInto("users")
    .values({
      did: user.did,
      handle: handle,
      nickname: user.profile?.nickname ?? null,
      updated_at: Date.now(),
    })
    .returningAll()
    .executeTakeFirst();
  ctx.logger.info(`Added user: ${user.did}`);
  return res;
};

const updateUser = async (user: User) => {
  (await getUser(user.did)) ?? (await addUser(user));
  const nickname = validateNickname(user.profile?.nickname);
  await ctx.db
    .updateTable("users")
    .set({
      nickname: nickname,
      updated_at: Date.now(),
    })
    .where("did", "=", user.did)
    .executeTakeFirst();
  ctx.logger.info(`Updated user: ${user.did}`);
  return await getUser(user.did);
};

const deleteProfile = async (did: string) => {
  await ctx.db
    .updateTable("users")
    .set({ nickname: null, updated_at: Date.now() })
    .where("did", "=", did)
    .executeTakeFirst();
  ctx.logger.info(`Deleted user: ${did}`);
};

export { getUser, addUser, updateUser, deleteProfile };
