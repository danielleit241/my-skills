param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$ScriptPath,

    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ScriptArgs
)

$ErrorActionPreference = 'Stop'

function Convert-ToMsysPath {
    param([Parameter(Mandatory = $true)][string]$WindowsPath)

    $normalized = $WindowsPath -replace '/', '\\'
    if ($normalized -match '^[A-Za-z]:\\') {
        $drive = $normalized.Substring(0, 1).ToLowerInvariant()
        $rest = $normalized.Substring(2).TrimStart('\\') -replace '\\', '/'
        if ([string]::IsNullOrWhiteSpace($rest)) {
            return "/$drive"
        }
        return "/$drive/$rest"
    }

    return ($normalized -replace '\\', '/')
}

$gitCommand = Get-Command git.exe -ErrorAction SilentlyContinue
if (-not $gitCommand) {
    Write-Error "git.exe not found in PATH. Install Git for Windows or add Git to PATH."
    exit 127
}

# Resolve Git for Windows root from ...\cmd\git.exe -> ...\
$gitCmdDir = Split-Path -Path $gitCommand.Source -Parent
$gitRoot = Split-Path -Path $gitCmdDir -Parent
$bashPath = Join-Path -Path $gitRoot -ChildPath 'bin\bash.exe'

if (-not (Test-Path -Path $bashPath)) {
    Write-Error "Unable to locate Git Bash at: $bashPath"
    exit 127
}

if (-not (Test-Path -Path $ScriptPath)) {
    Write-Error "Shell script not found: $ScriptPath"
    exit 2
}

# Default CLV2 storage to project-local temp data in .claude/projects/homunculus.
# Existing explicit CLV2_HOMUNCULUS_DIR still takes precedence.
if (-not $env:CLV2_HOMUNCULUS_DIR) {
    $commonGitDir = (git rev-parse --path-format=absolute --git-common-dir 2>$null)
    $repoRoot = $null
    if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($commonGitDir)) {
        $normalizedGitDir = [System.IO.Path]::GetFullPath($commonGitDir.Trim())
        if ($normalizedGitDir.ToLowerInvariant().EndsWith("\\.git")) {
            $repoRoot = Split-Path -Path $normalizedGitDir -Parent
        }
    }
    if (-not $repoRoot) {
        $repoRoot = (git rev-parse --show-toplevel 2>$null)
    }
    if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($repoRoot)) {
        $localLearningDir = Join-Path -Path $repoRoot.Trim() -ChildPath '.claude\projects\homunculus'
        $env:CLV2_HOMUNCULUS_DIR = Convert-ToMsysPath -WindowsPath $localLearningDir
    }
}

& $bashPath $ScriptPath @ScriptArgs
exit $LASTEXITCODE
