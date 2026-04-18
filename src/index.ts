import { getMigrations } from "better-auth/db/migration";
import { app } from "./app";
import { auth } from "./auth";
import { logger } from "./logger";

const port = parseInt(process.env.PORT || "55550");
const hostname = process.env.HOSTNAME || "127.0.0.1";

const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(
	auth.options,
);
if (toBeCreated.length || toBeAdded.length) {
	logger.info("running better-auth migrations", {
		create: toBeCreated.map((t) => t.table),
		alter: toBeAdded.map((t) => t.table),
	});
	await runMigrations();
	logger.info("better-auth migrations completed");
}

logger.info("server started", { addr: `${hostname}:${port}` });

export default {
	port,
	hostname,
	fetch: app.fetch,
};
