export default function SellingPondBanner() {
  return <picture className="selling-pond-banner" aria-hidden="true">
    <source media="(prefers-reduced-motion: reduce)" srcSet="/alusathi-selling-pond-still.webp" />
    <img src="/alusathi-selling-pond-animated.webp" alt="" width={1302} height={446} decoding="async" />
  </picture>;
}
