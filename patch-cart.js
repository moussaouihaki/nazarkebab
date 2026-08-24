const fs = require('fs');
const file = 'app/cart.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add imports
code = code.replace(
  "import { useRestaurantStore } from '../store/useRestaurantStore';",
  "import { useRestaurantStore, isRestaurantOpenOnDate } from '../store/useRestaurantStore';"
);

// 2. Add states
const stateInjection = `
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('ASAP');
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

  // Generate available dates based on vacations and opening hours
  useEffect(() => {
    if (!settings) return;
    const dates = [];
    const now = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      if (isRestaurantOpenOnDate(settings, d)) {
        dates.push(d);
      }
    }
    setAvailableDates(dates);
    if (dates.length > 0 && (!selectedDate || !dates.find(d => d.toDateString() === selectedDate.toDateString()))) {
      setSelectedDate(dates[0]);
    }
  }, [settings]);

  // Generate times for selected date
  useEffect(() => {
    if (!settings || !selectedDate) return;
    
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const todayName = days[selectedDate.getDay()];
    const todayHours = settings.hours.find(h => h.day === todayName);
    
    if (!todayHours || !todayHours.isOpen) {
      setAvailableTimes([]);
      setSelectedTime('');
      return;
    }

    const times = [];
    const parseTime = (timeStr) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    const formatTime = (mins) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return \`\${h.toString().padStart(2, '0')}:\${m.toString().padStart(2, '0')}\`;
    };

    const isToday = selectedDate.toDateString() === new Date().toDateString();
    let currentMins = 0;

    if (isToday) {
      const now = new Date();
      currentMins = now.getHours() * 60 + now.getMinutes() + 30; // 30 mins buffer
      // Round to next 15 mins
      currentMins = Math.ceil(currentMins / 15) * 15;
    }

    const generateSlots = (openMins, closeMins) => {
      let start = Math.max(openMins, isToday ? currentMins : openMins);
      for (let m = start; m <= closeMins; m += 15) {
        times.push(formatTime(m));
      }
    };

    generateSlots(parseTime(todayHours.open), parseTime(todayHours.close));
    if (todayHours.hasSplitShift && todayHours.open2 && todayHours.close2) {
      generateSlots(parseTime(todayHours.open2), parseTime(todayHours.close2));
    }

    if (isToday && times.length > 0) {
      times.unshift('ASAP');
    }

    setAvailableTimes(times);
    if (!times.includes(selectedTime) && times.length > 0) {
      setSelectedTime(times[0]);
    } else if (times.length === 0) {
      setSelectedTime('');
    }
  }, [selectedDate, settings]);
`;

code = code.replace(
  "const [saveAddress, setSaveAddress] = useState(false);",
  "const [saveAddress, setSaveAddress] = useState(false);\n" + stateInjection
);

// 3. UI Injection
const uiInjection = `
            {/* SCHEDULE ORDER */}
            {availableDates.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <Text style={styles.fieldLabel}>QUAND SOUHAITEZ-VOUS VOTRE COMMANDE ?</Text>
                
                {/* DATES */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, marginBottom: 12 }}>
                  {availableDates.map((d, i) => {
                    const isSelected = selectedDate?.toDateString() === d.toDateString();
                    const isToday = d.toDateString() === new Date().toDateString();
                    const label = isToday ? "Aujourd'hui" : d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
                    return (
                      <TouchableOpacity 
                        key={i} 
                        style={[styles.chip, isSelected && styles.chipActive]} 
                        onPress={() => setSelectedDate(d)}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* TIMES */}
                {availableTimes.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                    {availableTimes.map((t, i) => {
                      const isSelected = selectedTime === t;
                      return (
                        <TouchableOpacity 
                          key={i} 
                          style={[styles.timeChip, isSelected && styles.timeChipActive]} 
                          onPress={() => setSelectedTime(t)}
                        >
                          <Text style={[styles.timeChipText, isSelected && styles.timeChipTextActive]}>{t === 'ASAP' ? 'Dès que possible' : t}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                ) : (
                  <Text style={{ color: Theme.colors.danger, fontSize: 13 }}>Aucun créneau disponible pour cette date.</Text>
                )}
              </View>
            )}
`;

code = code.replace(
  "<Text style={styles.fieldLabel}>NOM & PRÉNOM</Text>",
  uiInjection + "\n            <Text style={styles.fieldLabel}>NOM & PRÉNOM</Text>"
);

// 4. Update placeOrder call
code = code.replace(
  "placeOrder(user?.id);",
  "placeOrder(user?.id, selectedTime);"
);

// 5. Update validation
code = code.replace(
  "if (!settings.isOpen || !checkIsRestaurantOpen(settings)) {",
  "if (!settings.isOpen || availableDates.length === 0 || !selectedTime) {"
);
code = code.replace(
  "alert(\"Désolé, le restaurant est actuellement fermé. Vous ne pouvez pas passer commande pour le moment.\");",
  "alert(\"Désolé, il n'y a aucun créneau disponible pour passer commande.\");"
);

// 6. Add Styles
code = code.replace(
  "export default function CartScreen() {",
  `const styles2 = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  chipActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  chipText: {
    fontFamily: Theme.fonts.bodyBold,
    color: Theme.colors.textSecondary,
  },
  chipTextActive: {
    color: '#FFF',
  },
  timeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  timeChipActive: {
    backgroundColor: Theme.colors.text,
    borderColor: Theme.colors.text,
  },
  timeChipText: {
    fontFamily: Theme.fonts.bodyBold,
    color: Theme.colors.text,
  },
  timeChipTextActive: {
    color: '#FFF',
  },
});\n\nexport default function CartScreen() {`
);

code = code.replace(/styles.chip/g, "styles2.chip");
code = code.replace(/styles.timeChip/g, "styles2.timeChip");

fs.writeFileSync(file, code);
