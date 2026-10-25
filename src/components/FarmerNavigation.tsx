import { useCallback, useEffect, useState } from "react";
import {
  Camera,
  Calculator,
  CircleUserRound,
  History,
  Leaf,
  Menu,
  PackageCheck,
  Store,
  Sun,
  X,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import {
  readCompletedSales,
  readFarmerLots,
  type FarmerLot,
} from "@/lib/farmer-market";

type CatalogueRequest = {
  id: string;
  lot_id: string;
  seller_id: string;
  buyer_id: string;
  quantity_kg: number;
  quoted_total: number;
  version: number;
  status: string;
  is_read: boolean;
  awaiting_user_id: string;
  lot?: {
    variety?: string;
    photos?: Array<{ src?: string }>;
    asking_price_min?: number;
    asking_price_max?: number;
  };
  buyer?: { name?: string; business_name?: string; mobile?: string | null };
};

export default function FarmerNavigation({
  active = "today",
}: {
  active?: string;
}) {
  const { language, setLanguage } = useLanguage();
  const { user, signOut, configured } = useAuth();
  const { demo, setDemo } = useDemo();
  const [error, setError] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<Record<string, unknown>>({});
  const [requests, setRequests] = useState<CatalogueRequest[]>([]);
  const [requestError, setRequestError] = useState("");
  const [profileSection, setProfileSection] = useState<"requests" | "history">(
    "requests",
  );
  const [myLots, setMyLots] = useState<FarmerLot[]>([]);
  const bn = language === "bn";
  const loadRequests = useCallback(
    async (acknowledge = false) => {
      try {
        const response = await fetch("/api/marketplace/catalogue-requests", {
          credentials: "same-origin",
          headers: { "X-AluSathi-Request": "1" },
        });
        const rows = await response.json();
        if (!response.ok)
          throw new Error(
            typeof rows.detail === "string"
              ? rows.detail
              : "Could not load requests",
          );
        setRequests(Array.isArray(rows) ? rows : []);
        setRequestError("");
        const unread = acknowledge
          ? (Array.isArray(rows) ? rows : []).filter(
              (row: CatalogueRequest) =>
                row.seller_id === user?.id && !row.is_read,
            )
          : [];
        await Promise.all(
          unread.map((row: CatalogueRequest) =>
            fetch(
              `/api/marketplace/catalogue-requests/${encodeURIComponent(row.id)}/read`,
              {
                method: "POST",
                credentials: "same-origin",
                headers: {
                  "X-AluSathi-Request": "1",
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ revision: row.version }),
              },
            ),
          ),
        );
        if (unread.length) {
          const updated = await fetch("/api/marketplace/catalogue-requests", {
            credentials: "same-origin",
            headers: { "X-AluSathi-Request": "1" },
          });
          if (updated.ok) setRequests(await updated.json());
        }
      } catch (cause) {
        setRequestError(
          cause instanceof Error
            ? cause.message
            : bn
              ? "অনুরোধ আনা যায়নি।"
              : "Requests could not be loaded.",
        );
      }
    },
    [bn, user?.id],
  );
  useEffect(() => {
    if (!user) return;
    void loadRequests();
    const timer = window.setInterval(() => {
      if (!document.hidden) void loadRequests();
    }, 15_000);
    const refreshOnReturn = () => {
      if (!document.hidden) void loadRequests();
    };
    document.addEventListener("visibilitychange", refreshOnReturn);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshOnReturn);
    };
  }, [loadRequests, user]);
  useEffect(() => {
    if (!profileOpen || !user) return;
    fetch("/api/marketplace/profile", {
      credentials: "same-origin",
      headers: { "X-AluSathi-Request": "1" },
    })
      .then((response) =>
        response.json().then((body) => {
          if (!response.ok)
            throw new Error(body.detail || "Profile unavailable");
          return body;
        }),
      )
      .then((body) => setProfile(body.profile || {}))
      .catch((cause) =>
        setRequestError(
          cause instanceof Error ? cause.message : "Profile unavailable",
        ),
      );
    void loadRequests(true);
  }, [loadRequests, profileOpen, user]);
  useEffect(() => {
    if (!profileOpen) return;
    const refresh = () => setMyLots(readFarmerLots());
    refresh();
    window.addEventListener("alusathi-farmer-lots-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("alusathi-farmer-lots-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [profileOpen]);
  const tabs = [
    ["photos", "/farmer#photos", bn ? "ছবি" : "Photos", Camera],
    ["today", "/farmer", bn ? "আজকের কাজ" : "Today", Sun],
    ["diary", "/farmer#diary", bn ? "খাতা" : "Notebook", History],
    [
      "selling",
      "/selling-preparation",
      bn ? "বিক্রির আগে" : "Before selling",
      Store,
    ],
    [
      "market",
      "/farmer#market",
      bn ? "বাজারে দিন" : "Sell potatoes",
      PackageCheck,
    ],
  ] as const;
  const links = tabs.map(([id, href, label, Icon]) => (
    <a key={id} href={href} aria-current={active === id ? "page" : undefined}>
      <Icon size={19} />
      <span>{label}</span>
    </a>
  ));
  async function leave() {
    try {
      if (user) await signOut();
      setDemo(false);
      window.location.replace("/");
    } catch {
      setError(
        bn
          ? "বের হওয়া যায়নি। আবার চেষ্টা করুন।"
          : "Could not sign out. Please retry.",
      );
    }
  }
  return (
    <>
      <header className="site-header farmer-header">
        <div className="app-shell farmer-header-inner">
          <a
            href="/farmer"
            className="site-brand"
            onClick={() => window.scrollTo(0, 0)}
          >
            <span className="brand-mark">
              <Leaf size={22} />
            </span>
            <strong>আলুসাথী</strong>
          </a>
          <nav
            className="farmer-tabs"
            aria-label={bn ? "মূল মেনু" : "Primary navigation"}
          >
            {links}
          </nav>
          <div className="farmer-header-tools">
            <button
              className="farmer-profile-trigger"
              aria-label={
                bn ? "প্রোফাইল ও ক্রেতার অনুরোধ" : "Profile and buyer requests"
              }
              onClick={() =>
                user || demo
                  ? setProfileOpen(true)
                  : window.location.assign("/auth")
              }
            >
              <CircleUserRound size={19} />
              <span>{bn ? "প্রোফাইল" : "Profile"}</span>
              {requests.some(
                (row) => row.seller_id === user?.id && !row.is_read,
              ) && (
                <b>
                  {
                    requests.filter(
                      (row) => row.seller_id === user?.id && !row.is_read,
                    ).length
                  }
                </b>
              )}
            </button>
            <details
              className="farmer-more"
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.currentTarget.open = false;
                  event.currentTarget.querySelector("summary")?.focus();
                }
              }}
            >
              <summary>
                <Menu size={18} />
                {bn ? "আরও" : "More"}
              </summary>
              <div
                onClick={(event) => {
                  if ((event.target as Element).closest("a,button"))
                    event.currentTarget
                      .closest("details")
                      ?.removeAttribute("open");
                }}
              >
                <a href="/farmer#settings">
                  {bn ? "জেলা ও চাষের সময়" : "District and planting time"}
                </a>
                <a href="/farmer#help">{bn ? "আলুর যত্ন" : "Potato care"}</a>
                <a href="/life-cycle">{bn ? "আলুর জীবন" : "Potato life"}</a>
                {!user && configured && (
                  <a href="/auth">{bn ? "পরিচয় বাছুন" : "Choose role"}</a>
                )}
                <button onClick={() => setLanguage(bn ? "en" : "bn")}>
                  {bn ? "English" : "বাংলা"}
                </button>
                <button onClick={leave}>
                  {user
                    ? bn
                      ? "বের হন"
                      : "Sign out"
                    : bn
                      ? "মূল পাতায় ফিরুন"
                      : "Return to main page"}
                </button>
              </div>
            </details>
          </div>
        </div>
        {error && (
          <p role="alert" className="app-shell">
            {error}
          </p>
        )}
      </header>
      {profileOpen && (
        <div
          className="farmer-profile-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setProfileOpen(false);
          }}
        >
          <aside
            className="farmer-profile-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="farmer-profile-title"
          >
            <button
              className="farmer-profile-close"
              aria-label={bn ? "বন্ধ করুন" : "Close"}
              onClick={() => setProfileOpen(false)}
            >
              <X size={20} />
            </button>
            <p className="section-kicker">
              {bn ? "আপনার প্রোফাইল" : "YOUR PROFILE"}
            </p>
            <h2 id="farmer-profile-title">
              {String(
                profile.business_name ||
                  profile.contact_name ||
                  user?.email ||
                  (demo ? "Farzana Begum" : bn ? "কৃষক" : "Farmer"),
              )}
            </h2>
            <p>
              {String(
                profile.district ||
                  (demo ? (bn ? "পীরগঞ্জ, রংপুর" : "Pirganj, Rangpur") : ""),
              )}
            </p>
            <a
              className="farmer-profile-hisab"
              href="/farmer#tools"
              onClick={() => setProfileOpen(false)}
            >
              <Calculator size={20} />
              <span>
                <strong>{bn ? "হিসাব" : "Hisab"}</strong>
                <small>
                  {bn
                    ? "বিক্রির টাকা ও লাভ–লোকসান দেখুন"
                    : "See sale totals and profit or loss"}
                </small>
              </span>
            </a>
            <div className="farmer-profile-sections">
              <button
                type="button"
                aria-pressed={profileSection === "requests"}
                onClick={() => setProfileSection("requests")}
              >
                {bn ? "ক্রেতার অনুরোধ" : "Buyer requests"}
              </button>
              <button
                type="button"
                aria-pressed={profileSection === "history"}
                onClick={() => setProfileSection("history")}
              >
                {bn ? "বিক্রির ইতিহাস" : "Sales history"}
              </button>
            </div>
            {profileSection === "requests" && (
              <>
                <h3>{bn ? "ক্রেতার অনুরোধ" : "Buyer requests"}</h3>
                {requestError && <p role="alert">{requestError}</p>}
                {requests
                  .filter((row) => row.seller_id === user?.id)
                  .slice(0, 10)
                  .map((row) => {
                    const photo = row.lot?.photos?.[0]?.src;
                    const quantity = Number(row.quantity_kg) || 0;
                    const askingLow = Number(row.lot?.asking_price_min);
                    const askingHigh = Number(row.lot?.asking_price_max);
                    const askingRange =
                      askingLow > 0 && askingHigh >= askingLow
                        ? `${(askingLow * quantity).toLocaleString(bn ? "bn-BD" : "en-BD")}–${(askingHigh * quantity).toLocaleString(bn ? "bn-BD" : "en-BD")}`
                        : bn
                          ? "দর দেওয়া হয়নি"
                          : "Not provided";
                    return (
                      <article className="farmer-profile-request" key={row.id}>
                        {photo && (
                          <img
                            className="farmer-profile-request-photo"
                            src={photo}
                            alt={row.lot?.variety || "Potato lot"}
                          />
                        )}
                        <strong>
                          {row.lot?.variety || (bn ? "আলু" : "Potatoes")} ·{" "}
                          {quantity.toLocaleString(bn ? "bn-BD" : "en-BD")}{" "}
                          {bn ? "কেজি" : "kg"}
                        </strong>
                        <p>
                          {row.buyer?.business_name ||
                            row.buyer?.name ||
                            (bn ? "ক্রেতা" : "Buyer")}{" "}
                          · ৳
                          {Number(row.quoted_total).toLocaleString(
                            bn ? "bn-BD" : "en-BD",
                          )}
                        </p>
                        <p>
                          {bn ? "লটের চাওয়া মোট" : "Lot asking total"}: ৳
                          {askingRange}
                        </p>
                        {row.buyer?.mobile && (
                          <p>
                            <a href={`tel:${row.buyer.mobile}`}>
                              {bn ? "ফোন" : "Call"}
                            </a>{" "}
                            ·{" "}
                            <a
                              target="_blank"
                              rel="noreferrer"
                              href={`https://wa.me/${String(row.buyer.mobile).replace(/\D/g, "")}`}
                            >
                              WhatsApp
                            </a>
                          </p>
                        )}
                        {row.status === "pending" &&
                        row.awaiting_user_id === user?.id ? (
                          <div>
                            <button
                              onClick={async () => {
                                const response = await fetch(
                                  `/api/marketplace/catalogue-requests/${encodeURIComponent(row.id)}/respond`,
                                  {
                                    method: "POST",
                                    credentials: "same-origin",
                                    headers: {
                                      "X-AluSathi-Request": "1",
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      action: "accept",
                                      revision: row.version,
                                    }),
                                  },
                                );
                                if (response.ok) await loadRequests();
                                else
                                  setRequestError(
                                    bn
                                      ? "অনুরোধটি গ্রহণ করা যায়নি। আবার হালনাগাদ করুন।"
                                      : "Could not accept this request. Refresh and retry.",
                                  );
                              }}
                              type="button"
                            >
                              {bn ? "মেনে নিন" : "Accept"}
                            </button>
                            <button
                              onClick={async () => {
                                const response = await fetch(
                                  `/api/marketplace/catalogue-requests/${encodeURIComponent(row.id)}/respond`,
                                  {
                                    method: "POST",
                                    credentials: "same-origin",
                                    headers: {
                                      "X-AluSathi-Request": "1",
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      action: "decline",
                                      revision: row.version,
                                    }),
                                  },
                                );
                                if (response.ok) await loadRequests();
                                else
                                  setRequestError(
                                    bn
                                      ? "অনুরোধে না বলা যায়নি। আবার হালনাগাদ করুন।"
                                      : "Could not decline this request. Refresh and retry.",
                                  );
                              }}
                              type="button"
                            >
                              {bn ? "না বলুন" : "Decline"}
                            </button>
                          </div>
                        ) : (
                          <p>
                            {row.status === "agreed"
                              ? bn
                                ? "মেনে নেওয়া হয়েছে"
                                : "Accepted"
                              : row.status === "rejected"
                                ? bn
                                  ? "না বলা হয়েছে"
                                  : "Declined"
                                : row.status}
                          </p>
                        )}
                      </article>
                    );
                  })}
                {!requests.some((row) => row.seller_id === user?.id) && (
                  <p>
                    {bn
                      ? "এখন কোনো অনুরোধ নেই।"
                      : "No buyer requests right now."}
                  </p>
                )}
              </>
            )}
            {profileSection === "history" && (
              <div className="farmer-profile-history">
                <h3>{bn ? "আমার লট" : "My listings"}</h3>
                {myLots.length ? (
                  myLots
                    .slice()
                    .reverse()
                    .map((lot) => (
                      <article className="farmer-profile-listing" key={lot.id}>
                        <img src={lot.photo} alt="" />
                        <div>
                          <strong>
                            {lot.quantityKg.toLocaleString(
                              bn ? "bn-BD" : "en-BD",
                            )}{" "}
                            {bn ? "কেজি" : "kg"} · ৳
                            {lot.askingPriceMin.toLocaleString(
                              bn ? "bn-BD" : "en-BD",
                            )}
                            /{bn ? "কেজি" : "kg"}
                          </strong>
                          <small>
                            {new Date(lot.createdAt).toLocaleDateString(
                              bn ? "bn-BD" : "en-GB",
                            )}
                          </small>
                          <a
                            href={`/marketplace/buyer.html?lot=${encodeURIComponent(lot.id)}&preview=1#buyer-detail`}
                          >
                            {bn ? "লট দেখুন" : "View listing"}
                          </a>
                        </div>
                      </article>
                    ))
                ) : (
                  <p>{bn ? "এখনো কোনো লট নেই।" : "No listings yet."}</p>
                )}
                <h3>{bn ? "সম্পন্ন বিক্রি" : "Completed sales"}</h3>
                {readCompletedSales(new Set(myLots.map((lot) => lot.id)))
                  .length ? (
                  readCompletedSales(new Set(myLots.map((lot) => lot.id))).map(
                    (deal: {
                      id: string;
                      quantityKg?: number;
                      agreedTotal?: number;
                    }) => (
                      <article className="farmer-profile-request" key={deal.id}>
                        <strong>
                          {Number(deal.quantityKg || 0).toLocaleString(
                            bn ? "bn-BD" : "en-BD",
                          )}{" "}
                          {bn ? "কেজি" : "kg"}
                        </strong>
                        <p>
                          ৳
                          {Number(deal.agreedTotal || 0).toLocaleString(
                            bn ? "bn-BD" : "en-BD",
                          )}
                        </p>
                      </article>
                    ),
                  )
                ) : (
                  <p>
                    {bn
                      ? "এখনো সম্পন্ন বিক্রি নেই।"
                      : "No completed sales yet."}
                  </p>
                )}
              </div>
            )}
          </aside>
        </div>
      )}
      <nav
        className="farmer-bottom-tabs"
        aria-label={bn ? "ফোনের মূল মেনু" : "Mobile navigation"}
      >
        {links}
      </nav>
    </>
  );
}
