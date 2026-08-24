const fs = require('fs');
const file = 'app/index.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  `  heroContainer: {
    height: Platform.OS === 'web' ? 550 : 500,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },`,
  `  heroContainer: {
    height: Platform.OS === 'web' ? 550 : 500,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
  },`
);

fs.writeFileSync(file, code);
