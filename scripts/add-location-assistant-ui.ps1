param(
  [string]$ProjectRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

$pagePath = Join-Path $ProjectRoot "app\cockpit\[id]\edit\page.tsx"

if (-not (Test-Path -LiteralPath $pagePath)) {
  throw "Die Datei wurde nicht gefunden: $pagePath"
}

$content = [IO.File]::ReadAllText($pagePath)
$content = $content.Replace("`r`n", "`n")
$original = $content

function Add-AfterOnce {
  param(
    [Parameter(Mandatory = $true)][string]$Text,
    [Parameter(Mandatory = $true)][string]$Marker,
    [Parameter(Mandatory = $true)][string]$Addition
  )

  $index = $Text.IndexOf($Marker, [StringComparison]::Ordinal)

  if ($index -lt 0) {
    throw "Ein benötigter Codeabschnitt wurde nicht gefunden:`n$Marker"
  }

  $insertAt = $index + $Marker.Length
  return $Text.Insert($insertAt, $Addition)
}

if ($content -notmatch 'LocationAssistantPanel') {
  $content = Add-AfterOnce `
    -Text $content `
    -Marker 'import Link from "next/link";' `
    -Addition "`nimport LocationAssistantPanel, {`n  type LocationAssistantData,`n} from `"./LocationAssistantPanel`";"
}

if ($content -notmatch 'locationDescription: string \| null;') {
  $content = Add-AfterOnce `
    -Text $content `
    -Marker '  style: string | null;' `
    -Addition "`n  locationDescription: string | null;`n  locationData: LocationAssistantData | null;"
}

if ($content -notmatch 'setLocationDescription') {
  $content = Add-AfterOnce `
    -Text $content `
    -Marker '  const [error, setError] = useState("");' `
    -Addition "`n  const [locationDescription, setLocationDescription] =`n    useState(`"`");`n  const [locationData, setLocationData] =`n    useState<LocationAssistantData | null>(null);"
}

if ($content -notmatch 'setLocationDescription\(listing\.locationDescription') {
  $content = $content.Replace(
    '      } catch (loadError) {',
    "        setLocationDescription(`n          listing.locationDescription || `"`"`n        );`n        setLocationData(listing.locationData || null);`n      } catch (loadError) {"
  )
}

if ($content -notmatch 'locationDescription,\s*\n\s*locationData,') {
  $content = Add-AfterOnce `
    -Text $content `
    -Marker '            style: form.style,' `
    -Addition "`n            locationDescription,`n            locationData,"
}

if ($content -notmatch '<LocationAssistantPanel') {
  $marketingMarker = @'
          <div className="formSection">
            <div className="sectionHeading">
              <span>VERMARKTUNG</span>
'@

  $panelMarkup = @'
          <LocationAssistantPanel
            postalCode={form.postalCode}
            location={form.location}
            locationDescription={locationDescription}
            locationData={locationData}
            onPostalCodeChange={(value) =>
              updateField("postalCode", value)
            }
            onLocationChange={(value) =>
              updateField("location", value)
            }
            onDescriptionChange={setLocationDescription}
            onDataChange={setLocationData}
          />

'@

  $content = $content.Replace(
    $marketingMarker,
    $panelMarkup + $marketingMarker
  )

  if ($content -notmatch '<LocationAssistantPanel') {
    throw "Der Einfügepunkt vor dem Abschnitt VERMARKTUNG wurde nicht gefunden."
  }
}

if ($content -eq $original) {
  Write-Host "Keine Änderung nötig: Die Standort-Assistent-UI ist bereits eingebaut." -ForegroundColor Yellow
  exit 0
}

$backupPath = "$pagePath.location-assistant-backup"
[IO.File]::WriteAllText(
  $backupPath,
  $original.Replace("`n", "`r`n"),
  (New-Object Text.UTF8Encoding($false))
)

[IO.File]::WriteAllText(
  $pagePath,
  $content.Replace("`n", "`r`n"),
  (New-Object Text.UTF8Encoding($false))
)

Write-Host ""
Write-Host "Standort-Assistent wurde in die Objektbearbeitung eingebaut." -ForegroundColor Green
Write-Host "Geändert: $pagePath" -ForegroundColor White
Write-Host "Backup:   $backupPath" -ForegroundColor DarkGray
Write-Host ""
