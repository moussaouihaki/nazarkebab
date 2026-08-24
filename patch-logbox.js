const fs = require('fs');
let code = fs.readFileSync('app/_layout.tsx', 'utf8');

const importStatement = `import { LogBox } from 'react-native';`;
if (!code.includes(importStatement)) {
  code = code.replace(
    "import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';",
    "import { View, Text, StyleSheet, Platform, ActivityIndicator, LogBox } from 'react-native';"
  );
  
  const logBoxIgnore = `
LogBox.ignoreLogs([
  '@firebase/firestore: Firestore',
  'FirebaseError: [code=permission-denied]',
  'Uncaught Error in snapshot listener'
]);
`;
  code = code.replace("try {", logBoxIgnore + "\ntry {");
  fs.writeFileSync('app/_layout.tsx', code);
}
