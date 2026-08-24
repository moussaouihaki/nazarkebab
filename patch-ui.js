const fs = require('fs');

// 1. Fix admin table headers
let adminCode = fs.readFileSync('app/admin.tsx', 'utf8');
adminCode = adminCode.replace(
  "<Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>PTS FIDÉLITÉ</Text>",
  "<Text style={[styles.th, { flex: 1, textAlign: 'center', fontSize: 10 }]}>PTS</Text>"
);
adminCode = adminCode.replace(
  "<Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>C.A. GÉNÉRÉ</Text>",
  "<Text style={[styles.th, { flex: 1, textAlign: 'right', fontSize: 10 }]}>C.A.</Text>"
);
fs.writeFileSync('app/admin.tsx', adminCode);

// 2. Fix index hero padding
let indexCode = fs.readFileSync('app/index.tsx', 'utf8');
indexCode = indexCode.replace(
  "paddingTop: Platform.OS === 'ios' ? 60 : 20,",
  "paddingTop: Platform.OS === 'ios' ? 120 : 20,"
);
fs.writeFileSync('app/index.tsx', indexCode);

// 3. Fix navigation animation
let layoutCode = fs.readFileSync('app/_layout.tsx', 'utf8');
layoutCode = layoutCode.replace(
  "<Stack screenOptions={{ \n              headerShown: false, \n              contentStyle: { backgroundColor: Theme.colors.background } \n            }}>",
  "<Stack screenOptions={{ \n              headerShown: false, \n              animation: 'fade',\n              contentStyle: { backgroundColor: Theme.colors.background } \n            }}>"
);
fs.writeFileSync('app/_layout.tsx', layoutCode);
