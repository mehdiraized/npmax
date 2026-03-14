import axios from "axios";

const CACHE_TTL = 30 * 60 * 1000;
const cache = new Map();
const detailCache = new Map();
const podCache = new Map();
const podDetailCache = new Map();

const githubClient = axios.create({
	baseURL: "https://api.github.com/",
	timeout: 10000,
	headers: {
		Accept: "application/vnd.github+json",
	},
});

const podClient = axios.create({
	baseURL: "https://trunk.cocoapods.org/",
	timeout: 10000,
});

const STABLE_RE = /(alpha|beta|rc|preview)/i;

const cleanVersion = (value = "") => value.trim().replace(/^v/i, "");

const compareLooseVersions = (a, b) => {
	const partsA = cleanVersion(a).split(/[.\-+]/).map((part) => {
		const numeric = Number(part);
		return Number.isNaN(numeric) ? part : numeric;
	});
	const partsB = cleanVersion(b).split(/[.\-+]/).map((part) => {
		const numeric = Number(part);
		return Number.isNaN(numeric) ? part : numeric;
	});

	for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
		const left = partsA[i];
		const right = partsB[i];
		if (left == null) return -1;
		if (right == null) return 1;
		if (left === right) continue;
		if (typeof left === "number" && typeof right === "number") return left - right;
		return String(left).localeCompare(String(right));
	}

	return 0;
};

const parseGitHubRepo = (repositoryUrl) => {
	if (!repositoryUrl) return null;
	const normalized = repositoryUrl
		.replace(/^git@github\.com:/i, "https://github.com/")
		.replace(/^ssh:\/\/git@github\.com\//i, "https://github.com/")
		.replace(/\.git$/i, "");
	const match = normalized.match(/github\.com\/([^/]+)\/([^/#]+)/i);
	if (!match) return null;
	return { owner: match[1], repo: match[2] };
};

const buildManualSwiftDetail = (dep) => ({
	ecosystem: "swift",
	name: dep.displayName,
	version: cleanVersion(dep.rawRequirement || dep.version || "manual"),
	description:
		dep.sourceType === "local"
			? "This Swift package is linked from a local path, so npMax cannot fetch remote release metadata."
			: "This Swift package uses a source that does not expose GitHub release metadata.",
	badges: [
		"Swift Package Manager",
		dep.sourceType === "local" ? "Local Package" : "Manual Source",
	],
	links: [
		...(dep.repositoryUrl
			? [{ label: "Repository", type: "repository", url: dep.repositoryUrl }]
			: []),
	],
	stats: [
		{ label: "Requirement", value: dep.rawRequirement || "Manual" },
		{ label: "Source", value: dep.repositoryUrl || dep.localPath || "Unknown" },
		{ label: "Lookup", value: "Manual review required" },
	],
	downloads: null,
	compatibility: dep.localPath
		? [{ label: "Local Path", value: dep.localPath }]
		: [],
	versions: dep.rawRequirement
		? [
				{
					version: cleanVersion(dep.rawRequirement),
					date: null,
					labels: ["current"],
					isLatest: true,
				},
			]
		: [],
	install: {
		label: "swift",
		lines: dep.repositoryUrl
			? [`.package(url: "${dep.repositoryUrl}", from: "${cleanVersion(dep.rawRequirement || "1.0.0")}")`]
			: dep.localPath
				? [`.package(path: "${dep.localPath}")`]
				: ["Add this dependency in Package.swift"],
	},
});

const buildGithubDetail = (dep, release, tags = []) => {
	const publishedAt = release?.published_at || release?.created_at || null;
	const version = release?.tag_name || release?.name || tags[0]?.name;
	if (!version) throw new Error(`No version found for ${dep.displayName}`);

	return {
		ecosystem: "swift",
		name: dep.displayName,
		version: cleanVersion(version),
		description: release?.body ? release.body.split("\n")[0] : "",
		badges: [
			"Swift Package Manager",
			dep.sourceType === "github" ? "GitHub" : "Remote",
		],
		links: [
			...(dep.repositoryUrl
				? [{ label: "Repository", type: "repository", url: dep.repositoryUrl }]
				: []),
			...(release?.html_url
				? [{ label: "Release", type: "homepage", url: release.html_url }]
				: []),
		],
		stats: [
			{ label: "Requirement", value: dep.rawRequirement || "Unpinned" },
			{ label: "Source", value: dep.repositoryUrl || dep.localPath || "Unknown" },
			{ label: "Published", value: publishedAt || "Unknown", format: "date" },
		],
		downloads: null,
		compatibility: [],
		versions: [release, ...tags]
			.filter(Boolean)
			.slice(0, 14)
			.map((item, index) => ({
				version: cleanVersion(item.tag_name || item.name),
				date: item.published_at || item.commit?.committer?.date || null,
				labels: [
					index === 0 ? "latest" : null,
					STABLE_RE.test(item.tag_name || item.name || "") ? "pre-release" : "stable",
				].filter(Boolean),
				isLatest: index === 0,
			})),
		install: {
			label: "swift",
			lines: dep.repositoryUrl
				? [`.package(url: "${dep.repositoryUrl}", from: "${cleanVersion(version)}")`]
				: ["Add this dependency in Package.swift"],
		},
	};
};

const getGitHubLatestRelease = async ({ owner, repo }) => {
	try {
		const { data } = await githubClient.get(`/repos/${owner}/${repo}/releases/latest`);
		return data;
	} catch (error) {
		if (error.response?.status !== 404) throw error;
		return null;
	}
};

const getGitHubTags = async ({ owner, repo }) => {
	const { data } = await githubClient.get(`/repos/${owner}/${repo}/tags`, {
		params: { per_page: 14 },
	});
	return Array.isArray(data) ? data : [];
};

export const getSwiftPackageInfo = async (dependency) => {
	const cacheKey = dependency.id;
	const hit = cache.get(cacheKey);
	if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

	const repo = parseGitHubRepo(dependency.repositoryUrl);
	if (!repo) throw new Error(`Unsupported Swift package source for ${dependency.name}`);

	const [release, tags] = await Promise.all([
		getGitHubLatestRelease(repo),
		getGitHubTags(repo),
	]);

	const latestTag = release?.tag_name || tags[0]?.name;
	if (!latestTag) throw new Error(`No tags found for ${dependency.name}`);

	const result = {
		version: cleanVersion(latestTag),
		homepage: dependency.repositoryUrl,
		repository: dependency.repositoryUrl,
	};

	cache.set(cacheKey, { data: result, ts: Date.now() });
	return result;
};

export const getSwiftPackageDetails = async (dependency) => {
	const cacheKey = dependency.id;
	const hit = detailCache.get(cacheKey);
	if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

	const repo = parseGitHubRepo(dependency.repositoryUrl);
	if (!repo) {
		const detail = buildManualSwiftDetail(dependency);
		detailCache.set(cacheKey, { data: detail, ts: Date.now() });
		return detail;
	}

	const [release, tags] = await Promise.all([
		getGitHubLatestRelease(repo),
		getGitHubTags(repo),
	]);

	const detail = buildGithubDetail(dependency, release, tags);
	detailCache.set(cacheKey, { data: detail, ts: Date.now() });
	return detail;
};

export const fetchSwiftPackagesInfo = async (
	dependencies,
	onResult,
	concurrency = 4,
) => {
	const queue = [...dependencies];

	const worker = async () => {
		while (queue.length > 0) {
			const dependency = queue.shift();
			if (!dependency) break;
			try {
				const data = await getSwiftPackageInfo(dependency);
				onResult(dependency.id, data);
			} catch {
				onResult(dependency.id, null);
			}
		}
	};

	await Promise.all(
		Array.from({ length: Math.min(concurrency, dependencies.length) }, worker),
	);
};

const latestStablePodVersion = (versions = []) =>
	[...versions]
		.map((item) => item.name)
		.filter((value) => value && !STABLE_RE.test(value))
		.sort(compareLooseVersions)
		.pop() || null;

export const getCocoaPodInfo = async (podName) => {
	const hit = podCache.get(podName);
	if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

	const [{ data }, latestSpecResponse] = await Promise.all([
		podClient.get(`/api/v1/pods/${encodeURIComponent(podName)}`),
		podClient.get(`/api/v1/pods/${encodeURIComponent(podName)}/specs/latest`),
	]);

	const version = latestStablePodVersion(data.versions);
	if (!version) throw new Error(`No stable CocoaPod version found for ${podName}`);

	const result = {
		version,
		homepage: latestSpecResponse.data?.homepage || latestSpecResponse.data?.source?.http || null,
		repository: latestSpecResponse.data?.source?.git || null,
	};

	podCache.set(podName, { data: result, ts: Date.now() });
	return result;
};

export const getCocoaPodDetails = async (podName) => {
	const hit = podDetailCache.get(podName);
	if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

	const [{ data }, latestSpecResponse] = await Promise.all([
		podClient.get(`/api/v1/pods/${encodeURIComponent(podName)}`),
		podClient.get(`/api/v1/pods/${encodeURIComponent(podName)}/specs/latest`),
	]);

	const latestVersion = latestStablePodVersion(data.versions);
	if (!latestVersion) throw new Error(`No stable CocoaPod version found for ${podName}`);

	const spec = latestSpecResponse.data || {};
	const repositoryUrl = spec.source?.git || spec.homepage || null;
	const detail = {
		ecosystem: "cocoapods",
		name: podName,
		version: latestVersion,
		description: spec.summary || spec.description || "",
		badges: ["CocoaPods"],
		links: [
			...(spec.homepage
				? [{ label: "Homepage", type: "homepage", url: spec.homepage }]
				: []),
			...(repositoryUrl
				? [{ label: "Repository", type: "repository", url: repositoryUrl }]
				: []),
			{
				label: "Trunk",
				type: "registry",
				url: `https://trunk.cocoapods.org/pods/${encodeURIComponent(podName)}`,
			},
		],
		stats: [
			{ label: "License", value: spec.license?.type || spec.license || "Unknown" },
			{
				label: "Platforms",
				value: Object.keys(spec.platforms || {}).join(", ") || "Unknown",
			},
			{
				label: "Swift",
				value: Array.isArray(spec.swift_versions)
					? spec.swift_versions.join(", ")
					: spec.swift_version || "N/A",
			},
		],
		downloads: null,
		compatibility: Object.entries(spec.platforms || {}).map(([label, value]) => ({
			label,
			value,
		})),
		versions: (data.versions || [])
			.slice()
			.sort((a, b) => compareLooseVersions(b.name, a.name))
			.slice(0, 14)
			.map((version) => ({
				version: version.name,
				date: version.created_at || null,
				labels: [
					version.name === latestVersion ? "latest" : null,
					STABLE_RE.test(version.name) ? "pre-release" : "stable",
				].filter(Boolean),
				isLatest: version.name === latestVersion,
			})),
		install: {
			label: "pod",
			lines: [`pod '${podName}', '~> ${latestVersion}'`],
		},
	};

	podDetailCache.set(podName, { data: detail, ts: Date.now() });
	return detail;
};

export const fetchCocoaPodInfo = async (names, onResult, concurrency = 6) => {
	const queue = [...names];

	const worker = async () => {
		while (queue.length > 0) {
			const name = queue.shift();
			if (!name) break;
			try {
				const data = await getCocoaPodInfo(name);
				onResult(name, data);
			} catch {
				onResult(name, null);
			}
		}
	};

	await Promise.all(
		Array.from({ length: Math.min(concurrency, names.length) }, worker),
	);
};
