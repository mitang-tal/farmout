# Simple HTTP server for FarmCalc (PowerShell, no Python/Node needed)
param([int]$Port = 8765)
$root = $PSScriptRoot
if (-not $root) { $root = Get-Location | Select-Object -ExpandProperty Path }
$prefix = "http://localhost:$Port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Host "Serving at $prefix (Ctrl+C to stop)"
$mimes = @{
    '.html'='text/html; charset=utf-8'; '.htm'='text/html; charset=utf-8'
    '.css'='text/css'; '.js'='application/javascript'; '.json'='application/json'
    '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.gif'='image/gif'
    '.ico'='image/x-icon'; '.svg'='image/svg+xml'; '.woff'='font/woff'; '.woff2'='font/woff2'
}
function Get-Mime($path) {
    $ext = [System.IO.Path]::GetExtension($path).ToLower()
    if ($mimes.ContainsKey($ext)) { return $mimes[$ext] }
    'application/octet-stream'
}
function Send-File($response, $path) {
    $mime = Get-Mime $path
    $response.ContentType = $mime
    $bytes = [System.IO.File]::ReadAllBytes($path)
    $response.ContentLength64 = $bytes.Length
    $response.OutputStream.Write($bytes, 0, $bytes.Length)
}
try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $req = $context.Request
        $resp = $context.Response
        $localPath = $req.Url.LocalPath.TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar)
        if ([string]::IsNullOrEmpty($localPath)) { $localPath = 'index.html' }
        $filePath = Join-Path $root $localPath
        if (Test-Path $filePath -PathType Leaf) {
            try { Send-File $resp $filePath } catch { $resp.StatusCode = 500; $resp.Close() }
        } else {
            $resp.StatusCode = 404
            $buf = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $resp.ContentLength64 = $buf.Length
            $resp.OutputStream.Write($buf, 0, $buf.Length)
        }
        $resp.Close()
    }
} finally { $listener.Stop() }
