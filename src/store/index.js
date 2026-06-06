import { writable } from "svelte/store";

const safeJsonParse = (value, fallback) => {
	try {
		return JSON.parse(value);
	} catch {
		return fallback;
	}
};

export const normalizeProjects = (list) => {
	if (!Array.isArray(list)) return [];
	const seen = new Set();

	return list.filter((project) => {
		if (!project || typeof project !== "object") return false;
		const key =
			typeof project.path === "string" && project.path.trim()
				? `path:${project.path.trim()}`
				: `id:${project.id}:${project.name || ""}`;

		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
};

export const persistProjects = (list) => {
	const next = normalizeProjects(list);
	if (typeof window !== "undefined") {
		localStorage.setItem("projects", JSON.stringify(next));
	}
	return next;
};

const getStoredProjects = () => {
	if (typeof window === "undefined") return [];
	const stored = localStorage.getItem("projects");
	if (!stored || stored === "null") return [];
	const parsed = safeJsonParse(stored, []);
	return persistProjects(parsed);
};

const getStoredMenuActive = () => {
	if (typeof window === "undefined") return "installed-apps";
	const stored = localStorage.getItem("menuActive");
	if (stored === "settings") return "installed-apps";
	return stored && typeof stored === "string" ? stored : "installed-apps";
};

export const projects = writable(getStoredProjects());
export const menuActive = writable(getStoredMenuActive());

if (typeof window !== "undefined") {
	menuActive.subscribe((value) => {
		if (!value) {
			localStorage.removeItem("menuActive");
			return;
		}
		localStorage.setItem("menuActive", value);
	});
}
