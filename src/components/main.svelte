<script>
	import toast, { Toaster } from "svelte-french-toast";
	import SimpleBar from "../components/SimpleBar.svelte";
	import { projects, menuActive } from "../store";
	import { getPackageInfo } from "../api";
	import { openDirectory, getProjectPackages } from "../utils/shell.js";

	let currentProjectID = false;
	let currentProject = {};
	let project = {};
	let packages = [];
	let dependencies = [];
	let devDependencies = [];

	menuActive.subscribe(async (value) => {
		currentProjectID = value ? value.split("_")[1] : false;
		currentProject = $projects.filter((item) => {
			return item.id === parseInt(currentProjectID);
		})[0];
		if (currentProject) {
			const data = await getProjectPackages(currentProject.path).then(
				(res) => res
			);
			console.log({ currentProject });
			project = JSON.parse(data);
			console.log({ project });
			packages = [];
			dependencies = project.dependencies
				? Object.entries(project.dependencies)
				: [];
			devDependencies = project.devDependencies
				? Object.entries(project.devDependencies)
				: [];
			let i = 1;
			for await (let item of dependencies) {
				packages = [
					...packages,
					{ id: i, name: item[0], current: item[1], dev: false },
				];
				i++;
			}
			for await (let item of devDependencies) {
				packages = [
					...packages,
					{ id: i, name: item[0], current: item[1], dev: true },
				];
				i++;
			}
			try {
				for await (let pack of packages) {
					const res = await getPackageInfo(pack.name);
					const objIndex = packages.findIndex((obj) => obj.name === pack.name);
					packages[objIndex] = { ...packages[objIndex], ...res };
				}
			} catch (error) {
				toast("No Internet!", {
					icon: "🌐",
					style: "border-radius: 200px; background: #333; color: #fff;",
					position: "bottom-center",
				});
			}
		}
	});
</script>

<div class="content">
	<SimpleBar maxHeight={"calc(100vh - 20px)"}>
		{#if !currentProject}
			<section class="empty">
				<img src="./images/add.png" width="300" alt="" />
				<h1>Select Project to start</h1>
				<button
					on:click={async () => {
						openDirectory()
							.then((result) => {
								if (result.length > 0) {
									const projectPath = result[0];
									const projectPathArray = result[0].split("/");
									const projectName =
										projectPathArray[projectPathArray.length - 1];
									projects.set([
										...$projects,
										{
											id: $projects[$projects.length - 1]
												? $projects[$projects.length - 1].id + 1
												: 0,
											name: projectName,
											path: projectPath,
										},
									]);
									localStorage.setItem("projects", JSON.stringify($projects));
								}
							})
							.catch((err) => {
								console.log(err);
							});
					}}
				>
					Add Project
				</button>
			</section>
		{:else}
			<section class="projectTable">
				<h1 class="projectTable__title">{currentProject.name}</h1>
				<table>
					<thead>
						<tr>
							<td>Package</td>
							<td>Version</td>
							<td>env</td>
							<td>Info</td>
						</tr>
					</thead>
					<tbody>
						{#if packages}
							{#each packages as { id, name, current, dev, version, bugs, homepage, repository }}
								<tr id={`package_${id}`}>
									<td>{name}</td>
									<td>
										{current}
										{#if !version}
											<span class="skeleton" />
										{:else if current.replace("^", "") === version}
											<svg
												class="projectTable__versionCheck"
												viewBox="0 0 24 24"
												xmlns="http://www.w3.org/2000/svg"
											>
												<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
												<polyline points="22 4 12 14.01 9 11.01" />
											</svg>
										{:else}(Latest {version}){/if}
									</td>
									<td>
										{#if dev}dev{/if}
									</td>
									<td>
										{#if !bugs && !homepage && !repository}
											<span class="skeleton" />
										{:else}
											{#if bugs}
												<a class="projectAction" href={bugs.url} title="Issues">
													<svg
														viewBox="0 0 2048 2048"
														xmlns="http://www.w3.org/2000/svg"
													>
														<path
															d="M1608 897q65 2 122 27.5t99 68.5 66.5 100.5T1920
                            1216v192h-128v-192q0-32-10.5-61.5t-29-54-44.5-42-57-26.5q6
                            29 9.5 59.5t3.5 60.5v256q0 7-1 13t-2 13l6-6q60 60 92
                            138t32 163-32 162.5-92 137.5l-90-90q42-42
                            64-95.5t22-113.5q0-68-31-132-31 100-90.5 183T1402
                            1923t-176.5 92-201.5
                            33-201.5-33-176.5-92-139.5-142-90.5-183q-31 64-31
                            132 0 60 22 113.5t64 95.5l-90
                            90q-60-60-92.5-137.5T256 1729t32.5-163 92.5-138l6
                            6q-1-7-2-13t-1-13v-256q0-30 3.5-60.5t9.5-59.5q-31
                            9-57 26.5t-44.5 42-29 54T256 1216v192H128v-192q0-65
                            24.5-122.5T219 993t99-68.5T440 897q31-70
                            80-135-57-10-105.5-38.5T331 653t-55-94.5T256
                            448V256h128v192q0 40 15 75t41 61 61 41 75
                            15h64v3q47-35 96-59-15-32-23.5-66.5T704 448q0-70
                            31-135L595 173l90-90 127 127q45-39 98.5-60.5T1024
                            128t113.5 21.5T1236 210l127-127 90 90-140 140q31 65
                            31 135 0 35-8.5 69.5T1312 584q26 13 49.5 27.5T1408
                            643v-3h64q40 0 75-15t61-41 41-61 15-75V256h128v192q0
                            58-20 110.5t-55 94.5-83.5 70.5T1528 762q49 65 80
                            135zm-584-641q-40 0-75 15t-61 41-41 61-15 75q0 50 24
                            90 42-11 83.5-17.5t84.5-6.5 84.5 6.5T1192 538q24-40
                            24-90 0-40-15-75t-41-61-61-41-75-15zm512
                            896q0-104-41-197t-110.5-163T1222 681t-198-41-198
                            41-162.5 111T553 955t-41 197v256q0 106 40.5 199t110
                            162.5 162.5 110 199 40.5 199-40.5 162.5-110
                            110-162.5 40.5-199v-256z"
														/>
													</svg>
													<span class="tooltipText">Issues</span>
												</a>
											{/if}
											{#if homepage}
												<a
													class="projectAction"
													href={homepage}
													title="Home Page"
												>
													<svg
														viewBox="0 0 32 32"
														xmlns="http://www.w3.org/2000/svg"
													>
														<path
															d="M 16 2.59375 L 15.28125 3.28125 L 2.28125
                            16.28125 L 3.71875 17.71875 L 5 16.4375 L 5 28 L 14
                            28 L 14 18 L 18 18 L 18 28 L 27 28 L 27 16.4375 L
                            28.28125 17.71875 L 29.71875 16.28125 L 16.71875
                            3.28125 Z M 16 5.4375 L 25 14.4375 L 25 26 L 20 26 L
                            20 16 L 12 16 L 12 26 L 7 26 L 7 14.4375 Z"
														/>
													</svg>
													<span class="tooltipText">Home Page</span>
												</a>
											{/if}
											<a
												class="projectAction"
												href={`https://www.npmjs.com/package/${name}`}
												title="Npm"
											>
												<svg
													viewBox="0 0 32 32"
													xmlns="http://www.w3.org/2000/svg"
												>
													<path
														d="M 0 10 L 0 21 L 9 21 L 9 23 L 16 23 L 16 21 L 32
                            21 L 32 10 L 0 10 z M 1.7773438 11.777344 L
                            8.8886719 11.777344 L 8.890625 11.777344 L 8.890625
                            19.445312 L 7.1113281 19.445312 L 7.1113281
                            13.556641 L 5.3339844 13.556641 L 5.3339844
                            19.445312 L 1.7773438 19.445312 L 1.7773438
                            11.777344 z M 10.667969 11.777344 L 17.777344
                            11.777344 L 17.779297 11.777344 L 17.779297
                            19.443359 L 14.222656 19.443359 L 14.222656
                            21.222656 L 10.667969 21.222656 L 10.667969
                            11.777344 z M 19.556641 11.777344 L 30.222656
                            11.777344 L 30.224609 11.777344 L 30.224609
                            19.445312 L 28.445312 19.445312 L 28.445312
                            13.556641 L 26.667969 13.556641 L 26.667969
                            19.445312 L 24.890625 19.445312 L 24.890625
                            13.556641 L 23.111328 13.556641 L 23.111328
                            19.445312 L 19.556641 19.445312 L 19.556641
                            11.777344 z M 14.222656 13.556641 L 14.222656
                            17.667969 L 16 17.667969 L 16 13.556641 L 14.222656
                            13.556641 z"
													/>
												</svg>
												<span class="tooltipText">Npm</span>
											</a>
											{#if repository}
												<a
													class="projectAction"
													href={repository.url}
													title="Repository"
												>
													<svg
														viewBox="0 0 48 47"
														xmlns="http://www.w3.org/2000/svg"
													>
														<g
															fill="none"
															fillRule="evenodd"
															stroke="none"
															strokeWidth="1"
														>
															<g
																fill="#000"
																transform="translate(-700.000000, -560.000000)"
															>
																<path
																	d="M723.9985,560 C710.746,560 700,570.787092
                                700,584.096644 C700,594.740671 706.876,603.77183
                                716.4145,606.958412 C717.6145,607.179786
                                718.0525,606.435849 718.0525,605.797328
                                C718.0525,605.225068 718.0315,603.710086
                                718.0195,601.699648 C711.343,603.155898
                                709.9345,598.469394 709.9345,598.469394
                                C708.844,595.686405 707.2705,594.94548
                                707.2705,594.94548 C705.091,593.450075
                                707.4355,593.480194 707.4355,593.480194
                                C709.843,593.650366 711.1105,595.963499
                                711.1105,595.963499 C713.2525,599.645538
                                716.728,598.58234 718.096,597.964902
                                C718.3135,596.407754 718.9345,595.346062
                                719.62,594.743683 C714.2905,594.135281
                                708.688,592.069123 708.688,582.836167
                                C708.688,580.205279 709.6225,578.054788
                                711.1585,576.369634 C710.911,575.759726
                                710.0875,573.311058 711.3925,569.993458
                                C711.3925,569.993458 713.4085,569.345902
                                717.9925,572.46321 C719.908,571.928599
                                721.96,571.662047 724.0015,571.651505
                                C726.04,571.662047 728.0935,571.928599
                                730.0105,572.46321 C734.5915,569.345902
                                736.603,569.993458 736.603,569.993458
                                C737.9125,573.311058 737.089,575.759726
                                736.8415,576.369634 C738.3805,578.054788
                                739.309,580.205279 739.309,582.836167
                                C739.309,592.091712 733.6975,594.129257
                                728.3515,594.725612 C729.2125,595.469549
                                729.9805,596.939353 729.9805,599.18773
                                C729.9805,602.408949 729.9505,605.006706
                                729.9505,605.797328 C729.9505,606.441873
                                730.3825,607.191834 731.6005,606.9554
                                C741.13,603.762794 748,594.737659 748,584.096644
                                C748,570.787092 737.254,560 723.9985,560"
																/>
															</g>
														</g>
													</svg>
													<span class="tooltipText">Repository</span>
												</a>
											{/if}
										{/if}
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</section>
		{/if}
	</SimpleBar>
</div>
<Toaster />

<style lang="scss">
	.content {
		background-color: #1d1d1d;
		width: 100%;
		height: 100vh;
		border-left: 1px solid #000;
		padding: 10px;
		// overflow: hidden;
	}

	.empty {
		text-align: center;
		color: #fff;
		font-size: 15px;
		display: flex;
		justify-items: center;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		height: 100%;
		min-height: 100vh;

		img {
			width: 250px;
			margin-bottom: 15px;
		}

		button {
			cursor: pointer;
			background-color: #000;
			border: none;
			color: #fff;
			padding: 10px;
			border-radius: 5px;
			display: block;
		}
	}
	.projectTable {
		color: #fff;

		table {
			width: 100%;
			border: none;
			border-collapse: collapse;
			thead {
				td {
					border: none;
					margin: 0;
					padding: 15px;
					background-color: rgba(0, 0, 0, 0.5);
					&:first-child {
						border-radius: 15px 0 0 0;
					}
					&:last-child {
						border-radius: 0 15px 0 0;
					}
				}
			}
			tbody {
				tr {
					td {
						padding: 5px 15px;
						background-color: rgba(0, 0, 0, 0.2);
					}
					&:nth-child(2n) {
						background-color: rgba(0, 0, 0, 0.21);
					}
					&:last-child {
						td {
							&:first-child {
								border-radius: 0 0 0 15px;
							}
							&:last-child {
								border-radius: 0 0 15px 0;
							}
						}
					}
				}
			}
		}
	}
	.projectTable__title {
		padding-left: 15px;
	}

	.skeleton {
		min-width: 30px;
		background-color: rgba(255, 255, 255, 0.5);
		display: inline-block;
		height: 15px;
		-webkit-animation: change-opacity 2s linear infinite;
		animation: change-opacity 2s linear infinite;
		opacity: 0.3;
	}

	@keyframes change-opacity {
		0% {
			opacity: 0.3;
		}
		50% {
			opacity: 1;
		}
		100% {
			opacity: 0.3;
		}
	}

	.projectAction {
		position: relative;
		display: inline-block;
		width: 25px;
		height: 25px;
		padding: 4px;
		border-radius: 5px;
		background-color: rgba(255, 255, 255, 0.8);
		margin-right: 5px;

		.tooltipText {
			visibility: hidden;
			width: 120px;
			background-color: #555;
			color: #fff;
			text-align: center;
			padding: 5px 0;
			border-radius: 6px;
			position: absolute;
			z-index: 1;
			bottom: 125%;
			left: 50%;
			margin-left: -60px;
			opacity: 0;
			transition: opacity 0.3s;

			&::after {
				content: "";
				position: absolute;
				top: 100%;
				left: 50%;
				margin-left: -5px;
				border-width: 5px;
				border-style: solid;
				border-color: #555 transparent transparent transparent;
			}
		}

		&:hover .tooltipText {
			visibility: visible;
			opacity: 1;
		}
	}

	.projectTable__versionCheck {
		width: 16px;
		height: 16px;
		display: inline-block;
		fill: none;
		stroke: #fff;
		stroke-width: 3px;
		position: relative;
		top: 2px;
	}
</style>
