# PR-122: observable E2E runner. The switch attests that localhost:4000 uses
# a disposable test database, with no real accounts or shared development data.
param(
    [ValidateSet('chromium', 'firefox', 'webkit')]
    [string]$Project,
    [string]$Spec = 'tests/court-management.spec.ts',
    [switch]$All,
    [switch]$DisposableDatabase
)

$ErrorActionPreference = 'Stop'
if (-not $DisposableDatabase) {
    throw 'PR-122: pass -DisposableDatabase only after verifying the local stack uses a disposable test database.'
}
$suiteDirectory = Split-Path -Parent $PSScriptRoot
$previousCi = $env:CI
$previousHtmlOpen = $env:PLAYWRIGHT_HTML_OPEN
$previousOptIn = $env:PW_ALLOW_DISPOSABLE_DB
$previousCredentialFile = $env:PW_CREDENTIALS_FILE
$testExitCode = 1

Push-Location -LiteralPath $suiteDirectory
try {
    # Read the committed templates without overwriting the private file.
    $env:PW_CREDENTIALS_FILE = Join-Path $suiteDirectory 'credentials.example.json'
    $env:PW_ALLOW_DISPOSABLE_DB = '1'
    $env:CI = $null
    $env:PLAYWRIGHT_HTML_OPEN = 'never'
    $testArguments = @('test', '--headed', '--reporter=list,html')
    if (-not $All) { $testArguments += $Spec }
    if ($Project) { $testArguments += "--project=$Project" }
    & '.\node_modules\.bin\playwright.cmd' @testArguments
    $testExitCode = $LASTEXITCODE
} finally {
    $env:CI = $previousCi
    $env:PLAYWRIGHT_HTML_OPEN = $previousHtmlOpen
    $env:PW_ALLOW_DISPOSABLE_DB = $previousOptIn
    $env:PW_CREDENTIALS_FILE = $previousCredentialFile
    Pop-Location
}
exit $testExitCode
