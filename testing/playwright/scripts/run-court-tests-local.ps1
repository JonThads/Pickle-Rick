# PR-14 / UC-03: run observable Court Management regression tests against
# the already-running local Docker stack. The suite's global teardown
# deletes its accounts, so always use disposable examples for this run.
param(
    [ValidateSet('chromium', 'firefox', 'webkit')]
    [string]$Project
)

$ErrorActionPreference = 'Stop'
$suiteDirectory = Split-Path -Parent $PSScriptRoot
$credentialPath = Join-Path $suiteDirectory 'credentials.json'
$hadCredentials = Test-Path -LiteralPath $credentialPath
$originalCredentials = if ($hadCredentials) {
    [System.IO.File]::ReadAllBytes($credentialPath)
}
$previousCi = $env:CI
$previousHtmlOpen = $env:PLAYWRIGHT_HTML_OPEN
$testExitCode = 1

Push-Location -LiteralPath $suiteDirectory
try {
    # Preserve the developer's private file byte-for-byte, even on failure.
    Copy-Item -LiteralPath 'credentials.example.json' -Destination $credentialPath
    $env:CI = $null
    $env:PLAYWRIGHT_HTML_OPEN = 'never'
    $testArguments = @('test', 'tests/court-management.spec.ts', '--headed', '--reporter=list,html')
    if ($Project) {
        $testArguments += "--project=$Project"
    }
    & '.\node_modules\.bin\playwright.cmd' @testArguments
    $testExitCode = $LASTEXITCODE
} finally {
    if ($hadCredentials) {
        [System.IO.File]::WriteAllBytes($credentialPath, $originalCredentials)
    } else {
        Remove-Item -LiteralPath $credentialPath -ErrorAction SilentlyContinue
    }
    $env:CI = $previousCi
    $env:PLAYWRIGHT_HTML_OPEN = $previousHtmlOpen
    Pop-Location
}

exit $testExitCode
