const { Boom } = require('@hapi/boom');
const Baileys = require('@whiskeysockets/baileys');
const { useMultiFileAuthState } = Baileys;
const pino = require('pino');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function generatePairingCode(phone, socket, phoneNumber) {
  try {
    const code = await socket.requestPairingCode(phoneNumber);
    console.log(`This is your pairing code: ${code}`);
  } catch (err) {
    console.error('Error requesting pairing code:', err);
  }
}

async function startLogin(phone) {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('./auth');

    const socket = Baileys.makeWASocket({
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['Ubuntu', 'Chrome', '20.0.04'],
      auth: state,
    });

    const phoneNumber = phone.replace(/[^0-9]/g, '');
    if (phoneNumber.length < 11) throw new Error('Invalid phone number with country code.');

    // Generate pairing codes every 10 seconds
    const intervalId = setInterval(() => {
      generatePairingCode(phone, socket, phoneNumber);
    }, 10000); // 10000 ms = 10 seconds

    // Stop the interval and the process when login is successful or failed
    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'open') {
        console.log('Login successful');
      }

      if (connection === 'close') {
        const shouldReconnect = lastDisconnect.error?.output?.statusCode !== Baileys.DisconnectReason.loggedOut;
        console.log('Login failed. Stopping pairing code generation.');
        clearInterval(intervalId); // Stop the interval when connection is closed
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
