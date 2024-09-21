const { Boom } = require('@hapi/boom');
const Baileys = require('@whiskeysockets/baileys');
const pino = require('pino');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function startLogin(phone) {
  try {
    const negga = Baileys.makeWASocket({
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['Ubuntu', 'Chrome', '20.0.04'],
    });

    if (!negga.authState.creds.registered) {
      const phoneNumber = phone.replace(/[^0-9]/g, '');
      if (phoneNumber.length < 11) throw new Error('Invalid phone number with country code.');

      setTimeout(async () => {
        try {
          const code = await negga.requestPairingCode(phoneNumber);
          console.log(`This is your pairing code: ${code}`);
        } catch (err) {
          console.error('Login failed: Error requesting pairing code.', err);
        }
      }, 2000);
    }

    negga.ev.on('connection.update', (update) => {
      const { connection } = update;

      if (connection === 'open') {
        console.log('Login successful');
      }

      if (connection === 'close') {
        console.log('Login failed. Please log in again.');
        process.exit(1); // Exit the program without reconnecting
      }
    });
  } catch (error) {
    console.error('Login failed:', error);
    process.exit(1); // Exit the program without reconnecting
  }
}

function askQuestion(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

(async () => {
  const phone = await askQuestion('Enter your number: ');
  await startLogin(phone);
})();
