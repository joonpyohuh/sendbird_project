export default function ThemeScript() {
  const script = `
(function () {
  try {
    var theme = localStorage.getItem('adw_theme_v1');
    if (theme !== 'light' && theme !== 'dark') theme = 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    var locale = localStorage.getItem('adw_locale_v1');
    if (locale === 'ko' || locale === 'en') document.documentElement.lang = locale;
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
