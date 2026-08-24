const fs = require('fs');
const file = 'app/_layout.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('GlobalBanners')) {
  code = code.replace(
    "import DesktopHeader from '../components/DesktopHeader';",
    "import DesktopHeader from '../components/DesktopHeader';\nimport { GlobalBanners } from '../components/GlobalBanners';"
  );

  code = code.replace(
    "{!hideHeader && <DesktopHeader />}",
    "{!hideHeader && <DesktopHeader />}\n          <GlobalBanners />"
  );
  
  fs.writeFileSync(file, code);
}
