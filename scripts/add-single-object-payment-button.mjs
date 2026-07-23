import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const actionsPath = path.join(
  root,
  "app",
  "cockpit",
  "[id]",
  "ListingActions.tsx"
);

const pagePath = path.join(
  root,
  "app",
  "cockpit",
  "[id]",
  "page.tsx"
);

const backupDirectory = path.join(root, "backups");

fs.mkdirSync(backupDirectory, {
  recursive: true,
});

fs.copyFileSync(
  actionsPath,
  path.join(
    backupDirectory,
    "ListingActions-before-payment-button.tsx"
  )
);

fs.copyFileSync(
  pagePath,
  path.join(
    backupDirectory,
    "listing-detail-before-payment-button.tsx"
  )
);

function replaceOnce(
  content,
  pattern,
  replacement,
  description
) {
  const flags = pattern.flags.includes("g")
    ? pattern.flags
    : `${pattern.flags}g`;

  const matches = [
    ...content.matchAll(
      new RegExp(pattern.source, flags)
    ),
  ];

  if (matches.length !== 1) {
    throw new Error(
      `${description}: erwartet 1 Fundstelle, gefunden ${matches.length}.`
    );
  }

  return content.replace(pattern, replacement);
}

let actions = fs.readFileSync(actionsPath, "utf8");
const actionsEol = actions.includes("\r\n")
  ? "\r\n"
  : "\n";

/*
 * 1. Neue Props
 */
if (!actions.includes("unlockStatus: string;")) {
  actions = replaceOnce(
    actions,
    /type ListingActionsProps = \{\r?\n\s*listingId: string;\r?\n\s*archived: boolean;\r?\n\};/,
    [
      "type ListingActionsProps = {",
      "  listingId: string;",
      "  archived: boolean;",
      "  unlockStatus: string;",
      "  singleObjectPriceCents: number;",
      "};",
    ].join(actionsEol),
    "ListingActionsProps"
  );
}

/*
 * 2. Neue Props übernehmen
 */
if (
  !/^\s*unlockStatus,\s*$/m.test(actions)
) {
  actions = replaceOnce(
    actions,
    /export default function ListingActions\(\{\r?\n\s*listingId,\r?\n\s*archived,\r?\n\}: ListingActionsProps\) \{/,
    [
      "export default function ListingActions({",
      "  listingId,",
      "  archived,",
      "  unlockStatus,",
      "  singleObjectPriceCents,",
      "}: ListingActionsProps) {",
    ].join(actionsEol),
    "ListingActions-Parameter"
  );
}

/*
 * 3. Checkout als Ladeaktion erlauben
 */
if (!actions.includes('"checkout"')) {
  actions = replaceOnce(
    actions,
    /const \[busyAction, setBusyAction\] = useState<\r?\n\s*"archive" \| "delete" \| null\r?\n\s*>\(null\);/,
    [
      "const [busyAction, setBusyAction] = useState<",
      '    "archive" | "delete" | "checkout" | null',
      "  >(null);",
    ].join(actionsEol),
    "busyAction"
  );
}

/*
 * 4. Zahlungsstatus und Preis
 */
if (
  !actions.includes(
    "const requiresPayment"
  )
) {
  actions = replaceOnce(
    actions,
    /^\s*const \{ confirmAction \} = useAppDialog\(\);\s*$/m,
    [
      "  const { confirmAction } = useAppDialog();",
      "",
      "  const requiresPayment =",
      '    unlockStatus === "locked" ||',
      '    unlockStatus === "pending";',
      "",
      "  const formattedSingleObjectPrice =",
      '    new Intl.NumberFormat("de-CH", {',
      '      style: "currency",',
      '      currency: "CHF",',
      "    }).format(",
      "      singleObjectPriceCents / 100",
      "    );",
    ].join(actionsEol),
    "Zahlungsstatus"
  );
}

/*
 * 5. Checkout starten
 */
if (
  !actions.includes(
    "async function handleCheckout"
  )
) {
  const checkoutFunction = [
    "",
    "  async function handleCheckout() {",
    "    if (busyAction) return;",
    "",
    "    try {",
    '      setBusyAction("checkout");',
    '      setError("");',
    "",
    "      const response = await fetch(",
    '        "/api/payments/single-object/checkout",',
    "        {",
    '          method: "POST",',
    '          credentials: "include",',
    "          headers: {",
    '            "Content-Type": "application/json",',
    "          },",
    "          body: JSON.stringify({",
    "            listingId,",
    "          }),",
    "        }",
    "      );",
    "",
    "      if (response.status === 401) {",
    '        window.location.href = "/login";',
    "        return;",
    "      }",
    "",
    "      const data =",
    "        (await response.json().catch(() => null)) as",
    "          | {",
    "              success?: boolean;",
    "              checkoutUrl?: string;",
    "              alreadyUnlocked?: boolean;",
    "              error?: string;",
    "            }",
    "          | null;",
    "",
    "      if (data?.alreadyUnlocked) {",
    "        window.location.reload();",
    "        return;",
    "      }",
    "",
    "      if (",
    "        !response.ok ||",
    "        !data?.success ||",
    '        typeof data.checkoutUrl !== "string"',
    "      ) {",
    "        throw new Error(",
    "          data?.error ||",
    '            "Die Zahlungsseite konnte nicht geöffnet werden."',
    "        );",
    "      }",
    "",
    "      window.location.href =",
    "        data.checkoutUrl;",
    "    } catch (checkoutError) {",
    "      setError(",
    "        checkoutError instanceof Error",
    "          ? checkoutError.message",
    '          : "Die Zahlungsseite konnte nicht geöffnet werden."',
    "      );",
    "",
    "      setBusyAction(null);",
    "    }",
    "  }",
    "",
  ].join(actionsEol);

  actions = replaceOnce(
    actions,
    /\r?\n  return \(\r?\n    <>/,
    `${checkoutFunction}  return (${actionsEol}    <>`,
    "Checkout-Funktion"
  );
}

/*
 * 6. Sichtbare Zahlungskarte
 */
if (!actions.includes("EINZELIMMOBILIE")) {
  const paymentCard = [
    "        {requiresPayment && (",
    "          <div",
    "            style={{",
    '              padding: "17px",',
    '              border:',
    '                "1px solid rgba(251, 191, 36, 0.46)",',
    '              borderRadius: "14px",',
    '              background:',
    '                "linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.94))",',
    '              boxShadow:',
    '                "0 16px 36px rgba(2, 6, 23, 0.32)",',
    "            }}",
    "          >",
    "            <span",
    "              style={{",
    '                display: "block",',
    '                marginBottom: "6px",',
    '                color: "#fbbf24",',
    '                fontSize: "10px",',
    "                fontWeight: 900,",
    '                letterSpacing: "0.14em",',
    "              }}",
    "            >",
    "              EINZELIMMOBILIE",
    "            </span>",
    "",
    "            <strong",
    "              style={{",
    '                display: "block",',
    '                color: "#ffffff",',
    '                fontSize: "18px",',
    "              }}",
    "            >",
    '              {unlockStatus === "pending"',
    '                ? "Zahlung noch offen"',
    '                : "Immobilie freischalten"}',
    "            </strong>",
    "",
    "            <p",
    "              style={{",
    '                margin: "8px 0 14px",',
    '                color: "rgba(226, 232, 240, 0.76)",',
    '                fontSize: "12px",',
    "                lineHeight: 1.55,",
    "              }}",
    "            >",
    "              Einmalige Zahlung für Inserat-Texte,",
    "              Social-Media-Texte und Exposé dieses",
    "              Objekts. Kein Abonnement.",
    "            </p>",
    "",
    "            <button",
    '              type="button"',
    "              onClick={handleCheckout}",
    "              disabled={busyAction !== null}",
    "              style={{",
    '                width: "100%",',
    '                minHeight: "48px",',
    '                padding: "0 14px",',
    '                border:',
    '                  "1px solid rgba(251, 191, 36, 0.62)",',
    '                borderRadius: "11px",',
    '                background:',
    '                  "linear-gradient(135deg, #fcd34d, #f59e0b, #d97706)",',
    '                color: "#111827",',
    "                fontWeight: 900,",
    "                cursor:",
    "                  busyAction !== null",
    '                    ? "wait"',
    '                    : "pointer",',
    "                opacity:",
    "                  busyAction !== null",
    "                    ? 0.68",
    "                    : 1,",
    "              }}",
    "            >",
    '              {busyAction === "checkout"',
    '                ? "Stripe wird geöffnet ..."',
    '                : unlockStatus === "pending"',
    "                  ? `Zahlung fortsetzen – ${formattedSingleObjectPrice}`",
    "                  : `Für ${formattedSingleObjectPrice} freischalten`}",
    "            </button>",
    "          </div>",
    "        )}",
    "",
  ].join(actionsEol);

  actions = replaceOnce(
    actions,
    /(\r?\n\s*)<button\r?\n\s*type="button"\r?\n\s*onClick=\{handleArchive\}/,
    `${actionsEol}${paymentCard}        <button${actionsEol}          type="button"${actionsEol}          onClick={handleArchive}`,
    "Zahlungskarte"
  );
}

fs.writeFileSync(
  actionsPath,
  actions,
  "utf8"
);

/*
 * 7. Zahlungsfelder im Listing-Typ ergänzen
 */
let page = fs.readFileSync(pagePath, "utf8");
const pageEol = page.includes("\r\n")
  ? "\r\n"
  : "\n";

if (
  !page.includes(
    "singleObjectPriceCents: number;"
  )
) {
  page = replaceOnce(
    page,
    /(\s*archivedAt: string \| null;\r?\n)(\s*images: ListingImage\[\];)/,
    [
      "$1",
      "  paymentModel: string;",
      "  unlockStatus: string;",
      "  singleObjectPriceCents: number;",
      "$2",
    ].join(pageEol),
    "Listing-Zahlungsfelder"
  );
}

/*
 * 8. Zahlungsdaten an ListingActions übergeben
 */
if (
  !page.includes(
    "unlockStatus={listing.unlockStatus}"
  )
) {
  page = replaceOnce(
    page,
    /(<ListingActions\r?\n\s*listingId=\{listing\.id\}\r?\n\s*archived=\{Boolean\(listing\.archivedAt\)\})(\r?\n\s*\/>)/,
    [
      "$1",
      "                unlockStatus={listing.unlockStatus}",
      "                singleObjectPriceCents={",
      "                  listing.singleObjectPriceCents",
      "                }",
      "$2",
    ].join(pageEol),
    "ListingActions-Zahlungsprops"
  );
}

fs.writeFileSync(
  pagePath,
  page,
  "utf8"
);

console.log(
  "CHF-9.90-Button wurde erfolgreich ergänzt."
);