
const readline = require("readline");
const { randomUUID } = require("crypto");
const argon2 = require("argon2");
const db = require("./database/db");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

function askHidden(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    let password = "";

    stdout.write(question);
    stdin.resume();
    stdin.setRawMode(true);
    stdin.setEncoding("utf8");

    function onData(char) {
      if (char === "\u0003") {
        stdout.write("\n");
        cleanup();
        process.exit(1);
      }

      if (char === "\r" || char === "\n") {
        stdout.write("\n");
        cleanup();
        resolve(password);
        return;
      }

      if (char === "\u007f" || char === "\b") {
        password = password.slice(0, -1);
        return;
      }

      if (char >= " " && char !== "\u007f") {
        password += char;
      }
    }

    function cleanup() {
      stdin.removeListener("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
    }

    stdin.on("data", onData);
  });
}

async function main() {
  try {
    const adminExists = db
      .prepare("SELECT COUNT(*) AS total FROM users WHERE role = 'admin'")
      .get().total;

    if (adminExists > 0) {
      throw new Error("An admin account already exists. Setup is disabled.");
    }

    const mobile = (await ask("Admin mobile number: ")).trim();

    if (!/^09\d{9}$/.test(mobile)) {
      throw new Error("Invalid mobile number. Use 09xxxxxxxxx.");
    }

    const password = await askHidden("Admin password (hidden): ");

    if (password.length < 12 || password.length > 128) {
      throw new Error("Password must be between 12 and 128 characters.");
    }

    const confirmPassword = await askHidden("Confirm password (hidden): ");

    if (password !== confirmPassword) {
      throw new Error("Passwords do not match.");
    }

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    db.prepare(`
      INSERT INTO users (id, mobile, password_hash, role)
      VALUES (?, ?, ?, 'admin')
    `).run(randomUUID(), mobile, passwordHash);

    console.log("Initial admin account created successfully.");
    console.log("Keep your mobile number and password safe.");
  } catch (error) {
    console.error("Admin setup failed:", error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
    db.close();
  }
}

main();
