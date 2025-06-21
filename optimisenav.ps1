# Define paths
$navFile = "includes/nav.html"
$footerFile = "includes/footer.html"
$htmlFiles = Get-ChildItem -Path . -Filter "*.html"

# Create includes directory if it doesn't exist
if (-not (Test-Path "includes")) {
    New-Item -ItemType Directory -Path "includes" | Out-Null
}

# Extract navigation and footer from index.html
$indexHtml = Get-Content -Raw -Path "index.html"

$navPattern = '(?s)(<header>.*?</header>)'
$footerPattern = '(?s)(<footer>.*?</footer>)'

if ($indexHtml -match $navPattern) {
    $matches[1] | Set-Content -Path $navFile
}

if ($indexHtml -match $footerPattern) {
    $matches[1] | Set-Content -Path $footerFile
}

# Define injection script
$injectScript = @'
<!-- NAV LOADER -->
<div id="nav-container">Loading navigation...</div>
<script>
  document.addEventListener("DOMContentLoaded", () => {
    fetch("/includes/nav.html")
      .then(res => res.text())
      .then(html => document.getElementById("nav-container").outerHTML = html);
  });
</script>

<!-- PAGE CONTENT -->

<!-- FOOTER LOADER -->
<div id="footer-container">Loading footer...</div>
<script>
  document.addEventListener("DOMContentLoaded", () => {
    fetch("/includes/footer.html")
      .then(res => res.text())
      .then(html => document.getElementById("footer-container").outerHTML = html);
  });
</script>
'@

# Precompute scripts
$navScript = "`r`n" + $injectScript.Split("<!-- PAGE CONTENT -->")[0].Trim()
$footerScript = "`r`n" + $injectScript.Split("<!-- PAGE CONTENT -->")[1].Trim()
$navReplacement = '${1}' + $navScript
$footerReplacement = '${1}' + $footerScript

# Update all HTML files
foreach ($file in $htmlFiles) {
    $html = Get-Content -Raw -Path $file.FullName
    $html = [regex]::Replace($html, $navPattern, $navReplacement)
    $html = [regex]::Replace($html, $footerPattern, $footerReplacement)
    Set-Content -Path $file.FullName -Value $html
}
