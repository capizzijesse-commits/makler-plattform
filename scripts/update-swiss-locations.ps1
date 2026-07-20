param(
  [string]$ProjectRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

$downloadUrl = "https://data.geo.admin.ch/ch.swisstopo-vd.ortschaftenverzeichnis_plz/ortschaftenverzeichnis_plz/ortschaftenverzeichnis_plz_4326.csv.zip"
$targetPath = Join-Path $ProjectRoot "lib\swissLocations.ts"
$tempRoot = Join-Path $env:TEMP ("inserat-ai-swiss-locations-" + [Guid]::NewGuid().ToString("N"))
$zipPath = Join-Path $tempRoot "ortschaftenverzeichnis_plz_4326.csv.zip"
$extractPath = Join-Path $tempRoot "extract"

$swissCantons = @(
  "AG", "AI", "AR", "BE", "BL", "BS", "FR", "GE", "GL", "GR", "JU", "LU", "NE",
  "NW", "OW", "SG", "SH", "SO", "SZ", "TG", "TI", "UR", "VD", "VS", "ZG", "ZH"
)

function Normalize-HeaderName {
  param([Parameter(Mandatory = $true)][string]$Value)

  $normalized = $Value.Normalize([Text.NormalizationForm]::FormD)
  $builder = New-Object Text.StringBuilder

  foreach ($character in $normalized.ToCharArray()) {
    $category = [Globalization.CharUnicodeInfo]::GetUnicodeCategory($character)

    if ($category -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
      [void]$builder.Append($character)
    }
  }

  return ($builder.ToString() -replace "[^A-Za-z0-9]", "").ToLowerInvariant()
}

function Find-ColumnName {
  param(
    [Parameter(Mandatory = $true)][string[]]$Headers,
    [Parameter(Mandatory = $true)][string[]]$Candidates
  )

  $normalizedCandidates = $Candidates | ForEach-Object {
    Normalize-HeaderName -Value $_
  }

  foreach ($header in $Headers) {
    $normalizedHeader = Normalize-HeaderName -Value $header

    if ($normalizedCandidates -contains $normalizedHeader) {
      return $header
    }
  }

  return $null
}

function ConvertTo-TypeScriptString {
  param([AllowNull()][string]$Value)

  if ($null -eq $Value) {
    return '""'
  }

  $escaped = $Value.Replace('\', '\\').Replace('"', '\"').Replace("`r", '\r').Replace("`n", '\n').Replace("`t", '\t')

  return '"' + $escaped + '"'
}

try {
  Write-Host ""
  Write-Host "Inserat-AI: Vollständige Schweizer PLZ-/Ortsliste wird erstellt ..." -ForegroundColor Cyan
  Write-Host "Quelle: swisstopo – Amtliches Ortschaftenverzeichnis" -ForegroundColor DarkGray
  Write-Host ""

  New-Item -ItemType Directory -Force $tempRoot | Out-Null
  New-Item -ItemType Directory -Force $extractPath | Out-Null
  New-Item -ItemType Directory -Force (Split-Path $targetPath -Parent) | Out-Null

  Write-Host "1/5 Offizielle CSV-Datei herunterladen ..." -ForegroundColor Yellow
  Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing

  Write-Host "2/5 ZIP-Datei entpacken ..." -ForegroundColor Yellow
  Expand-Archive -LiteralPath $zipPath -DestinationPath $extractPath -Force

  $csvFile = Get-ChildItem $extractPath -Recurse -File |
    Where-Object { $_.Name -eq "AMTOVZ_CSV_WGS84.csv" } |
    Select-Object -First 1

  if (-not $csvFile) {
    $csvFile = Get-ChildItem $extractPath -Recurse -File -Filter "*.csv" |
      Select-Object -First 1
  }

  if (-not $csvFile) {
    throw "Im offiziellen Download wurde keine CSV-Datei gefunden."
  }

  Write-Host "3/5 CSV-Daten lesen und prüfen ..." -ForegroundColor Yellow
  $rows = @(Import-Csv -LiteralPath $csvFile.FullName -Delimiter ";" -Encoding UTF8)

  if ($rows.Count -eq 0) {
    throw "Die offizielle CSV-Datei enthält keine Datensätze."
  }

  $headers = @($rows[0].PSObject.Properties.Name)

  $nameColumn = Find-ColumnName -Headers $headers -Candidates @(
    "Ortschaftsname",
    "Ortschaft",
    "Location",
    "Langtext"
  )

  $zipColumn = Find-ColumnName -Headers $headers -Candidates @(
    "PLZ4",
    "PLZ",
    "ZIP4",
    "ZipCode"
  )

  $cantonColumn = Find-ColumnName -Headers $headers -Candidates @(
    "Kantonskuerzel",
    "Kantonskürzel",
    "Kanton",
    "Canton",
    "GDEKT"
  )

  if (-not $nameColumn -or -not $zipColumn -or -not $cantonColumn) {
    $headerText = $headers -join ", "
    throw "Benötigte Spalten wurden nicht gefunden. Vorhandene Spalten: $headerText"
  }

  $locationsByKey = @{}

  foreach ($row in $rows) {
    $name = ([string]$row.$nameColumn).Trim()
    $zip = ([string]$row.$zipColumn).Trim()
    $canton = ([string]$row.$cantonColumn).Trim().ToUpperInvariant()

    if ($zip -match "^\d{1,4}$") {
      $zip = $zip.PadLeft(4, "0")
    }

    if (
      [string]::IsNullOrWhiteSpace($name) -or
      $zip -notmatch "^\d{4}$" -or
      $swissCantons -notcontains $canton
    ) {
      continue
    }

    $key = "$zip|$name|$canton"

    if (-not $locationsByKey.ContainsKey($key)) {
      $locationsByKey[$key] = [PSCustomObject]@{
        Zip = $zip
        Name = $name
        Canton = $canton
      }
    }
  }

  $locations = @(
    $locationsByKey.Values |
      Sort-Object Zip, Name, Canton
  )

  if ($locations.Count -lt 3000) {
    throw "Es wurden nur $($locations.Count) Schweizer PLZ-/Ortseinträge gefunden. Der Download oder das CSV-Format scheint unvollständig zu sein."
  }

  $presentCantons = @(
    $locations |
      Select-Object -ExpandProperty Canton -Unique |
      Sort-Object
  )

  $missingCantons = @(
    $swissCantons |
      Where-Object { $presentCantons -notcontains $_ }
  )

  if ($missingCantons.Count -gt 0) {
    throw "Folgende Kantone fehlen in den Daten: $($missingCantons -join ', ')"
  }

  Write-Host "4/5 TypeScript-Datei erzeugen ..." -ForegroundColor Yellow

  $generatedAt = (Get-Date).ToString("yyyy-MM-dd")
  $builder = New-Object Text.StringBuilder

  [void]$builder.AppendLine("// Diese Datei wird automatisch erzeugt.")
  [void]$builder.AppendLine("// Quelle: Bundesamt für Landestopografie swisstopo")
  [void]$builder.AppendLine("// Datensatz: Amtliches Ortschaftenverzeichnis mit Postleitzahl und Perimeter")
  [void]$builder.AppendLine("// Nur Schweizer Kantone; Fürstentum Liechtenstein wird ausgeschlossen.")
  [void]$builder.AppendLine("// Generiert am: $generatedAt")
  [void]$builder.AppendLine("")
  [void]$builder.AppendLine("export type SwissPostalLocation = {")
  [void]$builder.AppendLine("  zip: string;")
  [void]$builder.AppendLine("  name: string;")
  [void]$builder.AppendLine("  canton: string;")
  [void]$builder.AppendLine("};")
  [void]$builder.AppendLine("")
  [void]$builder.AppendLine("export const SWISS_POSTAL_LOCATIONS: SwissPostalLocation[] = [")

  foreach ($location in $locations) {
    $zipValue = ConvertTo-TypeScriptString -Value $location.Zip
    $nameValue = ConvertTo-TypeScriptString -Value $location.Name
    $cantonValue = ConvertTo-TypeScriptString -Value $location.Canton

    [void]$builder.AppendLine(
      "  { zip: $zipValue, name: $nameValue, canton: $cantonValue },"
    )
  }

  [void]$builder.AppendLine("];")
  [void]$builder.AppendLine("")
  [void]$builder.AppendLine("export const SWISS_LOCATIONS = Array.from(")
  [void]$builder.AppendLine("  new Set(SWISS_POSTAL_LOCATIONS.map((location) => location.name))")
  [void]$builder.AppendLine(').sort((a, b) => a.localeCompare(b, "de-CH"));')
  [void]$builder.AppendLine("")
  [void]$builder.AppendLine("export const SWISS_POSTAL_LOCATION_COUNT =")
  [void]$builder.AppendLine("  SWISS_POSTAL_LOCATIONS.length;")
  [void]$builder.AppendLine("")
  [void]$builder.AppendLine("export function findSwissPostalLocationsByZip(")
  [void]$builder.AppendLine("  zip: string")
  [void]$builder.AppendLine("): SwissPostalLocation[] {")
  [void]$builder.AppendLine("  const normalizedZip = zip.trim();")
  [void]$builder.AppendLine("")
  [void]$builder.AppendLine("  return SWISS_POSTAL_LOCATIONS.filter(")
  [void]$builder.AppendLine("    (location) => location.zip === normalizedZip")
  [void]$builder.AppendLine("  );")
  [void]$builder.AppendLine("}")
  [void]$builder.AppendLine("")
  [void]$builder.AppendLine("export function findSwissPostalLocationsByName(")
  [void]$builder.AppendLine("  name: string")
  [void]$builder.AppendLine("): SwissPostalLocation[] {")
  [void]$builder.AppendLine("  const normalizedName = name.trim().toLocaleLowerCase(""de-CH"");")
  [void]$builder.AppendLine("")
  [void]$builder.AppendLine("  if (!normalizedName) {")
  [void]$builder.AppendLine("    return [];")
  [void]$builder.AppendLine("  }")
  [void]$builder.AppendLine("")
  [void]$builder.AppendLine("  return SWISS_POSTAL_LOCATIONS.filter((location) =>")
  [void]$builder.AppendLine("    location.name.toLocaleLowerCase(""de-CH"").includes(normalizedName)")
  [void]$builder.AppendLine("  );")
  [void]$builder.AppendLine("}")
  [void]$builder.AppendLine("")

  $utf8WithoutBom = New-Object Text.UTF8Encoding($false)
  [IO.File]::WriteAllText($targetPath, $builder.ToString(), $utf8WithoutBom)

  Write-Host "5/5 Fertig." -ForegroundColor Green
  Write-Host ""
  Write-Host "Datei: $targetPath" -ForegroundColor White
  Write-Host "Einträge: $($locations.Count)" -ForegroundColor White
  Write-Host "Kantone: $($presentCantons.Count) von 26" -ForegroundColor White
  Write-Host ""
  Write-Host "Die Datei ist UTF-8 kodiert; Zürich, Köniz und Neuchâtel bleiben korrekt." -ForegroundColor Green
}
finally {
  if (Test-Path $tempRoot) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
