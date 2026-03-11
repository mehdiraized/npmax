<script>
	import { toast } from "svelte-sonner";
	import { onMount, onDestroy } from "svelte";

	const { ipcRenderer } = require("electron");

	let visible = $state(false);
	let updateVersion = $state("");
	let downloading = $state(false);
	let downloadPercent = $state(0);
	let downloaded = $state(false);
	let errorMessage = $state("");

	function onUpdateAvailable(_, info) {
		updateVersion = info.version;
		errorMessage = "";
		downloadPercent = 0;
		downloaded = false;
		downloading = false;
		visible = true;
	}

	function onDownloadProgress(_, progress) {
		downloading = true;
		downloadPercent = Math.round(progress.percent);
	}

	function onUpdateDownloaded() {
		downloading = false;
		errorMessage = "";
		downloadPercent = 100;
		downloaded = true;
	}

	function onUpdateError(_, message) {
		downloading = false;
		downloaded = false;
		errorMessage =
			typeof message === "string"
				? message
				: message?.message || "Unable to download the update.";

		if (message?.manual) {
			toast.error("Update failed", {
				description: errorMessage,
				position: "bottom-center",
			});
		}
	}

	function onCheckingForUpdate(_, state) {
		if (state?.manual) {
			toast.info("Checking for updates...", {
				position: "bottom-center",
			});
		}
	}

	function onUpdateNotAvailable(_, state) {
		void state;
	}

	onMount(() => {
		ipcRenderer.on("checking-for-update", onCheckingForUpdate);
		ipcRenderer.on("update-available", onUpdateAvailable);
		ipcRenderer.on("update-not-available", onUpdateNotAvailable);
		ipcRenderer.on("update-download-progress", onDownloadProgress);
		ipcRenderer.on("update-downloaded", onUpdateDownloaded);
		ipcRenderer.on("update-error", onUpdateError);
	});

	onDestroy(() => {
		ipcRenderer.removeListener("checking-for-update", onCheckingForUpdate);
		ipcRenderer.removeListener("update-available", onUpdateAvailable);
		ipcRenderer.removeListener("update-not-available", onUpdateNotAvailable);
		ipcRenderer.removeListener("update-download-progress", onDownloadProgress);
		ipcRenderer.removeListener("update-downloaded", onUpdateDownloaded);
		ipcRenderer.removeListener("update-error", onUpdateError);
	});

	function startDownload() {
		errorMessage = "";
		downloaded = false;
		downloadPercent = 0;
		downloading = true;
		ipcRenderer.send("download-update");
	}

	function installUpdate() {
		ipcRenderer.send("install-update");
	}

	function checkForUpdates() {
		ipcRenderer.send("check-for-updates");
	}

	function dismiss() {
		visible = false;
	}
</script>

{#if visible}
	<div class="update-banner">
		<div class="update-content">
			<span class="update-icon">↑</span>
			{#if downloaded}
				<span class="update-text">Version <strong>{updateVersion}</strong> is ready to install</span>
				<button class="btn-install" onclick={installUpdate}>Restart to install</button>
			{:else if downloading}
				<span class="update-text">Downloading update... {downloadPercent}%</span>
				<div class="progress-bar">
					<div class="progress-fill" style="width: {downloadPercent}%"></div>
				</div>
			{:else}
				<div class="update-copy">
					<span class="update-text">A new version <strong>{updateVersion}</strong> is available</span>
					{#if errorMessage}
						<span class="error-text">{errorMessage}</span>
					{/if}
				</div>
				<button class="btn-download" onclick={startDownload}>
					{errorMessage ? "Retry download" : "Download and install"}
				</button>
				{#if errorMessage}
					<button class="btn-secondary" onclick={checkForUpdates}>Check again</button>
				{/if}
				<button class="btn-dismiss" onclick={dismiss}>Later</button>
			{/if}
		</div>
	</div>
{/if}

<style lang="scss">
	.update-banner {
		position: fixed;
		bottom: 16px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 9999;
		background: rgba(30, 30, 40, 0.92);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 12px;
		padding: 12px 18px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
		min-width: 320px;
		max-width: 480px;
		animation: slide-up 0.25s ease;
	}

	@keyframes slide-up {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}

	.update-content {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.update-icon {
		font-size: 16px;
		color: #7c9ef5;
		flex-shrink: 0;
	}

	.update-text {
		color: rgba(255, 255, 255, 0.85);
		font-size: 13px;
		flex: 1;

		strong {
			color: #fff;
		}
	}

	.update-copy {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 4px;
		min-width: 180px;
	}

	.error-text {
		color: #ff9a9a;
		font-size: 12px;
		line-height: 1.4;
	}

	.progress-bar {
		flex: 1;
		height: 4px;
		background: rgba(255, 255, 255, 0.15);
		border-radius: 2px;
		overflow: hidden;
		min-width: 80px;
	}

	.progress-fill {
		height: 100%;
		background: #7c9ef5;
		border-radius: 2px;
		transition: width 0.2s ease;
	}

	button {
		border: none;
		border-radius: 7px;
		padding: 6px 14px;
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		white-space: nowrap;
		transition: opacity 0.15s;

		&:hover {
			opacity: 0.85;
		}
	}

	.btn-download {
		background: #7c9ef5;
		color: #fff;
	}

	.btn-install {
		background: #5cb85c;
		color: #fff;
	}

	.btn-secondary {
		background: rgba(124, 158, 245, 0.14);
		color: rgba(255, 255, 255, 0.8);
	}

	.btn-dismiss {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.6);
	}
</style>
