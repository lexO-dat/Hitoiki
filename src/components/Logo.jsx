// Hitoiki (一息, "a breather") mark: pastel puzzle tile, a brush-written 一 and a small hanko seal.
// The artwork lives in public/icons/logo.svg so the app, favicon and native icons share one source.
export function LogoMark({ size = 32, ...props }) {
  return <img src="./icons/logo.svg" width={size} height={size} alt="" aria-hidden="true" {...props} />;
}

export default function Logo({ size = 30 }) {
  return (
    <span className="logo" aria-label="Hitoiki">
      <LogoMark size={size} />
      <span className="logo-word">Hitoiki</span>
      <span className="logo-kanji" aria-hidden="true">
        一息
      </span>
    </span>
  );
}
