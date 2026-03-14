import axios from "axios";

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes in-memory cache
const cache = new Map(); // name → { data, ts }
const detailCache = new Map(); // name → { data, ts }

const client = axios.create({
	baseURL: "https://registry.npmjs.org/",
	timeout: 10000,
});

const fallbackClient = axios.create({
	baseURL: "https://npmx.dev/api/registry/package-meta/",
	timeout: 10000,
});

const downloadsClient = axios.create({
	baseURL: "https://api.npmjs.org/downloads/",
	timeout: 10000,
});

const normalizeFallbackData = (packageName, data) => {
	if (!data || !data.version) return null;

	return {
		name: data.name || packageName,
		version: data.version,
		description: data.description,
		keywords: data.keywords,
		license: data.license,
		homepage: data.links?.homepage,
		repository: data.links?.repository,
		maintainers: data.maintainers,
		_source: "npmx.dev",
	};
};

const normalizeRepoUrl = (repository) => {
	if (!repository) return null;
	const raw = typeof repository === "string" ? repository : repository.url;
	if (!raw) return null;

	return raw
		.replace(/^git\+/, "")
		.replace(/^git:\/\//, "https://")
		.replace(/^ssh:\/\/git@github\.com\//, "https://github.com/")
		.replace(/^git@github\.com:/, "https://github.com/")
		.replace(/\.git$/, "");
};

const normalizeLicense = (license) => {
	if (!license) return null;
	if (typeof license === "string") return license;
	if (Array.isArray(license)) {
		return license
			.map((item) => (typeof item === "string" ? item : item?.type))
			.filter(Boolean)
			.join(", ");
	}
	if (typeof license === "object" && license.type) return license.type;
	return null;
};

const getVersionLabels = (distTags, version) =>
	Object.entries(distTags ?? {})
		.filter(([, tagVersion]) => tagVersion === version)
		.map(([tag]) => tag);

const inferBadges = (packageName, latest) => {
	const badges = [];
	const exportsField = latest.exports;
	const hasImportExport =
		typeof exportsField === "object" &&
		JSON.stringify(exportsField).includes("\"import\"");
	const hasRequireExport =
		typeof exportsField === "object" &&
		JSON.stringify(exportsField).includes("\"require\"");

	if (latest.types || latest.typings || packageName.startsWith("@types/")) {
		badges.push("Types");
	}
	if (latest.type === "module" || latest.module || hasImportExport) {
		badges.push("ESM");
	}
	if (latest.main || hasRequireExport || (!badges.includes("ESM") && exportsField)) {
		badges.push("CJS");
	}

	return badges;
};

const createActionLinks = (name, latest, repositoryUrl) => {
	const links = [
		{
			label: "npm",
			type: "registry",
			url: `https://www.npmjs.com/package/${name}`,
		},
	];

	if (latest.homepage) {
		links.unshift({ label: "Homepage", type: "homepage", url: latest.homepage });
	}
	if (repositoryUrl) {
		links.unshift({ label: "Repository", type: "repository", url: repositoryUrl });
	}
	if (latest.bugs?.url) {
		links.push({ label: "Issues", type: "issues", url: latest.bugs.url });
	}

	return links;
};

const sortVersionsByTime = (versions, timeMap) =>
	[...versions].sort((a, b) => {
		const aTime = timeMap?.[a] ? new Date(timeMap[a]).getTime() : 0;
		const bTime = timeMap?.[b] ? new Date(timeMap[b]).getTime() : 0;
		return bTime - aTime;
	});

/**
 * Fetch the latest package info from npm registry with in-memory caching.
 */
export const getPackageInfo = async (packageName) => {
	const hit = cache.get(packageName);
	if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

	try {
		const { data } = await client.get(`/${encodeURIComponent(packageName)}/latest`);
		cache.set(packageName, { data, ts: Date.now() });
		return data;
	} catch (registryError) {
		try {
			const { data } = await fallbackClient.get(`/${encodeURIComponent(packageName)}`);
			const normalized = normalizeFallbackData(packageName, data);
			if (!normalized) throw new Error("Invalid fallback payload");
			cache.set(packageName, { data: normalized, ts: Date.now() });
			return normalized;
		} catch {
			throw registryError;
		}
	}
};

export const getPackageDetails = async (packageName) => {
	const hit = detailCache.get(packageName);
	if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

	const [packument, downloadData] = await Promise.all([
		client.get(`/${encodeURIComponent(packageName)}`).then((res) => res.data),
		downloadsClient
			.get(`point/last-week/${encodeURIComponent(packageName)}`)
			.then((res) => res.data)
			.catch(() => null),
	]);

	const latestVersion =
		packument["dist-tags"]?.latest ||
		Object.values(packument["dist-tags"] ?? {})[0];
	const latest = latestVersion ? packument.versions?.[latestVersion] : null;

	if (!latestVersion || !latest) {
		throw new Error(`No latest version found for ${packageName}`);
	}

	const repositoryUrl = normalizeRepoUrl(latest.repository || packument.repository);
	const publishedAt = packument.time?.[latestVersion] || packument.time?.modified || null;
	const versions = sortVersionsByTime(Object.keys(packument.versions ?? {}), packument.time)
		.slice(0, 14)
		.map((version) => ({
			version,
			date: packument.time?.[version] || null,
			labels: getVersionLabels(packument["dist-tags"], version),
			isLatest: version === latestVersion,
		}));

	const detail = {
		ecosystem: "npm",
		name: packument.name || packageName,
		version: latestVersion,
		description: latest.description || packument.description || "",
		badges: inferBadges(packageName, latest),
		links: createActionLinks(packument.name || packageName, latest, repositoryUrl),
		stats: [
			{ label: "License", value: normalizeLicense(latest.license || packument.license) || "Unknown" },
			{
				label: "Dependencies",
				value: String(Object.keys(latest.dependencies ?? {}).length),
			},
			{
				label: "Install size",
				value:
					typeof latest.dist?.unpackedSize === "number"
						? `${latest.dist.unpackedSize}`
						: "N/A",
				format: "bytes",
			},
			{
				label: "Published",
				value: publishedAt || "Unknown",
				format: "date",
			},
		],
		downloads: downloadData
			? {
					label: "Weekly downloads",
					value: downloadData.downloads,
					start: downloadData.start,
					end: downloadData.end,
					format: "number",
				}
			: null,
		compatibility: latest.engines?.node
			? [{ label: "Node.js", value: latest.engines.node }]
			: [],
		versions,
		install: {
			label: "npm",
			lines: [`npm install ${packageName}`],
		},
		meta: {
			currentVersion: null,
			maintainers: (latest.maintainers || packument.maintainers || []).length,
		},
	};

	if (packageName.startsWith("@types/") || latest.types || latest.typings) {
		detail.install.lines.push(`# Type definitions included`);
	}

	detailCache.set(packageName, { data: detail, ts: Date.now() });
	return detail;
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
