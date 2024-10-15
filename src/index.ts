import { fastify, FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { pino } from "pino";
import { createDb, migrateToLatest } from "./db/init.js";
import { env } from "./utils/env.js";
import { createRouter } from "./routes.js";
import type { Database } from "./db/init.js";
import { startJetstream } from "./relay.js";
import fastifyWebsocket from "@fastify/websocket";

export type AppContext = {
  db: Database;
  logger: pino.Logger;
};

const run = async () => {
  const logger = pino();

  const db = createDb(env.DB_PATH);
  await migrateToLatest(db);

  const server = fastify({ trustProxy: true });
  server.register(cors, { origin: "*" });
  server.register(fastifyWebsocket);
  server.register(import("@fastify/rate-limit"), {
    max: 300,
    timeWindow: "1m",
  });
  const ctx = { db, logger };
  createRouter(server, ctx);
  startJetstream(server, ctx);

  server.listen({ port: env.PORT }, (err, address) => {
    if (err) {
      console.error(err);
      close(server);
    }
    logger.info(`Server (${env.NODE_ENV}) listening at ${address}`);
  });

  const onCloseSignal = async () => {
    setTimeout(() => process.exit(1), 1000).unref();
    await close(server);
    process.exit();
  };

  process.on("SIGINT", onCloseSignal);
  process.on("SIGTERM", onCloseSignal);

  return ctx;
};

const close = async (server: FastifyInstance) => {
  ctx.logger.info("sigint received, shutting down");
  return new Promise<void>((resolve) => {
    server.close(() => {
      ctx.logger.info("server closed");
      resolve();
    });
  });
};

export const ctx = await run();
