type Level = "debug" | "info" | "warn" | "error";

const LEVELS: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

const format =
	(process.env.LOG_FORMAT ?? "text").toLowerCase() === "json" ? "json" : "text";

const rawLevel = (process.env.LOG_LEVEL ?? "info").toLowerCase();
const minLevel: Level = rawLevel in LEVELS ? (rawLevel as Level) : "info";

function write(level: Level, msg: string, fields?: Record<string, unknown>) {
	if (LEVELS[level] < LEVELS[minLevel]) return;

	const now = new Date().toISOString();
	let line: string;

	if (format === "json") {
		line = JSON.stringify({ time: now, level, msg, ...fields }) + "\n";
	} else {
		const extras = fields
			? " " +
				Object.entries(fields)
					.map(([k, v]) => `${k}=${v}`)
					.join(" ")
			: "";
		line = `${now} ${level.toUpperCase().padEnd(5)} ${msg}${extras}\n`;
	}

	process.stdout.write(line);
}

export const logger = {
	debug: (msg: string, fields?: Record<string, unknown>) =>
		write("debug", msg, fields),
	info: (msg: string, fields?: Record<string, unknown>) =>
		write("info", msg, fields),
	warn: (msg: string, fields?: Record<string, unknown>) =>
		write("warn", msg, fields),
	error: (msg: string, fields?: Record<string, unknown>) =>
		write("error", msg, fields),
};
