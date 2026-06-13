require('dotenv').config();

const { sendHelloChan, formatSlackError } = require('../lib/slack');

if (require.main === module) {
  sendHelloChan()
    .then(({ channel, text, ts }) => {
      console.log(`Sent "${text}" to ${channel} (ts: ${ts})`);
    })
    .catch((error) => {
      console.error(formatSlackError(error));
      process.exit(1);
    });
}

module.exports = { sendHelloChan };
