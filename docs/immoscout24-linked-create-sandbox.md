# ImmoScout24 DE – sicherer Sandbox-Create-Übergang (Entwicklung)

**Stand:** 11. November 2026  
**Branch:** `feature/immoscout24-linked-create-sandbox-20261111`  
**Produktiv:** **NEIN** – keine Freigabe für Produktionspublikationen.

## Ausgangslage

Der bisherige Sandbox-`create-test`-Endpunkt erstellt ein deaktiviertes Objekt,
ohne eine dauerhafte `ImmoScout24DeObjectLink`-Zuordnung zu speichern.
Die bereits implementierte, idempotenzgeschützte Funktion
`runImmoScout24DeCreateSandboxV1` wurde bisher nicht in einer API-Route verwendet.

Der neue Endpunkt `POST /api/portal-connections/de/immoscout24/sandbox/linked-create`
schliesst **ausschliesslich diese Lücke**. Er ersetzt weder das bestehende
Ende-zu-Ende-Szenario noch den normalen Portal-Publish-Worker.

## Freigabe und Aufruf

Nur in Vercel Preview (bzw. lokalem Entwicklungsmodus), nur mit:
- `IMMOSCOUT24_DE_LINKED_CREATE_ENABLED=1`, explizit gesetzt **nur in der isolierten Vorschau**
- `IMMOSCOUT24_DE_ENVIRONMENT=sandbox`
- vorhandenen geschützten Sandbox-OAuth-Zugangsdaten und gültiger Sandbox-Verbindung
- authentifizierter Same-Origin-Anfrage sowie deutscher, bezahlter/inkludierter Objektfreigabe
- passendem Immobilienobjekt mit Bildern und vermarktungsbereitem Text

JSON-Körper (nur **nach** ausdrücklicher Freigabe des Testvorgangs):
```json
{
  "listingId": "<ID eines berechtigten deutschen Testobjekts>",
  "confirmation": "CREATE_LINKED_IMMOSCOUT24_SANDBOX_OBJECT",
  "useSandboxTestAddress": true
}
```

Die Beispieladresse ist **Invalidenstrasse 65, 10557 Berlin**, damit keine
echten Objektdaten als Testadresse übertragen werden. Nur unterstützte
deutsche Kaufwohnungen werden mit dem vorhandenen Payload-Builder verarbeitet.

## Was der Endpunkt tut

1. Bestätigt Preview-/Umgebungs-/Berechtigungs-/Vermarktungsfreigaben.
2. Prüft, ob bereits eine Objektzuordnung für diese Verbindung existiert.
3. Erzeugt eine deterministische `externalId`; der Workflow legt eine
   eindeutige DB-Reservierung vor dem HTTP-POST an.
4. Führt genau einen Sandbox-Create-Versuch aus.
5. Speichert bei eindeutigem Erfolg die numerische ImmoScout24-ID.
   Bei unklarer Antwort bleibt der Link als `uncertain` gesperrt.

Er überträgt **keine Bilder**, sendet **keinen Publish-Request** und
aktiviert **keine Produktionsumgebung**. Vor einer erneuten Erstellung
muss ein separater Bestandsabgleich durchgeführt werden.

## Nächste notwendige Arbeiten

- Unbedingt den neuesten lokalen Codex-Arbeitsstand von November 2026
  mit dem GitHub-Zweig abgleichen: die zugrundeliegende GitHub-Version
  stammt vom 10. Oktober 2026.
- TypeScript-/Build- und Guard-Tests ausführen:
  `node --test tests/immoscout24-linked-create-guards.test.cjs`.
- Isolierte Preview-Datenbank, R2, OAuth-Callback und Umgebung prüfen,
  ohne Produktionsdaten zu verwenden.
- Für das angelegte Testobjekt Bilder via vorhandenen Upload-Workflow
  übertragen und **einzeln** per Provider-Readback bestätigen.
- Erst dann vorhandenen Controlled-Publish-Prozess ausschliesslich im
  Sandbox-Modus mit expliziter Freigabe durchlaufen lassen.
- Status/Fehler im Cockpit anzeigen; erst nach erfolgreichen End-to-End-
  Nachweisen eine getrennte Freigabe der Produktivpublikation prüfen.

**Nicht tun:** Das Flag auf Produktion setzen, bestehende Safety-Gates
umgehen, unbekannte POST-Ergebnisse wiederholen oder ein echtes
Kundeninserat ohne bestätigte Maklerfreigabe veröffentlichen.
