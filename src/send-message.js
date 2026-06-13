require('dotenv').config();

const { sendMessage, formatSlackError } = require('../lib/slack');

sendMessage()
  .then(({ channel, text, ts }) => {
    console.log(`Sent "${text}" to ${channel} (ts: ${ts})`);
  })
  .catch((error) => {
    console.error(formatSlackError(error));
    process.exit(1);
  });
