import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

const index = read("index.html");
const main = read("main.js");
const config = read("firebase-config.js");
const rules = read("firestore.rules");
const firebase = read("firebase.json");

assert(index.includes('type="module"') && index.includes('src="./main.js"'), "index.html must load main.js as a module");
assert(main.includes('collection(db, "bookingSlots")'), "main.js must reference bookingSlots");
assert(main.includes('collection(db, "bookings")'), "main.js must reference bookings");
assert(main.includes("runTransaction"), "booking writes must use a Firestore transaction");
assert(main.includes("browserLocalPersistence"), "Firebase Auth should use local persistence");
assert(config.includes("ADMIN_EMAIL"), "firebase-config.js must define ADMIN_EMAIL");
assert(rules.includes("request.auth != null"), "Firestore rules must require authentication for protected operations");
assert(rules.includes("match /bookings/{bookingId}"), "Firestore rules must protect booking documents");
assert(rules.includes("match /bookingSlots/{slotId}"), "Firestore rules must define booking slot access");
assert(firebase.includes('"public": "."'), "Firebase Hosting must serve the root static application");
assert(firebase.includes('"src/**"'), "Firebase Hosting should continue ignoring the stale React source tree");
assert(firebase.includes('"source": "main.js"'), "main.js should have an explicit cache policy");
assert(firebase.includes('"source": "style.css"'), "style.css should have an explicit cache policy");
assert(firebase.includes('"source": "assets/**"'), "assets should have an explicit cache policy");

// Firebase Web API keys are intentionally client-visible identifiers, so do not
// flag them as private secrets. Private-key material is never valid in this app.
const privateKeyPattern = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;
for (const [name, content] of Object.entries({ index, main, config, rules, firebase })) {
  assert(!privateKeyPattern.test(content), `${name} contains private-key material`);
}

if (failures.length) {
  console.error("Static app validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Static app validation passed.");
console.log("Checked: index.html, main.js, firebase-config.js, firestore.rules, firebase.json");
