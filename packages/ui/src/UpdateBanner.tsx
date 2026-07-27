export function UpdateBanner({
  message,
  onDownload,
  onInstall,
}: {
  message: string;
  onDownload?: () => void;
  onInstall?: () => void;
}) {
  return (
    <div className="np-banner np-row" style={{ justifyContent: "space-between" }}>
      <span>{message}</span>
      <div className="np-row">
        {onDownload ? <button type="button" className="np-btn" onClick={onDownload}>Download</button> : null}
        {onInstall ? <button type="button" className="np-btn primary" onClick={onInstall}>Install</button> : null}
      </div>
    </div>
  );
}
