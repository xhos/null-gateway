import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

process.env.NULL_CORE_URL = "http://null-core:55555";
process.env.TRUSTED_ORIGINS = "http://localhost:3000";

const mockGetToken = mock(async () => ({ token: null as string | null }));
const mockAuthHandler = mock(async () => new Response("ok", { status: 200 }));

mock.module("./auth", () => ({
	auth: {
		api: { getToken: mockGetToken },
		handler: mockAuthHandler,
	},
}));

const { app } = await import("./app");

describe("proxy", () => {
	beforeEach(() => {
		mockGetToken.mockClear();
		mockAuthHandler.mockClear();
	});

	afterEach(() => {
		mock.restore();
	});

	it("returns 401 when no session token", async () => {
		mockGetToken.mockResolvedValue({ token: null });

		const res = await app.request("/api/transactions", { method: "GET" });

		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ error: "Unauthorized" });
	});

	it("strips /api prefix when proxying", async () => {
		mockGetToken.mockResolvedValue({ token: "test-jwt" });

		let capturedUrl = "";
		const originalFetch = globalThis.fetch;
		globalThis.fetch = mock(async (url: string | URL | Request) => {
			capturedUrl = url.toString();
			return new Response('{"ok":true}', { status: 200 });
		}) as typeof fetch;

		await app.request("/api/transactions/123", { method: "GET" });

		expect(capturedUrl).toBe("http://null-core:55555/transactions/123");
		globalThis.fetch = originalFetch;
	});

	it("forwards Authorization header with Bearer token", async () => {
		mockGetToken.mockResolvedValue({ token: "my-jwt-token" });

		let capturedHeaders: Record<string, string> = {};
		const originalFetch = globalThis.fetch;
		globalThis.fetch = mock(
			async (_url: string | URL | Request, init?: RequestInit) => {
				capturedHeaders = Object.fromEntries(
					Object.entries((init?.headers as Record<string, string>) ?? {}),
				);
				return new Response("{}", { status: 200 });
			},
		) as typeof fetch;

		await app.request("/api/accounts", { method: "GET" });

		expect(capturedHeaders["Authorization"]).toBe("Bearer my-jwt-token");
		globalThis.fetch = originalFetch;
	});

	it("returns 502 when null-core is unreachable", async () => {
		mockGetToken.mockResolvedValue({ token: "valid-token" });

		const originalFetch = globalThis.fetch;
		globalThis.fetch = mock(async () => {
			throw new Error("ECONNREFUSED");
		}) as typeof fetch;

		const res = await app.request("/api/accounts", { method: "GET" });

		expect(res.status).toBe(502);
		expect(await res.json()).toEqual({ error: "upstream unavailable" });
		globalThis.fetch = originalFetch;
	});

	it("does not send body on GET requests", async () => {
		mockGetToken.mockResolvedValue({ token: "valid-token" });

		let capturedBody: BodyInit | null | undefined = "sentinel";
		const originalFetch = globalThis.fetch;
		globalThis.fetch = mock(
			async (_url: string | URL | Request, init?: RequestInit) => {
				capturedBody = init?.body;
				return new Response("{}", { status: 200 });
			},
		) as typeof fetch;

		await app.request("/api/accounts", { method: "GET" });

		expect(capturedBody).toBeUndefined();
		globalThis.fetch = originalFetch;
	});

	it("forwards POST body to upstream", async () => {
		mockGetToken.mockResolvedValue({ token: "valid-token" });

		let capturedBody = "";
		const originalFetch = globalThis.fetch;
		globalThis.fetch = mock(
			async (_url: string | URL | Request, init?: RequestInit) => {
				capturedBody = init?.body as string;
				return new Response("{}", { status: 201 });
			},
		) as typeof fetch;

		await app.request("/api/transactions", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ amount: 42 }),
		});

		expect(capturedBody).toBe('{"amount":42}');
		globalThis.fetch = originalFetch;
	});

	it("passes upstream status code through", async () => {
		mockGetToken.mockResolvedValue({ token: "valid-token" });

		const originalFetch = globalThis.fetch;
		globalThis.fetch = mock(
			async () => new Response("not found", { status: 404 }),
		) as typeof fetch;

		const res = await app.request("/api/accounts/999", { method: "GET" });

		expect(res.status).toBe(404);
		globalThis.fetch = originalFetch;
	});
});

describe("auth routes", () => {
	it("delegates /api/auth/* to better-auth handler", async () => {
		mockAuthHandler.mockResolvedValue(
			new Response(JSON.stringify({ token: "abc" }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);

		const res = await app.request("/api/auth/sign-in/email", {
			method: "POST",
		});

		expect(mockAuthHandler).toHaveBeenCalledTimes(1);
		expect(res.status).toBe(200);
	});
});
