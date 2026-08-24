const fs = require('fs');
const file = 'store/useRestaurantStore.ts';
let code = fs.readFileSync(file, 'utf8');

// Replace AUTO-REPAIR logic to avoid writing to Firestore (which causes permission denied for guests)
const badSauceRepair = `        // AUTO-REPAIR SAUCES
        if (JSON.stringify(data.sauces) !== JSON.stringify(DEFAULT_SETTINGS.sauces)) {
           await updateDoc(doc(db, 'settings', 'pokemoons_restaurant'), { sauces: DEFAULT_SETTINGS.sauces });
           data.sauces = DEFAULT_SETTINGS.sauces;
        }`;
const goodSauceRepair = `        // AUTO-REPAIR SAUCES (local only)
        if (!data.sauces || data.sauces.length === 0) {
           data.sauces = DEFAULT_SETTINGS.sauces;
        }`;

code = code.replace(badSauceRepair, goodSauceRepair);

const badSettingsRepair = `        // AUTO-REPAIR ADDRESS, TVA, NAME
        if (data.address !== DEFAULT_SETTINGS.address || data.tva !== DEFAULT_SETTINGS.tva || data.name !== DEFAULT_SETTINGS.name || data.phone !== DEFAULT_SETTINGS.phone) {
           await updateDoc(doc(db, 'settings', 'pokemoons_restaurant'), { 
             address: DEFAULT_SETTINGS.address,
             tva: DEFAULT_SETTINGS.tva,
             name: DEFAULT_SETTINGS.name,
             phone: DEFAULT_SETTINGS.phone
           });
           data.address = DEFAULT_SETTINGS.address;
           data.tva = DEFAULT_SETTINGS.tva;
           data.name = DEFAULT_SETTINGS.name;
           data.phone = DEFAULT_SETTINGS.phone;
        }`;
const goodSettingsRepair = `        // AUTO-REPAIR ADDRESS, TVA, NAME (local only)
        if (!data.address) data.address = DEFAULT_SETTINGS.address;
        if (!data.tva) data.tva = DEFAULT_SETTINGS.tva;
        if (!data.name) data.name = DEFAULT_SETTINGS.name;
        if (!data.phone) data.phone = DEFAULT_SETTINGS.phone;`;

code = code.replace(badSettingsRepair, goodSettingsRepair);

const badHoursRepair = `        // AUTO-REPAIR HOURS
        if (!data.hours || JSON.stringify(data.hours) !== JSON.stringify(DEFAULT_HOURS)) {
           await updateDoc(doc(db, 'settings', 'pokemoons_restaurant'), { hours: DEFAULT_HOURS });
           data.hours = DEFAULT_HOURS;
        }`;
const goodHoursRepair = `        // AUTO-REPAIR HOURS (local only)
        if (!data.hours || data.hours.length === 0) {
           data.hours = DEFAULT_HOURS;
        }`;

code = code.replace(badHoursRepair, goodHoursRepair);

fs.writeFileSync(file, code);
