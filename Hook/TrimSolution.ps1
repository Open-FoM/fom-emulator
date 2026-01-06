param(
    [Parameter(Mandatory=$true)]
    [string]$Solution
)

if (-not (Test-Path -LiteralPath $Solution)) {
    exit 0
}

$raw = Get-Content -LiteralPath $Solution -Raw
$guidMatches = [regex]::Matches($raw, 'Project\("\{[^\}]+\}"\) = "(ALL_BUILD|ZERO_CHECK)"\, "[^"]+"\, "\{([^\}]+)\}"')
$guids = @()
foreach ($m in $guidMatches) {
    $guids += $m.Groups[2].Value
}

$raw = [regex]::Replace($raw, 'Project\("\{[^\}]+\}"\) = "ALL_BUILD"[\s\S]*?EndProject\r?\n', '')
$raw = [regex]::Replace($raw, 'Project\("\{[^\}]+\}"\) = "ZERO_CHECK"[\s\S]*?EndProject\r?\n', '')
foreach ($g in $guids) {
    $raw = [regex]::Replace($raw, "(?m)^\s*\{$g\}.*\r?\n", '')
}

Set-Content -LiteralPath $Solution -Value $raw -Encoding ASCII
