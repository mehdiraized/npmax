import axios from "axios";
import { resolveVersionStatus } from "../utils/systemApps.js";

const CACHE_TTL = 30 * 60 * 1000;
const latestCache = new Map();

const githubClient = axios.create({
	baseURL: "https://api.github.com/",
	timeout: 12000,
	headers: {
		Accept: "application/vnd.github+json",
		"X-GitHub-Api-Version": "2022-11-28",
	},
});

const brewClient = axios.create({
	baseURL: "https://formulae.brew.sh/api/",
	timeout: 12000,
});

const cleanVersion = (value) =>
	String(value || "")
		.trim()
		.replace(/^v/i, "")
		.replace(/^release[-_\s]*/i, "");

const fromCache = (key) => {
	const hit = latestCache.get(key);
	if (!hit) return null;
	if (Date.now() - hit.ts > CACHE_TTL) return null;
	return hit.value;
};

const toCache = (key, value) => {
	latestCache.set(key, { ts: Date.now(), value });
	return value;
};

const getGithubLatest = async (repo) => {
	const cacheKey = `github:${repo}`;
	const hit = fromCache(cacheKey);
	if (hit) return hit;

	try {
		const { data } = await githubClient.get(`/repos/${repo}/releases/latest`);
		return toCache(cacheKey, {
			version: cleanVersion(data.tag_name || data.name),
			url: data.html_url,
			source: "github",
		});
	} catch {
		const { data } = await githubClient.get(`/repos/${repo}/tags`);
		const first = Array.isArray(data) ? data[0] : null;
		if (!first) throw new Error(`No tags found for ${repo}`);
		return toCache(cacheKey, {
			version: cleanVersion(first.name),
			url: `https://github.com/${repo}/releases`,
			source: "github",
		});
	}
};

const getBrewCaskLatest = async (token) => {
	const cacheKey = `brew:${token}`;
	const hit = fromCache(cacheKey);
	if (hit) return hit;

	const { data } = await brewClient.get(`/cask/${token}.json`);
	return toCache(cacheKey, {
		version: cleanVersion(data.version),
		url: data.homepage || `https://formulae.brew.sh/cask/${token}`,
		source: "brew-api",
	});
};

const resolveRemoteLatest = async (app) => {
	const platformInfo = app.catalog?.platforms?.[process.platform];
	if (!platformInfo) return null;

	if (process.platform === "darwin" && platformInfo.brewCask) {
		return getBrewCaskLatest(platformInfo.brewCask);
	}
	if (platformInfo.githubRepo) {
		return getGithubLatest(platformInfo.githubRepo);
	}
	return null;
};

export const enrichAppsWithRemoteVersions = async (
	apps,
	onResult,
	concurrency = 6,
) => {
	const queue = apps.filter(
		(app) =>
			!app.updateAvailable &&
			!!app.catalog &&
			!!app.version &&
			!!app.catalog.platforms?.[process.platform],
	);

	const worker = async () => {
		while (queue.length > 0) {
			const app = queue.shift();
			if (!app) break;
			try {
				const remote = await resolveRemoteLatest(app);
				if (!remote?.version) {
					onResult(app.id, null);
					continue;
				}

				onResult(app.id, {
					latestVersion: remote.version,
					updateUrl: remote.url,
					updateSource: remote.source,
					updateConfidence: "catalog",
					status: resolveVersionStatus(app.version, remote.version),
				});
			} catch {
				onResult(app.id, null);
			}
		}
	};

	await Promise.all(
		Array.from({ length: Math.min(concurrency, queue.length || 1) }, worker),
	);
};
