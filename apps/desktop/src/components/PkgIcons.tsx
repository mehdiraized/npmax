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
      <path
        d="M14.7 2.8 5.2 12.3l2.9 2.9L20.5 2.8h-5.8ZM8.9 16l3 3 8.6-8.6h-5.8L8.9 16Zm2.5 3.5 2.6 1.7h6.5l-5.6-5.6-3.5 3.9Z"
        fill="currentColor"
      />
    </SvgIcon>
  ),
  gradle: () => (
    <SvgIcon>
      <path d="M8.2 6.4 12 4l3.8 2.4v4.1L12 13l-3.8-2.5V6.4Z" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 13v4.8M8.5 16.1 12 18.2l3.5-2.1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="17.8" cy="7.2" r="1.3" fill="currentColor" />
    </SvgIcon>
  ),
};
