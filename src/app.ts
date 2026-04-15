import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth";
import { logger } from "./logger";

const app = new Hono();

const nullCoreUrl = process.env.NULL_CORE_URL!;
const allowedOrigins = process.env.TRUSTED_ORIGINS?.split(",") ?? [];

app.use(
	"*",
	cors({
		origin: allowedOrigins,
		credentials: true,
		allowHeaders: ["Content-Type", "Authorization", "Connect-Protocol-Version"],
		allowMethods: ["GET", "POST", "OPTIONS"],
		maxAge: 600,
	}),
);

app.on(["POST", "GET"], "/api/auth/**", async (c) => {
	const start = Date.now();
	const path = new URL(c.req.url).pathname;
	const response = await auth.handler(c.req.raw);
	logger.debug("auth", {
		method: c.req.method,
		path,
		status: response.status,
		duration_ms: Date.now() - start,
	});
	return response;
});

app.all("/api/*", async (c) => {
	const start = Date.now();
	const { token } = await auth.api.getToken({
		headers: c.req.raw.headers,
	});

	if (!token) {
		logger.warn("unauthorized", {
			method: c.req.method,
			path: new URL(c.req.url).pathname,
		});
		return c.json({ error: "Unauthorized" }, 401);
	}

	const targetPath = new URL(c.req.url).pathname.replace(/^\/api/, "");
	const targetUrl = `${nullCoreUrl}${targetPath}`;

	const body = ["GET", "HEAD"].includes(c.req.method)
		? undefined
		: await c.req.raw.text();

	let upstreamResponse: Response;
	try {
		upstreamResponse = await fetch(targetUrl, {
			method: c.req.method,
			headers: {
				"Content-Type": c.req.header("Content-Type") || "application/json",
				Authorization: `Bearer ${token}`,
			},
			body,
		});
	} catch (err) {
		logger.error("upstream unreachable", {
			path: targetPath,
			err: String(err),
		});
		return c.json({ error: "upstream unavailable" }, 502);
	}

	const responseBody = await upstreamResponse.text();

	logger.info("proxy", {
		method: c.req.method,
		path: targetPath,
		status: upstreamResponse.status,
		duration_ms: Date.now() - start,
	});

	return new Response(responseBody, {
		status: upstreamResponse.status,
		headers: {
			"Content-Type":
				upstreamResponse.headers.get("Content-Type") || "application/json",
		},
	});
});

export { app };
