const GRADLE_DEP_RE =
	/^\s*([A-Za-z][A-Za-z0-9]*)\s*\(?\s*['"]([^:'"]+):([^:'"]+):([^'"]+)['"]\s*\)?/gm;

const TOML_SECTION_RE = /^\s*\[([^\]]+)\]\s*$/;
const TOML_VERSION_RE = /^\s*([A-Za-z0-9._-]+)\s*=\s*"([^"]+)"\s*$/;
const TOML_LIBRARY_RE = /^\s*([A-Za-z0-9._-]+)\s*=\s*\{(.+)\}\s*$/;

const normalizeCatalogAlias = (value) => value.replace(/\./g, "-");

export const normalizeAndroidVersion = (raw) => {
	if (typeof raw !== "string") return null;
	const cleaned = raw
		.trim()
		.replace(/^v/i, "")
		.replace(/^(\^|~|>=|<=|>|<|=)\s*/, "")
		.replace(/^\[\s*/, "")
		.replace(/\s*\)$/, "")
		.trim();
	return /^\d/.test(cleaned) ? cleaned : null;
};

export const parseGradleManifest = (raw) => {
	const dependencies = [];
	let match;

	while ((match = GRADLE_DEP_RE.exec(raw)) !== null) {
		const [full, configuration, group, artifact, version] = match;
		const versionStart = match.index + full.lastIndexOf(version);
		dependencies.push({
			id: `${configuration}:${group}:${artifact}:${match.index}`,
			name: `${group}:${artifact}`,
			displayName: `${group}:${artifact}`,
			group,
			artifact,
			version,
			rawRequirement: version,
			configuration,
			versionStart,
			versionEnd: versionStart + version.length,
			lineStart: match.index,
			lineEnd: match.index + full.length,
			source: "gradle",
		});
	}

	return { dependencies };
};

const parseTomlInlineFields = (rawFields) => {
	const fields = {};
	for (const part of rawFields.split(",")) {
		const [rawKey, ...rawValue] = part.split("=");
		if (!rawKey || rawValue.length === 0) continue;
		fields[rawKey.trim()] = rawValue.join("=").trim().replace(/^"|"$/g, "");
	}
	return fields;
};

export const parseVersionCatalog = (raw) => {
	const lines = raw.split(/\r?\n/);
	const versions = {};
	const versionLocations = {};
	const libraries = [];

	let section = "";
	let cursor = 0;

	for (const line of lines) {
		const lineStart = cursor;
		cursor += line.length + 1;

		const sectionMatch = line.match(TOML_SECTION_RE);
		if (sectionMatch) {
			section = sectionMatch[1];
			continue;
		}

		if (section === "versions") {
			const match = line.match(TOML_VERSION_RE);
			if (!match) continue;
			const alias = match[1];
			const version = match[2];
			const versionStart = lineStart + line.indexOf(`"${version}"`) + 1;
			versions[alias] = version;
			versionLocations[alias] = {
				versionStart,
				versionEnd: versionStart + version.length,
				lineStart,
				lineEnd: lineStart + line.length,
			};
			continue;
		}

		if (section === "libraries") {
			const match = line.match(TOML_LIBRARY_RE);
			if (!match) continue;
			const alias = match[1];
			const fields = parseTomlInlineFields(match[2]);
			const module = fields.module || null;
			const group = fields.group || module?.split(":")[0] || null;
			const artifact = fields.name || module?.split(":")[1] || null;
			const versionRef = fields["version.ref"] || null;
			const inlineVersion = fields.version || null;
			const resolvedVersion = versionRef ? versions[versionRef] || null : inlineVersion;
			const inlineNeedle = inlineVersion ? `"${inlineVersion}"` : null;
			const inlineVersionStart =
				inlineNeedle && line.includes(inlineNeedle)
					? lineStart + line.indexOf(inlineNeedle) + 1
					: null;

			libraries.push({
				id: `catalog:${alias}:${lineStart}`,
				alias,
				name: module || `${group}:${artifact}`,
				displayName: module || `${group}:${artifact}`,
				group,
				artifact,
				version: resolvedVersion,
				rawRequirement: resolvedVersion,
				versionRef,
				versionStart: versionRef
					? versionLocations[versionRef]?.versionStart ?? null
					: inlineVersionStart,
				versionEnd: versionRef
					? versionLocations[versionRef]?.versionEnd ?? null
					: inlineVersionStart == null
						? null
						: inlineVersionStart + inlineVersion.length,
				lineStart,
				lineEnd: lineStart + line.length,
				source: "version-catalog",
				versionAlias: versionRef ? normalizeCatalogAlias(versionRef) : alias,
			});
		}
	}

	return { dependencies: libraries, versions, versionLocations };
};
