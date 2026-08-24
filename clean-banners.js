const fs = require('fs');

// Clean app/index.tsx
let indexCode = fs.readFileSync('app/index.tsx', 'utf8');

// Remove closure modal state
indexCode = indexCode.replace(/const \[showClosureModal, setShowClosureModal\] = useState\(true\);\n/g, '');

// Remove the entire Banners and Modal section from app/index.tsx
// We will look for {/* BANNIÈRES */} up to {/* FIN BANNIÈRES */} (if it exists)
// Or just regex out the parts.
indexCode = indexCode.replace(/\{\/\* BANNIÈRES \*\/\}(.|\n)*?\{\/\* HERO SECTION \*\/\}/gm, '{/* HERO SECTION */}');

// Remove the modal
indexCode = indexCode.replace(/\{\/\* MODAL \(Widget\) DE FERMETURE \*\/\}(.|\n)*?<\/Modal>/gm, '');

// The old banner might have had a different comment or none. Let's just string replace the known chunks:
const overrideBannerStr = `        {/* BANNIÈRE DE FERMETURE EXCEPTIONNELLE */}
        {!settings.isOpen && settings.openOverrideMessage ? (
          <SafeAreaView edges={['top']} style={{ backgroundColor: Theme.colors.danger }}>
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Ionicons name="alert-circle" size={32} color="#FFF" style={{ marginBottom: 8 }} />
              <Text style={{ fontFamily: Theme.fonts.bodyBold, color: '#FFF', fontSize: 16, textAlign: 'center' }}>
                {settings.openOverrideMessage}
              </Text>
              <Text style={{ fontFamily: Theme.fonts.body, color: '#FFF', fontSize: 14, textAlign: 'center', marginTop: 4 }}>
                Les commandes sont temporairement suspendues.
              </Text>
            </View>
          </SafeAreaView>
        ) : null}`;

const announcementBannerStr = `        {/* BANNIÈRE D'ANNONCE / INFORMATION */}
        {settings.announcementEnabled && !!settings.announcementMessage ? (
          <SafeAreaView edges={['top']} style={{ backgroundColor: '#FF9500' }}>
            <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <Ionicons name="megaphone" size={24} color="#FFF" />
              <Text style={{ fontFamily: Theme.fonts.bodyBold, color: '#FFF', fontSize: 15, textAlign: 'center', flex: 1 }}>
                {settings.announcementMessage}
              </Text>
            </View>
          </SafeAreaView>
        ) : null}`;

const containerStrStart = `      <View style={{ marginTop: Platform.OS === 'web' ? 80 : 0 }}>`;
const containerStrEnd = `      </View>`;

// Just to be safe, I'll regex it loosely
indexCode = indexCode.replace(/<View style=\{\{ marginTop: Platform\.OS === 'web' \? 80 : 0 \}\}>[\s\S]*?<\/View>/m, '');
indexCode = indexCode.replace(/<Modal[\s\S]*?<\/Modal>/m, ''); // Will remove all modals, but index only has one

fs.writeFileSync('app/index.tsx', indexCode);

// Clean app/menu.tsx
let menuCode = fs.readFileSync('app/menu.tsx', 'utf8');

menuCode = menuCode.replace(/\{\/\* ANNOUNCEMENT BANNER \*\/\}(.|\n)*?<\/View>\n        \)\}/m, '');

fs.writeFileSync('app/menu.tsx', menuCode);
