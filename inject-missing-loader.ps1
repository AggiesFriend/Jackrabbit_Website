# JavaScript loader to inject
$loaderScript = @'
<script>
  document.addEventListener("DOMContentLoaded", () => {
    fetch("includes/nav.html")
      .then(res => res.text())
      .then(html => document.getElementById("nav-container").outerHTML = html);

    fetch("includes/footer.html")
      .then(res => res.text())
      .then(html => document.getElementById("footer-container").outerHTML = html);
  });
</script>
'@

# Compile patterns
$bodyPattern = '(?i)<body>'
$mainClosePattern = '(?i)</main>'
$bodyClosePattern = '(?i)</body>'

$htmlFiles = Get-ChildItem -Path . -Filter "*.html" -Recurse

foreach ($file in $htmlFiles) {
    $html = Get-Content -Raw -Path $file.FullName
    $modified = $false

    # Only modify if missing fetch loader
    if ($html -notmatch 'fetch\(["'']?includes/nav\.html["'']?\)') {

        # Inject nav container after <body>
        if ($html -notmatch '<div id="nav-container">') {
            $html = [regex]::Replace($html, $bodyPattern, '<body>' + "`r`n" + '<div id="nav-container">Loading navigation...</div>')
            $modified = $true
        }

        # Inject footer container before </main>
        if ($html -notmatch '<div id="footer-container">') {
            $html = [regex]::Replace($html, $mainClosePattern, '</main>' + "`r`n" + '<div id="footer-container">Loading footer...</div>')
            $modified = $true
        }

        # Inject JS loader before </body>
        $html = [regex]::Replace($html, $bodyClosePattern, $loaderScript + "`r`n</body>")
        $modified = $true
    }

    if ($modified) {
        Set-Content -Path $file.FullName -Value $html
    }
}
