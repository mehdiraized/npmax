import path from "path";
import svelte from "rollup-plugin-svelte";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import filesize from "rollup-plugin-filesize";
import livereload from "rollup-plugin-livereload";
import terser from "@rollup/plugin-terser";
import postcss from "rollup-plugin-postcss";
import autoPreprocess from "svelte-preprocess";
import childProcess from "child_process";

const production = !process.env.ROLLUP_WATCH;

// Node built-ins and Electron must remain as require() calls at runtime
const builtins = [
	"electron",
	"child_process",
	"fs",
	"path",
	"util",
	"os",
	"events",
	"stream",
	"buffer",
	"crypto",
];

export default {
	external: builtins,
	input: "src/main.js",
	output: {
		sourcemap: true,
		format: "iife",
		name: "app",
		file: "public/build/bundle.js",
		globals: Object.fromEntries(builtins.map((m) => [m, `require("${m}")`])),
	},
	plugins: [
		postcss({
			extract: path.resolve("public/build/bundle.css"),
		}),
		svelte({
			preprocess: autoPreprocess(),
			compilerOptions: {
				dev: !production,
			},
		}),

		resolve({
			browser: true,
			dedupe: ["svelte"],
			exportConditions: ["svelte"],
		}),
		commonjs(),

		!production && serve(),
		!production && livereload("public"),
		production && terser(),
		filesize(),
	],
	onwarn: (warning, warn) => {
		// Suppress circular dependency warnings from Svelte internals and node_modules
		if (
			warning.code === "CIRCULAR_DEPENDENCY" &&
			warning.ids?.some((id) => id.includes("node_modules"))
		)
			return;
		// Suppress Svelte plugin warnings originating from node_modules packages
		if (
			warning.plugin === "svelte" &&
			warning.filename?.includes("node_modules")
		)
			return;
		warn(warning);
	},
	watch: {
		clearScreen: false,
	},
};

function serve() {
	let started = false;

	return {
		writeBundle() {
			if (!started) {
				started = true;

				childProcess.spawn("npm", ["run", "start", "--", "--dev"], {
					stdio: ["ignore", "inherit", "inherit"],
					shell: true,
				});
			}
		},
	};
}
