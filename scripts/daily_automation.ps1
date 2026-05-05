$ErrorActionPreference = "Stop"

$projectRoot = "D:\Prjs\autobidder"
$backendPath = "D:\Prjs\autobidder\backend"
$logPath = "D:\Prjs\autobidder\logs\daily_automation.log"

$healthUrl = "http://127.0.0.1:8000/health"

$today = Get-Date -Format "yyyy-MM-dd"

$syncTodayUrl = "http://127.0.0.1:8000/sync/google-sheets/applications?today_only=true&triggered_by=Scheduled%20Task"
$dashboardUrl = "http://127.0.0.1:8000/sync/google-sheets/dashboard?report_date=$today"
$slackUrl = "http://127.0.0.1:8000/slack/daily-report?report_date=$today&triggered_by=Scheduled%20Task"

function Write-Log {
    param (
        [string]$Message
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] $Message"

    Write-Output $line
    Add-Content -Path $logPath -Value $line
}

function Test-BackendHealth {
    try {
        $response = Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 5

        if ($response.status -eq "ok") {
            return $true
        }

        return $false
    }
    catch {
        return $false
    }
}

function Start-Backend {
    Write-Log "Backend is not running. Starting backend..."

    Start-Process powershell.exe -ArgumentList @(
        "-NoExit",
        "-ExecutionPolicy", "Bypass",
        "-Command",
        "cd '$backendPath'; python -m uvicorn main:app --host 127.0.0.1 --port 8000"
    )

    Start-Sleep -Seconds 8
}

try {
    Write-Log "Daily automation started."

    if (-not (Test-BackendHealth)) {
        Start-Backend
    }
    else {
        Write-Log "Backend is already running."
    }

    if (-not (Test-BackendHealth)) {
        Write-Log "Backend health check failed after startup attempt. Automation stopped."
        exit 1
    }

    Write-Log "Backend health check passed."

    Write-Log "Syncing today's applications to Google Sheets..."
    $syncResult = Invoke-RestMethod -Uri $syncTodayUrl -Method Post -TimeoutSec 60
    Write-Log "Applications sync completed. New: $($syncResult.rows_synced), Updated: $($syncResult.rows_updated), Log ID: $($syncResult.sync_log_id)"

    Write-Log "Syncing Google Sheets dashboard..."
    $dashboardResult = Invoke-RestMethod -Uri $dashboardUrl -Method Post -TimeoutSec 60
    Write-Log "Dashboard sync completed. Rows written: $($dashboardResult.rows_written)"

    Write-Log "Sending Slack daily report..."
    $slackResult = Invoke-RestMethod -Uri $slackUrl -Method Post -TimeoutSec 60
    Write-Log "Slack report sent. Log ID: $($slackResult.slack_log_id)"

    Write-Log "Daily automation completed successfully."
}
catch {
    Write-Log "Daily automation failed."
    Write-Log $_.Exception.Message

    if ($_.ErrorDetails.Message) {
        Write-Log $_.ErrorDetails.Message
    }

    exit 1
}