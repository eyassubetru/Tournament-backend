require('dotenv').config();

const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const sendSMS = async (phoneNumber, otp) => {
  try {
    const message = await client.messages.create({
      body: `Your OTP is ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });

    console.log("SMS SENT:", message.sid);

    return {
      success: true,
      data: message
    };

  } catch (error) {
    console.log("SMS ERROR:", error.message);

    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = { sendSMS }




