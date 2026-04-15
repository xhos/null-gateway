import { app } from "./app";
import { logger } from "./logger";

const port = parseInt(process.env.PORT || "55550");
const hostname = process.env.HOSTNAME || "127.0.0.1";

logger.info("server started", { addr: `${hostname}:${port}` });

export default {
	port,
	hostname,
	fetch: app.fetch,
};
