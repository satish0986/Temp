const { Boom } = require('@hapi/boom');
const Baileys = require('@whiskeysockets/baileys');
const { useMultiFileAuthState } = Baileys;
const pino = require('pino');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function startLogin(phone) {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('./auth'); // Minimal session folder setup
    
    const negga = Baileys.makeWASocket({
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['Ubuntu', 'Chrome', '20.0.04'],
      auth: state,
    });

    if (!negga.authState.creds.registered) {
      const phoneNumber = phone.replace(/[^0-9]/g, '');
      if (phoneNumber.length < 11) throw new Error('Invalid phone number with country code.');

      const generatePairingCode = async () => {
        try {
          const code = await negga.requestPairingCode(phoneNumber);
          console.log(`This is your pairing code: ${code}`);
        } catch (err) {
          console.error('Error requesting pairing code:', err);
        }
      };

      // Generate a new pairing code every 60 seconds
      setInterval(generatePairingCode, 60000);

      // Generate the first pairing code immediately
      await generatePairingCode();
    }

    negga.ev.on('creds.update', saveCreds);

    negga.ev.on('connection.update', (update) => {
      const { connection } = update;

      if (connection === 'open') {
        console.log('Login successful');
      }

      if (connection === 'close') {
        console.log('Login failed. Stopping pairing code generation.');
        process.exit(1); // Exit the program without reconnecting
      }
    });
  } catch (error) {
    console.error('Login failed:', error);
    process.exit(1);
  }
}

function askQuestion(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

(async () => {
  const phone = await askQuestion('Enter your number: ');
  await startLogin(phone);
})();
