import dotenv from "dotenv";
import { cleanEnv, port, str, testOnly } from "envalid";

dotenv.config();

export const GRAPHLIMIT = 256;
export const CHARLIMIT = 2560;

export const env = cleanEnv(process.env, {
  NODE_ENV: str({
    devDefault: testOnly("test"),
    choices: ["prod", "test"],
  }),
  PORT: port({ devDefault: testOnly(3000) }),
  DB_PATH: str({ devDefault: ":memory:" }),
});
