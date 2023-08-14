// const fixPath = require("fix-path");
// fixPath();
const util = require("util");
const fs = require("fs");

const { ipcRenderer } = require("electron");
const exec = util.promisify(require("child_process").exec);
const readFile = util.promisify(fs.readFile);

export const globalPackages = async () => {
	let yarn = await yarnPackages();
	let npm = await npmPackages();
	let pnpm = await pnpmPackages();
	return {
		yarn,
		npm,
		pnpm,
	};
};

export const openDirectory = async () => ipcRenderer.invoke("show-open-dialog");

export const getProjectPackages = (path) => {
	return readFile(`${path}/package.json`, "utf-8");
};

export const yarnPackages = async () => {
	try {
		const { stdout } = await exec("yarn -v");
		return stdout;
	} catch (err) {
		return false;
	}
};

export const npmPackages = async () => {
	try {
		const { stdout } = await exec("npm -v");
		return stdout;
	} catch (err) {
		return false;
	}
};

export const pnpmPackages = async () => {
	try {
		const { stdout } = await exec("pnpm -v");
		return stdout;
	} catch (err) {
		return false;
	}
};
