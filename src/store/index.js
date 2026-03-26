import { writable } from "svelte/store";

const safeJsonParse = (value, fallback) => {
	try {
		return JSON.parse(value);
	} catch {
		return fallback;
	}
};

const getStoredProjects = () => {
	if (typeof window === "undefined") return [];
	const stored = localStorage.getItem("projects");
	if (!stored || stored === "null") return [];
	const parsed = safeJsonParse(stored, []);
	return Array.isArray(parsed) ? parsed : [];
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
