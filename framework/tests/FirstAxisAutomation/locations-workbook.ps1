param(
  [Parameter(Mandatory = $true)][ValidateSet('Read', 'Write')][string]$Mode,
  [Parameter(Mandatory = $true)][string]$Workbook,
  [string]$ResultsJson
)

$ErrorActionPreference = 'Stop'
$resolvedWorkbook = [System.IO.Path]::GetFullPath($Workbook)
if (-not (Test-Path -LiteralPath $resolvedWorkbook -PathType Leaf)) { throw "Workbook not found: $resolvedWorkbook" }

function ConvertTo-ExcelIndex($value, [string]$description) {
  if ($value -is [System.Array]) {
    if ($value.Count -ne 1) { throw "Expected one numeric value for $description; received $($value.Count)." }
    $value = $value[0]
  }
  $parsed = 0
  if (-not [int]::TryParse([string]$value, [ref]$parsed)) { throw "Invalid numeric value for ${description}: '$value'." }
  return $parsed
}

$excel = $null
$book = $null
$ownsExcel = $false
$ownsBook = $false

try {
  # Reuse the user's open Excel instance when possible. This avoids the file lock
  # raised by ZipFile.OpenRead when Excel already has the workbook open.
  try { $excel = [Runtime.InteropServices.Marshal]::GetActiveObject('Excel.Application') } catch { }
  if (-not $excel) {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $ownsExcel = $true
    # Hidden automation must not wait for an invisible confirmation dialog.
    # Leave the user's existing Excel application's settings untouched.
    $excel.DisplayAlerts = $false
    $excel.AskToUpdateLinks = $false
  }

  foreach ($candidate in $excel.Workbooks) {
    try {
      if ([System.IO.Path]::GetFullPath([string]$candidate.FullName).Equals(
          $resolvedWorkbook, [System.StringComparison]::OrdinalIgnoreCase)) {
        $book = $candidate
        break
      }
    } catch { }
  }

  if (-not $book) {
    $readOnly = $Mode -eq 'Read'
    try {
      $book = $excel.Workbooks.Open($resolvedWorkbook, 0, $readOnly)
    } catch {
      throw "Excel could not open '$resolvedWorkbook'. If it is already open, keep it open in the same Excel session. If not, close the workbook and check that another process is not locking it. $($_.Exception.Message)"
    }
    $ownsBook = $true
  }
  if ($Mode -eq 'Write' -and $book.ReadOnly) {
    throw "The workbook is open read-only in Excel and cannot receive Test Result updates: $resolvedWorkbook"
  }

  $sheet = $book.Worksheets.Item(1)
  $used = $sheet.UsedRange
  $firstRow = [int]$used.Row
  $lastRow = $firstRow + [int]$used.Rows.Count - 1
  $firstColumn = [int]$used.Column
  $lastColumn = $firstColumn + [int]$used.Columns.Count - 1

  $headerRow = 0
  $headerColumns = @{}
  for ($row = $firstRow; $row -le $lastRow; $row++) {
    $candidateHeaders = @{}
    for ($column = $firstColumn; $column -le $lastColumn; $column++) {
      $value = [string]$sheet.Cells.Item($row, $column).Text
      $candidateHeaders[$value.Trim().ToLowerInvariant()] = $column
    }
    if ($candidateHeaders.ContainsKey('entity') -and $candidateHeaders.ContainsKey('location') -and
        $candidateHeaders.ContainsKey('active') -and
        ($candidateHeaders.ContainsKey('test result') -or $candidateHeaders.ContainsKey('testresult'))) {
      $headerRow = $row
      $headerColumns = $candidateHeaders
      break
    }
  }
  if (-not $headerRow) { throw 'Required headers Entity, Location, Active, and Test Result were not found.' }
  $resultColumnKey = if ($headerColumns.ContainsKey('test result')) { 'test result' } else { 'testresult' }
  $resultColumnNumber = ConvertTo-ExcelIndex $headerColumns[$resultColumnKey] 'Test Result column'
  if (-not $headerColumns.ContainsKey('comment')) {
    throw 'Required Comment header was not found on the same row as Test Result.'
  }
  $commentColumnNumber = ConvertTo-ExcelIndex $headerColumns['comment'] 'Comment column'

  if ($Mode -eq 'Read') {
    $records = @()
    for ($row = $headerRow + 1; $row -le $lastRow; $row++) {
      $entity = ([string]$sheet.Cells.Item($row, $headerColumns['entity']).Text).Trim()
      $location = ([string]$sheet.Cells.Item($row, $headerColumns['location']).Text).Trim()
      $active = ([string]$sheet.Cells.Item($row, $headerColumns['active']).Text).Trim()
      if (-not $entity -and -not $location -and -not $active) { continue }
      if (-not $entity -or -not $location -or $active -notin @('Yes', 'No')) {
        throw "Row $row must have Entity, Location, and Active set to Yes or No."
      }
      $previousResult = ([string]$sheet.Cells.Item($row, $resultColumnNumber).Text).Trim()
      $records += [pscustomobject]@{ row = $row; entity = $entity; location = $location; active = $active; previousResult = $previousResult }
    }
    if ($records.Count -eq 0) { throw 'No location data rows were found.' }
    ConvertTo-Json -InputObject @($records) -Depth 5 -Compress
    exit 0
  }

  if (-not $ResultsJson -or -not (Test-Path -LiteralPath $ResultsJson -PathType Leaf)) {
    throw 'Write mode requires a results JSON file.'
  }
  $resultPayload = Get-Content -LiteralPath $ResultsJson -Raw -Encoding UTF8 | ConvertFrom-Json
  if (-not $resultPayload.results) { throw 'Results JSON must have a results array.' }
  $results = @($resultPayload.results)
  foreach ($result in $results) {
    $rowNumber = ConvertTo-ExcelIndex $result.row 'result row'
    if ($rowNumber -le $headerRow -or $rowNumber -gt $lastRow -or
        $result.result -notin @('PASS', 'FAIL')) {
      throw 'Results must reference existing data rows and contain PASS/FAIL values.'
    }
  }

  foreach ($result in $results) {
    $rowNumber = ConvertTo-ExcelIndex $result.row 'result row'
    $sheet.Cells.Item($rowNumber, $resultColumnNumber).Value2 = [string]$result.result
    $comment = ''
    if ($result.result -eq 'FAIL') {
      $comment = [string]$result.details
      if ([string]::IsNullOrWhiteSpace($comment)) { $comment = 'Failure details were not recorded for this row.' }
      # Strip console colour codes and respect Excel's cell text limit.
      $comment = $comment -replace '\x1B\[[0-?]*[ -/]*[@-~]', ''
      if ($comment.Length -gt 32767) { $comment = $comment.Substring(0, 32767) }
    }
    $commentCell = $sheet.Cells.Item($rowNumber, $commentColumnNumber)
    $commentCell.NumberFormat = '@'
    $commentCell.Value2 = $comment
  }
  $book.Save()
  Write-Output "Updated $($results.Count) Test Result and Comment cells in $resolvedWorkbook"
} finally {
  if ($ownsBook -and $book) { $book.Close($false) }
  if ($ownsExcel -and $excel) { $excel.Quit() }
}
