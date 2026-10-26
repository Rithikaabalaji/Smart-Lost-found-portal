<#
.SYNOPSIS
  Zero-dependency local HTTP web server for Smart Lost & Found Portal using .NET HttpListener.
  No Node.js or Python required!

.EXAMPLE
  .\serve.ps1
  .\serve.ps1 -Port 8080
#>
param(
  [int]$Port = 3000
)

$prefix = "http://localhost:$Port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

try {
  $listener.Start()
  Write-Host "==========================================================" -ForegroundColor Cyan
  Write-Host " Smart Lost & Found Management Portal running at: " -ForegroundColor Green
  Write-Host "   --> $prefix" -ForegroundColor Yellow
  Write-Host " Open your browser to explore the portal." -ForegroundColor White
  Write-Host " Press Ctrl+C in this window to stop the server." -ForegroundColor DarkGray
  Write-Host "==========================================================" -ForegroundColor Cyan

  # Auto-open default browser
  Start-Process $prefix

  $root = $PSScriptRoot
  $mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
  }

  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $urlPath = $request.Url.LocalPath.TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($urlPath)) {
      $urlPath = "index.html"
    }

    $filePath = Join-Path $root ($urlPath -replace '/', '\')

    if (Test-Path $filePath -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
      $contentType = $mimeTypes[$ext]
      if (-not $contentType) { $contentType = "application/octet-stream" }

      $response.ContentType = $contentType
      $bytes = [System.IO.File]::ReadAllBytes($filePath)
      $response.ContentLength64 = $bytes.Length
      $response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $response.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
      $response.OutputStream.Write($msg, 0, $msg.Length)
    }

    $response.OutputStream.Close()
  }
}
finally {
  $listener.Stop()
  $listener.Close()
}
