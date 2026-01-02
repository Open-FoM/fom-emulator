param(
    [Parameter(Mandatory = $true)]
    [string]$BuildSolution,
    [Parameter(Mandatory = $true)]
    [string]$RootSolution
)

if (-not (Test-Path -LiteralPath $BuildSolution)) {
    exit 0
}

$raw = Get-Content -LiteralPath $BuildSolution -Raw
$raw = [regex]::Replace($raw, '"([^"\\]+\.vcxproj)"', '"Build\$1"')
Set-Content -LiteralPath $RootSolution -Value $raw -Encoding ASCII
