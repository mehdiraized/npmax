import { useEffect, useState } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

const RELEASES_URL = "https://github.com/mehdiraized/npmax/releases";

export function UpdateNotification({
  checkToken = 0,
  onOpenUrl,
}: {
  checkToken?: number;
  onOpenUrl?: (url: string) => void | Promise<void>;
}) {
  const [visible, setVisible] = useState(false);
  const [updateVersion, setUpdateVersion] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [downloaded, setDownloaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [manualOnly, setManualOnly] = useState(false);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  async function runCheck({ manual = false }: { manual?: boolean } = {}) {
    if (manual) {
      setStatusToast("Checking for updates…");
      setTimeout(() => setStatusToast(null), 2000);
    }
    try {
      const update = await check();
      if (!update) {
        if (manual) {
          setStatusToast("You're up to date");
          setTimeout(() => setStatusToast(null), 2500);
        }
        return;
      }
      setUpdateVersion(update.version);
      setErrorMessage("");
      setDownloadPercent(0);
      setDownloaded(false);
      setDownloading(false);
      setManualOnly(false);
      setVisible(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unable to check for updates";
      setErrorMessage(message);
      setManualOnly(true);
      if (manual) {
        setVisible(true);
        setStatusToast(message);
        setTimeout(() => setStatusToast(null), 3000);
      }
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => void runCheck({ manual: false }), 4000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (checkToken > 0) void runCheck({ manual: true });
  }, [checkToken]);

  async function startDownload() {
    if (manualOnly) {
      if (onOpenUrl) void onOpenUrl(RELEASES_URL);
      else window.open(RELEASES_URL, "_blank");
      return;
    }
    setErrorMessage("");
    setDownloaded(false);
    setDownloadPercent(0);
    setDownloading(true);
    try {
      const update = await check();
      if (!update) {
        setDownloading(false);
        setErrorMessage("Update no longer available");
        return;
      }
      let total = 0;
      let received = 0;
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
          received = 0;
          setDownloadPercent(0);
        } else if (event.event === "Progress") {
          received += event.data.chunkLength;
          if (total > 0) {
            setDownloadPercent(Math.min(99, Math.round((received / total) * 100)));
          } else {
            setDownloadPercent((prev) => Math.min(99, prev + 1));
          }
        } else if (event.event === "Finished") {
          setDownloadPercent(100);
        }
      });
      setDownloading(false);
      setDownloaded(true);
      setDownloadPercent(100);
    } catch (e) {
      setDownloading(false);
      setManualOnly(true);
      setErrorMessage(e instanceof Error ? e.message : "Unable to download the update.");
    }
  }

  async function installUpdate() {
    try {
      await relaunch();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Unable to relaunch");
    }
  }

  return (
    <>
      {visible ? (
        <div className="updateBanner" role="status">
          <div className="updateBanner__copy">
            <strong>
              {downloaded
                ? `Update ${updateVersion} ready`
                : updateVersion
                  ? `Version ${updateVersion} available`
                  : "Update available"}
            </strong>
            <span>
              {errorMessage
                ? errorMessage
                : downloading
                  ? `Downloading… ${downloadPercent}%`
                  : downloaded
                    ? "Restart to finish installing."
                    : manualOnly
                      ? "Open the releases page to download manually."
                      : "A newer build of npMax is ready."}
            </span>
          </div>
          <div className="updateBanner__actions">
            {!downloaded ? (
              <button type="button" className="primaryBtn" onClick={() => void startDownload()}>
                {manualOnly ? "Open Releases" : downloading ? "Downloading…" : "Download"}
              </button>
            ) : (
              <button type="button" className="primaryBtn" onClick={() => void installUpdate()}>
                Restart & Install
              </button>
            )}
            <button type="button" className="secondaryBtn" onClick={() => setVisible(false)}>
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
      {statusToast ? <div className="updateToast">{statusToast}</div> : null}
    </>
  );
}
