import { fastify, FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { pino } from "pino";

import { createDb, migrateToLatest } from "./db.js";
import { env } from "./env.js";
import { createRouter } from "./routes.js";
import type { Database } from "./db.js";
import { startJetstream } from "./relay.js";
import fastifyWebsocket from "@fastify/websocket";

export type AppContext = {
  db: Database;
  logger: pino.Logger;
};

export class Server {
  constructor(
    public server: FastifyInstance,
    public ctx: AppContext,
  ) {}

  static async create() {
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
        close();
      }
      logger.info(`Server (${env.NODE_ENV}) listening at ${address}`);
    });

    return new Server(server, ctx);
  }

  async close() {
    this.ctx.logger.info("sigint received, shutting down");
    return new Promise<void>((resolve) => {
      this.server.close(() => {
        this.ctx.logger.info("server closed");
        resolve();
      });
    });
  }
}

const run = async () => {
  const server = await Server.create();

  const onCloseSignal = async () => {
    setTimeout(() => process.exit(1), 1000).unref();
    await server.close();
    process.exit();
  };

  process.on("SIGINT", onCloseSignal);
  process.on("SIGTERM", onCloseSignal);
};

run();
