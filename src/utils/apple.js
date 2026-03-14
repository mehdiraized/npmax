const SWIFT_PACKAGE_PREFIX = ".package";

const SWIFT_VERSION_PATTERNS = [
	{ kind: "from", regex: /from:\s*"([^"]+)"/ },
	{ kind: "exact", regex: /exact:\s*"([^"]+)"/ },
	{ kind: "revision", regex: /revision:\s*"([^"]+)"/ },
	{ kind: "branch", regex: /branch:\s*"([^"]+)"/ },
	{
		kind: "upToNextMajor",
		regex: /upToNextMajor\s*\(\s*from:\s*"([^"]+)"\s*\)/,
	},
	{
		kind: "upToNextMinor",
		regex: /upToNextMinor\s*\(\s*from:\s*"([^"]+)"\s*\)/,
	},
	{
		kind: "range",
		regex: /"([^"]+)"\s*\.\.<\s*"([^"]+)"/,
		getValue: (match) => `${match[1]} ..< ${match[2]}`,
	},
];

const POD_LINE_RE = /^\s*pod\s+['"]([^'"]+)['"]\s*(?:,\s*['"]([^'"]+)['"])?/gm;

export const normalizeVersionConstraint = (raw) => {
	if (typeof raw !== "string") return null;
	const cleaned = raw
		.trim()
		.replace(/^v/i, "")
		.replace(/^~>\s*/, "")
		.replace(/^(\^|~|>=|<=|>|<|=)\s*/, "")
		.trim();
	return /^\d/.test(cleaned) ? cleaned : null;
};

const stripGitSuffix = (value = "") => value.replace(/\.git$/i, "");

const displayNameFromSource = (source = "") =>
	stripGitSuffix(source)
		.split(/[/:]/)
		.filter(Boolean)
		.pop() || source;

const matchSwiftVersion = (block) => {
	for (const pattern of SWIFT_VERSION_PATTERNS) {
		const match = block.match(pattern.regex);
		if (!match) continue;

		const value =
			typeof pattern.getValue === "function" ? pattern.getValue(match) : match[1];
		const captureIndex = match.index + match[0].indexOf(match[1]);
		return {
			kind: pattern.kind,
			value,
			start: captureIndex,
			end: captureIndex + match[1].length,
		};
	}
	return null;
};

export const extractSwiftPackageBlocks = (raw) => {
	const blocks = [];
	let cursor = 0;

	while (cursor < raw.length) {
		const prefixIndex = raw.indexOf(SWIFT_PACKAGE_PREFIX, cursor);
		if (prefixIndex === -1) break;

		const openParenIndex = raw.indexOf("(", prefixIndex);
		if (openParenIndex === -1) break;

		let depth = 0;
		let closeParenIndex = openParenIndex;
		for (; closeParenIndex < raw.length; closeParenIndex++) {
			const char = raw[closeParenIndex];
			if (char === "(") depth++;
			if (char === ")") depth--;
			if (depth === 0) break;
		}

		if (depth !== 0) break;

		blocks.push({
			start: prefixIndex,
			end: closeParenIndex + 1,
			text: raw.slice(prefixIndex, closeParenIndex + 1),
		});
		cursor = closeParenIndex + 1;
	}

	return blocks;
};

export const parseSwiftManifest = (raw) => {
	const packageNameMatch = raw.match(/name:\s*"([^"]+)"/);
	const dependencies = extractSwiftPackageBlocks(raw).map((block, index) => {
		const urlMatch = block.text.match(/url:\s*"([^"]+)"/);
		const pathMatch = block.text.match(/path:\s*"([^"]+)"/);
		const nameMatch = block.text.match(/name:\s*"([^"]+)"/);
		const versionMatch = matchSwiftVersion(block.text);
		const repositoryUrl = urlMatch?.[1] || null;
		const localPath = pathMatch?.[1] || null;
		const explicitName = nameMatch?.[1] || null;
		const displayName =
			explicitName ||
			(repositoryUrl ? displayNameFromSource(repositoryUrl) : null) ||
			(localPath ? displayNameFromSource(localPath) : `dependency-${index + 1}`);

		const sourceType = localPath
			? "local"
			: repositoryUrl?.includes("github.com")
				? "github"
				: repositoryUrl
					? "remote"
					: "unknown";

		return {
			id: `${displayName}:${repositoryUrl || localPath || index}`,
			name: displayName,
			displayName,
			repositoryUrl,
			localPath,
			sourceType,
			rawRequirement: versionMatch?.value || null,
			version: versionMatch?.value || null,
			versionKind: versionMatch?.kind || null,
			versionStart:
				versionMatch == null ? null : block.start + versionMatch.start,
			versionEnd: versionMatch == null ? null : block.start + versionMatch.end,
			blockStart: block.start,
			blockEnd: block.end,
			blockText: block.text,
		};
	});

	return {
		name: packageNameMatch?.[1] || "",
		dependencies,
	};
};

export const parsePodfile = (raw) => {
	const dependencies = [];
	let match;

	while ((match = POD_LINE_RE.exec(raw)) !== null) {
		const version = match[2] || null;
		const versionStart =
			version == null ? null : match.index + match[0].lastIndexOf(version);

		dependencies.push({
			id: `${match[1]}:${match.index}`,
			name: match[1],
			displayName: match[1],
			version,
			rawRequirement: version,
			versionStart,
			versionEnd: version == null ? null : versionStart + version.length,
			lineStart: match.index,
			lineEnd: match.index + match[0].length,
		});
	}

	return { dependencies };
};
