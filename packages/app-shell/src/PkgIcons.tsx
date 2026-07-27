import type { ReactNode } from "react";

function SvgIcon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {children}
    </svg>
  );
}

function ImgIcon({ src }: { src: string }) {
  return <img className="nav__pkgIconImg" src={src} alt="" aria-hidden />;
}

export const PKG_ICONS: Record<string, () => ReactNode> = {
  npm: () => <ImgIcon src="/package-manager-icons/npm.svg" />,
  yarn: () => <ImgIcon src="/package-manager-icons/yarn.svg" />,
  pnpm: () => <ImgIcon src="/package-manager-icons/pnpm.svg" />,
  composer: () => <ImgIcon src="/package-manager-icons/composer.svg" />,
  swift: () => <ImgIcon src="/package-manager-icons/swift.svg" />,
  cocoapods: () => <ImgIcon src="/package-manager-icons/cocoapods.svg" />,
  bundler: () => <ImgIcon src="/package-manager-icons/bundler.svg" />,
  cargo: () => (
    <SvgIcon>
      <path
        d="M12 3.5 14 4l1.8-1 1.2 1.6 2-.1.4 2 1.9.7-.5 2 1.5 1.4-1.2 1.7.8 1.8-1.8 1 0 2h-2l-1.1 1.7-1.8-.7-1.6 1.2-1.6-1.2-1.8.7L7.2 19H5.2l.1-2-1.8-1 .8-1.8-1.2-1.7 1.5-1.4-.5-2 1.9-.7.4-2 2 .1L10 4l2-.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3.2" fill="currentColor" />
    </SvgIcon>
  ),
  go: () => (
    <SvgIcon>
      <path d="M4 13h8.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14.5 9.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 15.5h3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="10" cy="13" r="4.2" stroke="currentColor" strokeWidth="1.8" />
    </SvgIcon>
  ),
  flutter: () => (
    <SvgIcon>
      <path d="M14.5 3 4 13.5 7.5 17 21 3.5 14.5 3Z" fill="currentColor" opacity="0.9" />
      <path d="M7.5 17 11 20.5 14.5 17 11 13.5 7.5 17Z" fill="currentColor" opacity="0.55" />
    </SvgIcon>
  ),
  gradle: () => (
    <SvgIcon>
      <ellipse cx="12" cy="12" rx="8" ry="5.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="9" cy="12" r="1.2" fill="currentColor" />
    </SvgIcon>
  ),
};
