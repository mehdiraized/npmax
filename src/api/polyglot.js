import axios from "axios";

const CACHE_TTL = 30 * 60 * 1000;
const cache = new Map();
const detailCache = new Map();

const cratesClient = axios.create({
	baseURL: "https://crates.io/api/v1/",
	timeout: 10000,
});

const gemsClient = axios.create({
	baseURL: "https://rubygems.org/api/v1/",
	timeout: 10000,
});

const latestGoVersion = async (modulePath) => {
	const escaped = modulePath.replace(/!/g, "!!").replace(/([A-Z])/g, "!$1").toLowerCase();
	const { data } = await axios.get(`https://proxy.golang.org/${escaped}/@latest`, {
		timeout: 10000,
	});
	return typeof data === "string" ? JSON.parse(data) : data;
};

const getGoPackageInfo = async (dependency) => {
	const data = await latestGoVersion(dependency.name);
	return {
		version: data.Version,
		homepage: data.Origin?.URL || `https://${dependency.name}`,
		repository: data.Origin?.URL || null,
		published: data.Time || null,
	};
};

const getRustPackageInfo = async (dependency) => {
	const { data } = await cratesClient.get(`/crates/${encodeURIComponent(dependency.name)}`);
	return {
		version: data.crate?.newest_version || data.crate?.max_stable_version || null,
		homepage:
			data.crate?.homepage || data.crate?.repository || `https://crates.io/crates/${dependency.name}`,
		repository: data.crate?.repository || null,
		downloads: data.crate?.downloads || null,
		description: data.crate?.description || "",
	};
};

const getRubyPackageInfo = async (dependency) => {
	const { data } = await gemsClient.get(`/gems/${encodeURIComponent(dependency.name)}.json`);
	return {
		version: data.version,
		homepage: data.homepage_uri || data.project_uri,
		repository: data.source_code_uri || null,
		downloads: data.downloads || null,
		description: data.info || "",
	};
};

const providers = {
	go: getGoPackageInfo,
	rust: getRustPackageInfo,
	ruby: getRubyPackageInfo,
};

const buildManualPolyglotDetail = (ecosystem, dependency) => {
	const labels = {
		go: "Go Modules",
		rust: "Rust / Cargo",
		ruby: "Ruby / Bundler",
	};
	const installLines = {
		go: [`go get ${dependency.name}`],
		rust: [`cargo add ${dependency.name}`],
		ruby: [`gem "${dependency.name}"`],
	};

	return {
		ecosystem,
		name: dependency.name,
		version: dependency.version || dependency.rawRequirement || "manual",
		description:
			"This dependency does not expose a pinned registry version in the manifest, so npMax cannot compare remote releases automatically.",
		badges: [labels[ecosystem], "Manual Source"],
		links: [],
		stats: [
			{ label: "Requirement", value: dependency.rawRequirement || "manual" },
			{ label: "Source", value: dependency.source || ecosystem },
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
			label: ecosystem,
			lines: installLines[ecosystem],
		},
	};
};

export const getPolyglotPackageInfo = async (ecosystem, dependency) => {
	const key = `${ecosystem}:${dependency.name}`;
	const hit = cache.get(key);
	if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

	const provider = providers[ecosystem];
	if (!provider) throw new Error(`Unsupported ecosystem ${ecosystem}`);
	const data = await provider(dependency);
	cache.set(key, { data, ts: Date.now() });
	return data;
};

export const getPolyglotPackageDetails = async (ecosystem, dependency) => {
	const key = `${ecosystem}:${dependency.name}`;
	const hit = detailCache.get(key);
	if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

	if (!dependency.version && ecosystem === "ruby") {
		const detail = buildManualPolyglotDetail(ecosystem, dependency);
		detailCache.set(key, { data: detail, ts: Date.now() });
		return detail;
	}

	const info = await getPolyglotPackageInfo(ecosystem, dependency);
	const labels = {
		go: "Go Modules",
		rust: "Rust / Cargo",
		ruby: "Ruby / Bundler",
	};
	const installLines = {
		go: [`go get ${dependency.name}@${info.version}`],
		rust: [`cargo add ${dependency.name}@${info.version}`],
		ruby: [`gem "${dependency.name}", "${info.version}"`],
	};

	const detail = {
		ecosystem,
		name: dependency.name,
		version: info.version,
		description: info.description || "",
		badges: [labels[ecosystem]],
		links: [
			...(info.homepage ? [{ label: "Homepage", type: "homepage", url: info.homepage }] : []),
			...(info.repository ? [{ label: "Repository", type: "repository", url: info.repository }] : []),
		],
		stats: [
			{ label: "Requirement", value: dependency.rawRequirement || "manual" },
			...(info.downloads ? [{ label: "Downloads", value: info.downloads, format: "number" }] : []),
		],
		downloads: null,
		compatibility: [],
		versions: [
			{
				version: info.version,
				date: info.published || null,
				labels: ["latest"],
				isLatest: true,
			},
		],
		install: {
			label: ecosystem,
			lines: installLines[ecosystem],
		},
	};

	detailCache.set(key, { data: detail, ts: Date.now() });
	return detail;
};

export const fetchPolyglotPackagesInfo = async (
	ecosystem,
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
				const data = await getPolyglotPackageInfo(ecosystem, dependency);
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
