import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";

const authPool = new Pool({
	connectionString: process.env.AUTH_DATABASE_URL!,
});

const trustedOrigins = process.env.TRUSTED_ORIGINS?.split(",") ?? [];

export const auth = betterAuth({
	baseURL: process.env.BETTER_AUTH_URL,
	basePath: "/api/auth",
	database: authPool,
	trustedOrigins,
	session: {
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60,
		},
	},
	advanced: {
		database: {
			generateId: () => uuidv4(),
		},
		...(process.env.COOKIE_DOMAIN && {
			crossSubDomainCookies: {
				enabled: true,
				domain: process.env.COOKIE_DOMAIN,
			},
		}),
	},
	emailAndPassword: {
		enabled: true,
	},
	plugins: [jwt()],
	telemetry: { enabled: false },
});
