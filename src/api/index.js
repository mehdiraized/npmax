import axios from "axios";

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes in-memory cache
const cache = new Map(); // name → { data, ts }

const client = axios.create({
	baseURL: "https://registry.npmjs.org/",
	timeout: 10000,
});

/**
 * Fetch the latest package info from npm registry with in-memory caching.
 */
export const getPackageInfo = async (packageName) => {
	const hit = cache.get(packageName);
	if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

	const { data } = await client.get(`/${encodeURIComponent(packageName)}/latest`);
	cache.set(packageName, { data, ts: Date.now() });
	return data;
};

/**
 * Fetch info for many packages concurrently (default 8 at a time).
 * Calls onResult(name, data | null) as each response arrives so the UI
 * can update incrementally rather than waiting for all requests to finish.
 */
export const fetchPackagesInfo = async (names, onResult, concurrency = 8) => {
	const queue = [...names];

	const worker = async () => {
		while (queue.length > 0) {
			const name = queue.shift();
			if (!name) break;
			try {
				const data = await getPackageInfo(name);
				onResult(name, data);
			} catch {
				onResult(name, null);
			}
		}
	};

	await Promise.all(Array.from({ length: Math.min(concurrency, names.length) }, worker));
};
