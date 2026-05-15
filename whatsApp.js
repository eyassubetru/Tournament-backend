const axios = require("axios");
const cors = require("cors")({ origin: true });


const WA_NUMBER_ID = "920387217815344";
const ACCESS_TOKEN = "EAAYby7Ivd20BRYutWwPHI5d8cn3NFF1sQ4MsP4lA4tbY4o5CVsLm9hfBOMas6xuSdEMVZAiBd5ROCCoeKF6mpP1ZBZCKwapkhR5Bwr8QrwZA6pI4BYLlLSIr0AzN4kGeSGpa89u8xWpPpnctwI3bk6mcdySqAUSOaZBeXzpp8y2ZAUghJxLEifrC4kEAtOQQZDZD"; // replace this, but later move to secret
const TEMPLATE_NAME = "verification_setup";
const TEMPLATE_LANGUAGE = "en_US";



function normalizePhone(phone) {
    let p = String(phone || "").trim();
    p = p.replace(/[^\d+]/g, "");

    if (p.startsWith("+251")) return p.substring(1);
    if (p.startsWith("251")) return p;
    if (p.startsWith("09") || p.startsWith("07")) return "251" + p.substring(1);
    if (p.startsWith("9") || p.startsWith("7")) return "251" + p;

    throw new Error("Invalid phone number format");
}

async function sendWhatsappMessage(phone, otp) {
     console.log("first")
   
    try {
        if (!phone) throw new Error("Phone is required");
        

        const normalizedPhone = normalizePhone(phone);

        const waResp = await axios.post(
            `https://graph.facebook.com/v22.0/${WA_NUMBER_ID}/messages`,
            {
                messaging_product: "whatsapp",
                to: normalizedPhone,
                type: "template",
                template: {
                    name: TEMPLATE_NAME,
                    language: {
                        code: TEMPLATE_LANGUAGE,
                    },
                    components: [
                        {
                            type: "body",
                            parameters: [
                                {
                                    type: "text",
                                    text: otp,
                                },
                            ],
                        },
                        {
                            type: "button",
                            sub_type: "url",
                            index: "0",
                            parameters: [
                                {
                                    type: "text",
                                    text: otp,
                                },
                            ],
                        },
                    ],
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${ACCESS_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );

        console.log("last")

        return {
            success: true,
            to: normalizedPhone,
            message_id: waResp.data?.messages?.[0]?.id || null,
        };

    } catch (error) {
        return {
            success: false,
            error: error.response?.data || error.message,
        };
    }
}

// ✅ EXPORT IT
module.exports = {
    sendWhatsappMessage,
};

