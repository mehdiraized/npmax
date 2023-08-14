<script>
	import { onMount } from "svelte";
	import SimpleBar from "../components/SimpleBar.svelte";
	import { projects, menuActive } from "../store";
	import { globalPackages, openDirectory } from "../utils/shell.js";
	import { isJson } from "../utils/index.js";
	import NpmIcon from "../icons/npm.svelte";
	import PnpmIcon from "../icons/pnpm.svelte";
	import YarnIcon from "../icons/yarn.svelte";

	let packages = {};
	onMount(async () => {
		packages = isJson(localStorage.getItem("packages"))
			? JSON.parse(localStorage.getItem("packages"))
			: {};
		projects.set(
			localStorage.getItem("projects") !== "null"
				? JSON.parse(localStorage.getItem("projects") || false)
				: []
		);
		packages = await globalPackages().then((res) => res);
		localStorage.setItem("packages", JSON.stringify(packages));
	});
</script>

<aside class="sidebar">
	<SimpleBar maxHeight={"calc(100vh - 105px)"}>
		<section class="sidebarList">
			{#if packages.npm || packages.yarn || packages.pnpm}
				<h1 class="sidebarList__title">Globals</h1>
			{/if}
			{#if packages.npm}
				<button class="sidebarList__item">
					<figure class="ui__iconGlobal">
						<NpmIcon />
					</figure>
					Npm
					<span>{packages.npm}</span>
				</button>
			{/if}
			{#if packages.yarn}
				<button class="sidebarList__item">
					<figure class="ui__iconGlobal">
						<YarnIcon />
					</figure>
					Yarn
					<span>{packages.yarn}</span>
				</button>
			{/if}
			{#if packages.pnpm}
				<button class="sidebarList__item">
					<figure class="ui__iconGlobal">
						<PnpmIcon />
					</figure>
					Pnpm
					<span>{packages.pnpm}</span>
				</button>
			{/if}
		</section>
		<section class="sidebarList">
			<h1 class="sidebarList__title">Projects</h1>
			{#if $projects}
				{#each $projects as { id, name, path }}
					<button
						class:active={$menuActive === `project_${id}`}
						class="sidebarList__item"
						on:click={() => {
							menuActive.set(`project_${id}`);
						}}
					>
						<svg
							class="ui__iconProject"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2
                3h9a2 2 0 0 1 2 2z"
							/>
						</svg>
						{name}
						<button
							class="sidebarList__itemRemove"
							on:click={() => {
								const projectFilter = $projects.filter((item) => {
									return item.id !== id;
								});
								projects.set(projectFilter);
								menuActive.set(null);
								localStorage.setItem("projects", JSON.stringify(projectFilter));
							}}
						>
							<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
								<line x1="18" x2="6" y1="6" y2="18" />
								<line x1="6" x2="18" y1="6" y2="18" />
							</svg>
						</button>
					</button>
				{/each}
			{/if}
		</section>
	</SimpleBar>
	<button
		class="addProject"
		on:click={() => {
			openDirectory()
				.then((result) => {
					if (result.length > 0) {
						const projectPath = result[0];
						const projectPathArray = result[0].split("/");
						const projectName = projectPathArray[projectPathArray.length - 1];
						projects.set([
							...$projects,
							{
								id: $projects[$projects?.length - 1]
									? $projects[$projects?.length - 1].id + 1
									: 0,
								name: projectName,
								path: projectPath,
							},
						]);
						localStorage.setItem("projects", JSON.stringify($projects));
					}
				})
				.catch((err) => {
					console.error(err);
				});
		}}
	>
		Add Project
	</button>
</aside>

<style lang="scss">
	.sidebar {
		background: rgba(0, 0, 0, 0.1);
		width: 250px;
		height: 100vh;
		color: #fff;
		box-sizing: border-box;
		padding: 40px 15px 15px;
		-webkit-app-region: drag;
		// -webkit-user-select: none;
		position: sticky;
		top: 0;
	}
	.sidebarList__title {
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.5px;
		color: rgba(255, 255, 255, 0.2);
		display: block;
	}
	.sidebarList {
		display: block;
		// margin-bottom: 15px;
	}
	.sidebarList__item {
		-webkit-app-region: none;
		text-align: left;
		width: 100%;
		border: none;
		color: #fff;
		padding: 7px 15px;
		background-color: transparent;
		border-radius: 7px;
		font-size: 14px;
		position: relative;
		display: block;
		height: 30px;
		line-height: normal;
		transition: all 0.3s ease-in-out;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		span {
			float: right;
			background-color: rgba(255, 255, 255, 0.1);
			color: #fff;
			padding: 1px 5px 0;
			border-radius: 50px;
			font-size: 12px;
			transition: all 0.3s ease-in-out;
		}
		&:hover {
			.ui__iconProject {
				fill: #fff;
			}
		}
		&.active {
			background-color: rgba(255, 255, 255, 0.1);
			padding-right: 30px;
			// span {
			// 	background-color: rgba(255, 255, 255, 0.2);
			// }
			.sidebarList__itemRemove {
				opacity: 1;
			}
			.ui__iconProject {
				fill: #fff;
			}
		}
	}
	.sidebarList__itemRemove {
		opacity: 0;
		transition: all 0.3s ease-in-out;
		position: absolute;
		background-color: rgba(255, 255, 255, 0.1);
		width: 20px;
		height: 20px;
		border-radius: 20px;
		border: none;
		top: 5px;
		right: 5px;

		&:hover {
			background-color: rgba(0, 0, 0, 1);
		}

		svg {
			position: absolute;
			display: block;
			width: 14px;
			stroke-width: 2px;
			stroke: #fff;
			height: 14px;
			top: 0;
			bottom: 0;
			right: 0;
			left: 0;
			margin: auto;
		}
	}
	.ui__iconProject {
		width: 18px;
		margin-right: 15px;
		float: left;
		line-height: 0;
		margin-top: -1px;
		stroke: #fff;
		transition: all 0.3s ease-in-out;
		fill: transparent;
	}
	.ui__iconGlobal {
		float: left;
		width: 25px;
		margin-right: 15px;
		line-height: 0;
		margin-top: -5px;
		margin-left: -5px;
		margin-bottom: 0;
		padding: 2px;
		fill: #fff;
		transition: all 0.3s ease-in-out;
	}
	.addProject {
		margin-top: 15px;
		width: 100%;
		border: none;
		cursor: pointer;
		background-color: rgba(0, 0, 0, 0.3);
		color: #fff;
		padding: 10px;
		border-radius: 5px;
		display: block;
		-webkit-app-region: none;
	}
</style>
