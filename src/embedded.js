// Fragment links in srcdoc otherwise resolve against the outer gallery's URL.
export function embeddedPreview(html, restrictAssets = false) {
  const policy = "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; form-action 'none'; base-uri about:; object-src 'none'";
  const security = restrictAssets ? '<meta http-equiv="Content-Security-Policy" content="' + policy + '">' : '';
  return html.replace(/<head>/i, '<head>' + security + '<base href="about:srcdoc">');
}
