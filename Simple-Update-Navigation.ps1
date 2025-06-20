# Simple PowerShell script to update navigation in HTML files
# Run this script from the root directory of your Jackrabbit repository

param(
    [switch]$WhatIf
)

Write-Host "Updating Jackrabbit website navigation..." -ForegroundColor Green
Write-Host ""

# Get all HTML files, excluding the encyclopedia directory
$htmlFiles = Get-ChildItem -Path "." -Filter "*.html" -Recurse | Where-Object { 
    $_.FullName -notlike "*encyclopedia*" -and $_.Name -ne "Gilbert_s Quest.html"
}

$updatedFiles = @()
$errorFiles = @()

foreach ($file in $htmlFiles) {
    try {
        Write-Host "Processing: $($file.Name)" -ForegroundColor Yellow
        
        $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
        $originalContent = $content
        $changed = $false
        
        # Simple pattern replacement for header navigation
        # Look for the pattern where Characters is followed by Contact
        if ($content -match '<li><a href="characters\.html">Characters</a></li>\s*<li><a href="contact\.html">Contact</a></li>') {
            $content = $content -replace '(<li><a href="characters\.html">Characters</a></li>)(\s*)(<li><a href="contact\.html">Contact</a></li>)', '$1$2<li><a href="encyclopedia/encyclopedia.html">Encyclopedia</a></li>$2$3'
            $changed = $true
            Write-Host "  ✓ Updated navigation" -ForegroundColor Green
        }
        
        if ($changed) {
            if (!$WhatIf) {
                Set-Content -Path $file.FullName -Value $content -Encoding UTF8
                $updatedFiles += $file.Name
                Write-Host "  ✓ File saved" -ForegroundColor Green
            } else {
                Write-Host "  → Would update file (WhatIf mode)" -ForegroundColor Cyan
                $updatedFiles += $file.Name
            }
        } else {
            Write-Host "  - No changes needed" -ForegroundColor Gray
        }
        
    } catch {
        $errorFiles += $file.Name
        Write-Host "  ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
}

# Summary
Write-Host "================================" -ForegroundColor Magenta
Write-Host "Update Summary:" -ForegroundColor Magenta
Write-Host "================================" -ForegroundColor Magenta

if ($WhatIf) {
    Write-Host "WhatIf Mode - No files were actually modified" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host "Files processed: $($htmlFiles.Count)" -ForegroundColor White
Write-Host "Files that would be updated: $($updatedFiles.Count)" -ForegroundColor Green
Write-Host "Files with errors: $($errorFiles.Count)" -ForegroundColor Red
Write-Host ""

if ($updatedFiles.Count -gt 0) {
    Write-Host "Files to be updated:" -ForegroundColor Green
    $updatedFiles | ForEach-Object { Write-Host "  - $_" -ForegroundColor Green }
    Write-Host ""
}

if ($errorFiles.Count -gt 0) {
    Write-Host "Files with errors:" -ForegroundColor Red
    $errorFiles | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Write-Host ""
}

if (!$WhatIf -and $updatedFiles.Count -gt 0) {
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Review the changes in your files" -ForegroundColor White
    Write-Host "2. Test the website locally" -ForegroundColor White
    Write-Host "3. Commit and push to GitHub:" -ForegroundColor White
    Write-Host "   git add ." -ForegroundColor Cyan
    Write-Host "   git commit -m 'Add Encyclopedia link to navigation'" -ForegroundColor Cyan
    Write-Host "   git push" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host "Script completed!" -ForegroundColor Green