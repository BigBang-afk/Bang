export function ThemeScript({ initialTheme }: { initialTheme: string }) {
  const script = `
(function() {
  try {
    var stored = localStorage.getItem('bang-theme');
    var pref = stored || ${JSON.stringify(initialTheme)};
    var resolved = pref;
    if (pref === 'SYSTEM') {
      resolved = window.matchMedia('(prefers-color-scheme: light)').matches ? 'LIGHT' : 'DARK';
    }
    if (resolved === 'LIGHT') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  } catch (e) {}
})();
`;
  // eslint-disable-next-line react/no-danger
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
