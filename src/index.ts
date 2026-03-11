import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth";

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

app.on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw));

app.all("/api/*", async (c) => {
	const { token } = await auth.api.getToken({
		headers: c.req.raw.headers,
	});

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const targetPath = new URL(c.req.url).pathname.replace(/^\/api/, "");
	const targetUrl = `${nullCoreUrl}${targetPath}`;

	const body = ["GET", "HEAD"].includes(c.req.method)
		? undefined
		: await c.req.raw.text();

	const upstreamResponse = await fetch(targetUrl, {
		method: c.req.method,
		headers: {
			"Content-Type": c.req.header("Content-Type") || "application/json",
			Authorization: `Bearer ${token}`,
		},
		body,
	});

	const responseBody = await upstreamResponse.text();

	return new Response(responseBody, {
		status: upstreamResponse.status,
		headers: {
			"Content-Type":
				upstreamResponse.headers.get("Content-Type") || "application/json",
		},
	});
});

export default {
	port: parseInt(process.env.PORT || "55550"),
	hostname: process.env.HOSTNAME || "127.0.0.1",
	fetch: app.fetch,
};
