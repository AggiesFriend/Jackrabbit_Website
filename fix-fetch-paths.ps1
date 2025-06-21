# Correct fetch paths for GitHub Pages relative structure
$htmlFiles = Get-ChildItem -Path . -Filter "*.html" -Recurse

foreach ($file in $htmlFiles) {
    $html = Get-Content -Raw -Path $file.FullName

    # Replace absolute fetch paths like "/includes/nav.html" with relative "includes/nav.html"
    $html = $html -replace 'fetch\(["'']?/includes/nav\.html["'']?\)', 'fetch("includes/nav.html")'
    $html = $html -replace 'fetch\(["'']?/includes/footer\.html["'']?\)', 'fetch("includes/footer.html")'

    Set-Content -Path $file.FullName -Value $html
}
