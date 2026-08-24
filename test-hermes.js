// Try to throw "Property 'address' doesn't exist"
const obj = {};
try {
  obj.address.length;
} catch (e) {
  console.log(1, e.message);
}
try {
  address;
} catch (e) {
  console.log(2, e.message);
}
