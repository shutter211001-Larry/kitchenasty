require('dotenv').config();
const { sendEmail } = require('./src/lib/email.ts');
const { tenantStorage } = require('./src/middleware/tenantStorage.ts');

async function test() {
  await new Promise((resolve) => {
    tenantStorage.run({ tenantId: null }, async () => {
      try {
        await sendEmail({
          to: 'shutter211001@gmail.com',
          subject: 'Test Key Confirmation',
          html: '<p>This is a test</p>'
        });
        console.log("Email task queued...");
      } catch (err) {
        console.error("Error sending email:", err);
      }
      setTimeout(resolve, 5000); // Wait 5 seconds for background task to finish
    });
  });
}

test();
