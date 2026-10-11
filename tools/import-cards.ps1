param(
  [Parameter(Mandatory = $true)]
  [string]$WorkbookPath,
  [string]$OutputPath = (Join-Path $PSScriptRoot '..\src\data\cards.json')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Read-ZipEntry {
  param(
    [System.IO.Compression.ZipArchive]$Archive,
    [string]$Name
  )

  $entry = $Archive.GetEntry($Name)
  if ($null -eq $entry) {
    return $null
  }

  $reader = [System.IO.StreamReader]::new($entry.Open())
  try {
    return $reader.ReadToEnd()
  }
  finally {
    $reader.Dispose()
  }
}

function Get-CellValue {
  param(
    [System.Xml.XmlElement]$Cell,
    [string[]]$SharedStrings
  )

  $valueNode = $Cell.SelectSingleNode('./*[local-name()="v"]')
  if ($Cell.GetAttribute('t') -eq 's' -and $null -ne $valueNode) {
    return $SharedStrings[[int]$valueNode.InnerText]
  }

  if ($Cell.GetAttribute('t') -eq 'inlineStr') {
    return (($Cell.SelectNodes('.//*[local-name()="t"]') | ForEach-Object { $_.InnerText }) -join '')
  }

  if ($null -ne $valueNode) {
    return $valueNode.InnerText
  }

  return ''
}

$resolvedWorkbookPath = (Resolve-Path -LiteralPath $WorkbookPath).Path
$archive = [System.IO.Compression.ZipFile]::OpenRead($resolvedWorkbookPath)
try {
  [xml]$workbook = Read-ZipEntry $archive 'xl/workbook.xml'
  [xml]$relationships = Read-ZipEntry $archive 'xl/_rels/workbook.xml.rels'
  [xml]$sharedStringsDocument = Read-ZipEntry $archive 'xl/sharedStrings.xml'

  $sharedStrings = @()
  if ($null -ne $sharedStringsDocument.DocumentElement) {
    foreach ($item in $sharedStringsDocument.SelectNodes('//*[local-name()="si"]')) {
      $sharedStrings += (($item.SelectNodes('.//*[local-name()="t"]') | ForEach-Object { $_.InnerText }) -join '')
    }
  }

  $cardSheet = $workbook.SelectSingleNode('//*[local-name()="sheet"][@name="01_CARTES_240"]')
  if ($null -eq $cardSheet) {
    throw 'La feuille 01_CARTES_240 est introuvable dans le registre fourni.'
  }

  $relationshipId = $cardSheet.GetAttribute('id', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')
  $relationship = $relationships.SelectSingleNode("//*[local-name()='Relationship'][@Id='$relationshipId']")
  if ($null -eq $relationship) {
    throw 'La relation vers la feuille de cartes est introuvable.'
  }

  $sheetPath = $relationship.GetAttribute('Target').TrimStart('/')
  if (-not $sheetPath.StartsWith('xl/')) {
    $sheetPath = "xl/$sheetPath"
  }

  [xml]$sheet = Read-ZipEntry $archive $sheetPath
  $rows = $sheet.SelectNodes('//*[local-name()="sheetData"]/*[local-name()="row"]')
  if ($rows.Count -lt 2) {
    throw 'La feuille de cartes ne contient pas de lignes de données.'
  }

  $headers = @{}
  foreach ($cell in $rows[0].SelectNodes('./*[local-name()="c"]')) {
    $column = [regex]::Match($cell.GetAttribute('r'), '^[A-Z]+').Value
    $headers[$column] = (Get-CellValue $cell $sharedStrings).Trim()
  }

  $textHeader = 'Texte imprim' + [char]0x00E9
  $requirementHeader = 'Ma' + [char]0x00EE + 'trise / Pr' + [char]0x00E9 + 'requis'

  $cards = foreach ($row in $rows | Select-Object -Skip 1) {
    $values = @{}
    foreach ($cell in $row.SelectNodes('./*[local-name()="c"]')) {
      $column = [regex]::Match($cell.GetAttribute('r'), '^[A-Z]+').Value
      $header = $headers[$column]
      if ($header) {
        $values[$header] = Get-CellValue $cell $sharedStrings
      }
    }

    if (-not $values['ID']) {
      continue
    }

    [ordered]@{
      id = $values['ID']
      deck = $values['Tas']
      type = $values['Type']
      subtype = $values['Sous-type']
      name = $values['Nom canonique']
      copy = $values['Exemplaire']
      value = $values['Valeur']
      text = $values[$textHeader]
      requirement = $values[$requirementHeader]
      levelGain = $values['Gain niv.']
      opponentBonus = $values['Bonus adversaire']
      loot = $values['Butin']
    }
  }
}
finally {
  $archive.Dispose()
}

if ($cards.Count -ne 240) {
  throw "Import interrompu : 240 cartes étaient attendues, $($cards.Count) ont été trouvées."
}

$duplicateIds = $cards | Group-Object { $_['id'] } | Where-Object Count -gt 1
if ($duplicateIds) {
  throw "Import interrompu : identifiants dupliqués détectés ($($duplicateIds.Name -join ', '))."
}

$outputDirectory = Split-Path -Parent $OutputPath
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
$json = ConvertTo-Json -InputObject @($cards) -Depth 5
[System.IO.File]::WriteAllText((Join-Path (Resolve-Path $outputDirectory).Path (Split-Path -Leaf $OutputPath)), $json, [System.Text.UTF8Encoding]::new($false))
Write-Output "Import terminé : $($cards.Count) cartes vers $OutputPath"
