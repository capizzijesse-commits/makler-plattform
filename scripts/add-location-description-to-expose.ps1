param(
  [string]$ProjectRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

$pagePath = Join-Path $ProjectRoot "app\expose\[id]\page.tsx"

if (-not (Test-Path -LiteralPath $pagePath)) {
  throw "Die Datei wurde nicht gefunden: $pagePath"
}

$content = [System.IO.File]::ReadAllText($pagePath)
$original = $content

if ($content -notmatch 'locationDescription\??:\s*string\s*\|\s*null;') {
  $typeMarker = '  imageAnalysis?: string | null;'

  if (-not $content.Contains($typeMarker)) {
    throw "Das Feld imageAnalysis im Listing-Typ wurde nicht gefunden."
  }

  $content = $content.Replace(
    $typeMarker,
    "$typeMarker`r`n  locationDescription?: string | null;"
  )
}

$oldBlock = @'
              <p>
                Die Immobilie befindet sich in{" "}
                <strong>{place || listing.location}</strong>. Angaben zur
                Mikrolage, Erreichbarkeit und Umgebung können im nächsten
                Ausbauschritt automatisch ergänzt werden.
              </p>
'@

$newBlock = @'
              <p>
                {listing.locationDescription ||
                  `Die Immobilie befindet sich in ${
                    place || listing.location
                  }. Die Lage verbindet ein angenehmes Wohnumfeld mit den vielfältigen Möglichkeiten der umliegenden Region.`}
              </p>
'@

if ($content.Contains($oldBlock)) {
  $content = $content.Replace($oldBlock, $newBlock)
} elseif ($content -notmatch 'listing\.locationDescription') {
  throw "Der bisherige Platzhalter-Lagetext wurde nicht gefunden."
}

if ($content -eq $original) {
  Write-Host "Keine Änderung nötig: Der professionelle Lagetext ist bereits im Exposé eingebaut." -ForegroundColor Yellow
  exit 0
}

$utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($pagePath, $content, $utf8WithoutBom)

Write-Host ""
Write-Host "Der gespeicherte Standort-Lagetext wurde in Seite 4 des Exposés eingebaut." -ForegroundColor Green
Write-Host "Geändert: $pagePath" -ForegroundColor White
Write-Host ""
