import axios from "axios";

const CACHE_TTL = 30 * 60 * 1000;
const cache = new Map();
const detailCache = new Map();

const client = axios.create({
	baseURL: "https://pub.dev/api/",
	timeout: 10000,
});

const STABLE_RE = /(alpha|beta|dev|pre|rc)/i;

const pickLatestStable = (versions = []) =>
	versions
		.map((entry) => entry.version)
		.filter((version) => version && !STABLE_RE.test(version))
		.at(-1) || versions.at(-1)?.version || null;

const buildManualFlutterDetail = (dependency) => ({
	ecosystem: "flutter",
	name: dependency.name,
	version: dependency.version || dependency.rawRequirement || "manual",
	description:
		"This dependency is declared with a custom source or without a registry version, so live pub.dev metadata is not available.",
	badges: [
		"Flutter",
		dependency.isDev ? "dev_dependency" : "dependency",
		"Manual Source",
	],
	links: [],
	stats: [
		{ label: "Requirement", value: dependency.rawRequirement || "manual" },
		{ label: "Section", value: dependency.section || "dependencies" },
		{ label: "Lookup", value: "Manual review required" },
	],
	downloads: null,
	compatibility: [],
	versions: dependency.version
		? [
				{
					version: dependency.version,
					date: null,
					labels: ["current"],
					isLatest: true,
				},
			]
		: [],
	install: {
		label: "flutter",
		lines: [`flutter pub add ${dependency.name}`],
	},
});

export const getFlutterPackageInfo = async (dependency) => {
	const hit = cache.get(dependency.name);
	if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

	const { data } = await client.get(`/packages/${encodeURIComponent(dependency.name)}`);
	const version = pickLatestStable(data.versions || []);
	if (!version) throw new Error(`No stable pub.dev release found for ${dependency.name}`);

	const result = {
		version,
		homepage:
			data.latest?.pubspec?.homepage ||
			data.latest?.pubspec?.repository ||
			`https://pub.dev/packages/${dependency.name}`,
		repository: data.latest?.pubspec?.repository || null,
	};

	cache.set(dependency.name, { data: result, ts: Date.now() });
	return result;
};

export const getFlutterPackageDetails = async (dependency) => {
	const hit = detailCache.get(dependency.name);
	if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

	if (dependency.source === "pubspec-manual") {
		const detail = buildManualFlutterDetail(dependency);
		detailCache.set(dependency.name, { data: detail, ts: Date.now() });
		return detail;
	}

	const { data } = await client.get(`/packages/${encodeURIComponent(dependency.name)}`);
	const version = pickLatestStable(data.versions || []);
	if (!version) throw new Error(`No stable pub.dev release found for ${dependency.name}`);

	const latestStable =
		(data.versions || []).find((entry) => entry.version === version) || data.latest;
	const pubspec = latestStable?.pubspec || data.latest?.pubspec || {};
	const detail = {
		ecosystem: "flutter",
		name: dependency.name,
		version,
		description: pubspec.description || "",
		badges: ["Flutter", dependency.isDev ? "dev_dependency" : "dependency"],
		links: [
			{
				label: "pub.dev",
				type: "registry",
				url: `https://pub.dev/packages/${dependency.name}`,
			},
			...(pubspec.repository
				? [{ label: "Repository", type: "repository", url: pubspec.repository }]
				: []),
			...(pubspec.homepage
				? [{ label: "Homepage", type: "homepage", url: pubspec.homepage }]
				: []),
		],
		stats: [
			{ label: "Requirement", value: dependency.rawRequirement || "manual" },
			{ label: "SDK", value: pubspec.environment?.sdk || "Unknown" },
			{
				label: "Published",
				value: latestStable?.published || data.latest?.published || "Unknown",
				format: "date",
			},
		],
		downloads: null,
		compatibility: pubspec.environment?.sdk
			? [{ label: "Dart SDK", value: pubspec.environment.sdk }]
			: [],
		versions: (data.versions || [])
			.slice()
			.reverse()
			.slice(0, 14)
			.map((entry) => ({
				version: entry.version,
				date: entry.published || null,
				labels: [
					entry.version === version ? "latest" : null,
					STABLE_RE.test(entry.version) ? "pre-release" : "stable",
				].filter(Boolean),
				isLatest: entry.version === version,
			})),
		install: {
			label: "flutter",
			lines: [`flutter pub add ${dependency.name}`],
		},
	};

	detailCache.set(dependency.name, { data: detail, ts: Date.now() });
	return detail;
};

export const fetchFlutterPackagesInfo = async (
	dependencies,
	onResult,
	concurrency = 6,
) => {
	const queue = [...dependencies];

	const worker = async () => {
		while (queue.length > 0) {
			const dependency = queue.shift();
			if (!dependency) break;
			try {
				const data = await getFlutterPackageInfo(dependency);
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
