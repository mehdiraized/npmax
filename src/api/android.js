import axios from "axios";

const CACHE_TTL = 30 * 60 * 1000;
const cache = new Map();
const detailCache = new Map();

const mavenClient = axios.create({
	baseURL: "https://search.maven.org/",
	timeout: 10000,
});

const STABLE_RE = /(alpha|beta|rc|m\d+|preview|snapshot)/i;

const compareVersions = (a, b) => {
	const normalize = (value) =>
		String(value)
			.replace(/^v/i, "")
			.split(/[.\-+]/)
			.map((part) => {
				const numeric = Number(part);
				return Number.isNaN(numeric) ? part.toLowerCase() : numeric;
			});

	const partsA = normalize(a);
	const partsB = normalize(b);

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

const stableOnly = (versions = []) => versions.filter((item) => !STABLE_RE.test(item));

const extractXmlVersions = (xml = "") =>
	Array.from(xml.matchAll(/<version>([^<]+)<\/version>/g), (match) => match[1]);

const googleMetadataUrl = (group, artifact) =>
	`https://dl.google.com/dl/android/maven2/${group.replace(/\./g, "/")}/${artifact}/maven-metadata.xml`;

const fetchGoogleVersions = async (group, artifact) => {
	try {
		const { data } = await axios.get(googleMetadataUrl(group, artifact), {
			timeout: 10000,
			responseType: "text",
		});
		return extractXmlVersions(data);
	} catch {
		return [];
	}
};

const fetchMavenVersions = async (group, artifact) => {
	const { data } = await mavenClient.get("/solrsearch/select", {
		params: {
			q: `g:"${group}" AND a:"${artifact}"`,
			core: "gav",
			rows: 40,
			wt: "json",
		},
	});
	return (data.response?.docs || []).map((item) => item.v).filter(Boolean);
};

const isGooglePreferred = (group) =>
	group.startsWith("androidx.") ||
	group.startsWith("com.google.android") ||
	group.startsWith("com.android.");

const resolveVersions = async (group, artifact) => {
	const sources = isGooglePreferred(group)
		? [fetchGoogleVersions(group, artifact), fetchMavenVersions(group, artifact)]
		: [fetchMavenVersions(group, artifact), fetchGoogleVersions(group, artifact)];
	const results = await Promise.all(sources);
	const merged = [...new Set(results.flat().filter(Boolean))];
	return merged.sort(compareVersions);
};

const latestStable = (versions) => stableOnly(versions).pop() || versions.at(-1) || null;

export const getAndroidPackageInfo = async (dependency) => {
	const cacheKey = dependency.id;
	const hit = cache.get(cacheKey);
	if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

	const versions = await resolveVersions(dependency.group, dependency.artifact);
	const version = latestStable(versions);
	if (!version) throw new Error(`No versions found for ${dependency.displayName}`);

	const homepage = `https://mvnrepository.com/artifact/${dependency.group}/${dependency.artifact}`;
	const result = { version, homepage, repository: homepage };
	cache.set(cacheKey, { data: result, ts: Date.now() });
	return result;
};

export const getAndroidPackageDetails = async (dependency) => {
	const cacheKey = dependency.id;
	const hit = detailCache.get(cacheKey);
	if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

	const versions = await resolveVersions(dependency.group, dependency.artifact);
	const version = latestStable(versions);
	if (!version) throw new Error(`No versions found for ${dependency.displayName}`);

	const detail = {
		ecosystem: "android",
		name: dependency.displayName,
		version,
		description: `${dependency.configuration || "dependency"} from ${dependency.group}`,
		badges: [
			dependency.source === "version-catalog" ? "Version Catalog" : "Gradle",
			isGooglePreferred(dependency.group) ? "Google Maven" : "Maven Central",
		],
		links: [
			{
				label: "Maven",
				type: "registry",
				url: `https://mvnrepository.com/artifact/${dependency.group}/${dependency.artifact}`,
			},
			{
				label: "Google",
				type: "homepage",
				url: googleMetadataUrl(dependency.group, dependency.artifact),
			},
		],
		stats: [
			{ label: "Group", value: dependency.group },
			{ label: "Artifact", value: dependency.artifact },
			{ label: "Requirement", value: dependency.rawRequirement || "Unpinned" },
		],
		downloads: null,
		compatibility: [
			{ label: "Source", value: dependency.source === "version-catalog" ? "Catalog" : "Gradle" },
		],
		versions: versions
			.slice()
			.reverse()
			.slice(0, 14)
			.map((item) => ({
				version: item,
				date: null,
				labels: [
					item === version ? "latest" : null,
					STABLE_RE.test(item) ? "pre-release" : "stable",
				].filter(Boolean),
				isLatest: item === version,
			})),
		install: {
			label: dependency.source === "version-catalog" ? "catalog" : "gradle",
			lines:
				dependency.source === "version-catalog"
					? [`${dependency.alias} = { module = "${dependency.group}:${dependency.artifact}", version = "${version}" }`]
					: [`${dependency.configuration || "implementation"}("${dependency.group}:${dependency.artifact}:${version}")`],
		},
	};

	detailCache.set(cacheKey, { data: detail, ts: Date.now() });
	return detail;
};

export const fetchAndroidPackagesInfo = async (
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
				const data = await getAndroidPackageInfo(dependency);
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
