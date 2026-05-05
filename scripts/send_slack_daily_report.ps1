$today = Get-Date -Format "yyyy-MM-dd"

$syncTodayUrl = "http://127.0.0.1:8000/sync/google-sheets/applications?today_only=true&triggered_by=Scheduled%20Task"
$dashboardUrl = "http://127.0.0.1:8000/sync/google-sheets/dashboard?report_date=$today"
$slackUrl = "http://127.0.0.1:8000/slack/daily-report?report_date=$today&triggered_by=Scheduled%20Task"

try {
    Write-Output "Syncing today's applications..."
    Invoke-RestMethod -Uri $syncTodayUrl -Method Post

    Write-Output "Syncing dashboard..."
    Invoke-RestMethod -Uri $dashboardUrl -Method Post

    Write-Output "Sending Slack daily report..."
    Invoke-RestMethod -Uri $slackUrl -Method Post

    Write-Output "Daily automation completed successfully."
}
catch {
    Write-Output "Daily automation failed."
    Write-Output $_.Exception.Message
}