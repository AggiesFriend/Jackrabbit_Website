# Define JS injection script
$loaderScript = @'
<script>
  document.addEventListener("DOMContentLoaded", () => {
    fetch("/includes/nav.html")
      .then(res => res.text())
      .then(html => document.getElementById("nav-container").outerHTML = html);

    fetch("/includes/footer.html")
      .then(res => res.text())
      .then(html => document.getElementById("footer-container").outerHTML = html);
  });
</script>
'@

# Apply to all HTML files in current directory
$htmlFiles = Get-ChildItem -Path . -Filter "*.html"

foreach ($file in $htmlFiles) {
    $html = Get-Content -Raw -Path $file.FullName

    # Only inject the loader script if not already present
    if ($html -notmatch 'fetch\("/includes/nav.html"\)') {
        $html = $html -replace '(?i)</body>', "$loaderScript`r`n</body>"
        Set-Content -Path $file.FullName -Value $html
    }
}
