import fs from "node:fs";
import path from "node:path";

const filePath = path.join(
  process.cwd(),
  "app",
  "components",
  "PricingSection.tsx"
);

const backupPath = path.join(
  process.cwd(),
  "backups",
  "PricingSection-before-single-object-plan.txt"
);

fs.mkdirSync(path.dirname(backupPath), {
  recursive: true,
});

fs.copyFileSync(filePath, backupPath);

let content = fs.readFileSync(filePath, "utf8");
const eol = content.includes("\r\n") ? "\r\n" : "\n";

if (!content.includes('name: "Einzelimmobilie"')) {
  const founderPattern =
    /(\r?\n)\s*\{\r?\n\s*name: "Founder",/;

  if (!founderPattern.test(content)) {
    throw new Error(
      "Der Founder-Tarif wurde nicht gefunden."
    );
  }

  const singleObjectPlan = [
    "  {",
    '    name: "Einzelimmobilie",',
    '    price: "9.90 CHF",',
    '    text: "Einmalige Zahlung pro Immobilie. Kein Abonnement.",',
    '    badge: "Ohne Abo",',
    "    highlighted: false,",
    '    button: "Einzelimmobilie starten",',
    '    href: "/register?plan=single-object",',
    "    disabled: false,",
    "    features: [",
    '      "Nur einmal bezahlen",',
    '      "3 professionelle Inserat-Varianten",',
    '      "Social-Media-Texte",',
    '      "Professionelles Immobilien-Exposé",',
    '      "Objekt, Texte und Bilder speichern",',
    '      "Kein monatliches Abonnement",',
    '      "Gültig für eine Immobilie",',
    "    ],",
    "  },",
  ].join(eol);

  content = content.replace(
    founderPattern,
    (founderBlock) =>
      `${eol}${singleObjectPlan}${founderBlock}`
  );
}

const oldLinkLogic =
  /target=\{plan\.name === "Demo" \? "_self" : "_blank"\}\r?\n\s*rel=\{plan\.name === "Demo" \? undefined : "noopener noreferrer"\}/;

if (oldLinkLogic.test(content)) {
  content = content.replace(
    oldLinkLogic,
    [
      'target={plan.href.startsWith("http") ? "_blank" : "_self"}',
      '              rel={',
      '                plan.href.startsWith("http")',
      '                  ? "noopener noreferrer"',
      "                  : undefined",
      "              }",
    ].join(eol)
  );
}

const bannerPattern =
  /<span>\r?\n\s*30 Tage kostenlos testen\.[\s\S]*?<\/span>/;

if (bannerPattern.test(content)) {
  content = content.replace(
    bannerPattern,
    [
      "<span>",
      "          Einzelimmobilie für 9.90 CHF ohne Abo oder",
      "          30 Tage kostenlos mit unserem Gründerangebot testen.",
      "        </span>",
    ].join(eol)
  );
}

fs.writeFileSync(filePath, content, "utf8");

console.log(
  "Der Tarif Einzelimmobilie wurde ergänzt."
);