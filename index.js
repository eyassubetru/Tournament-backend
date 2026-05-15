const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const admin = require("firebase-admin");
const os = require("os");


const { sendSMS } = require('./sms.js');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());


const {db} = require('./firebaseConfig');
const { error } = require("console");


// Generate OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

const createUser = async (phoneNumber , password) => {
    const uid = phoneNumber;

    await db.collection('users').doc(uid).set({
         phoneNumber,
         password,
         isPaid: false,
         createdAt: Date.now()
    })

    return uid
}


app.post("/login",async (req, res) => {

    try {

        const {phoneNumber , password} = req.body;
        if (!password || !phoneNumber){
            return res.status(404).json({
                success: false,
                message: "Missing fields"
            })
        }

        const userRef = db.collection('users').doc(phoneNumber);
        const userDoc = await userRef.get();

        if(!userDoc.exists){
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }

        const user = userDoc.data();

        if(user.password !== password){
             return res.status(401).json({
                success: false,
                message: "Wrong password"
            })
        }

        const customToken = await admin.auth().createCustomToken(phoneNumber);

        return res.json({
            success: true,
            message: "Login successful",
            customToken,
            user: {
                phoneNumber: user.phoneNumber,
                isPaid: user.isPaid
            }
        });



    } catch (error) {
        console.log(error)
         res.status(500).json({
            success: false,
            message: "Server error"
        });
    }

   


})


app.post("/send-otp", async (req, res) => {

    try {
        const { phoneNumber } = req.body;
        console.log("phone number", phoneNumber)

        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                message: "Phone number required",
            });
        }

        /* check user already registered */

        const userRef = db.collection("users").doc(phoneNumber);
        const userRefDoc = await userRef.get();

        if(userRefDoc.exists) {
             return res.status(429).json({
                    success: false,
                    message: "You have already registered use phone number and password to login", 
                });
        }

        /* check otp exists */
        const otpRef = db.collection("otps").doc(phoneNumber);
        const doc = await otpRef.get()
 
        
        const OTP_EXPIRATION = 5 * 60 * 1000;

        if (doc.exists) {
             const data =  doc.data();
            const now = Date.now()
            const isExpired = now - data.createdAt > OTP_EXPIRATION;
           
            console.log("otp exist")

            if (!isExpired) {
                const remainingSeconds = Math.ceil(
                    (OTP_EXPIRATION - (now - data.createdAt)) / 1000
                );

                return res.status(429).json({
                    success: false,
                    message: "OTP already sent please check your whatsApp", 
                    remainingSeconds,
                });
            }
        }

        const otp = generateOTP();

        const smsResult = await sendSMS(phoneNumber, otp);

        if (!smsResult.success) {
            return res.status(500).json({
                success: false,
                message: "can't send Otp please try again"
            });
        }

// Save OTP only after SMS success
await db.collection("otps").doc(phoneNumber).set({
    otp,
    createdAt: Date.now(),
});

        // Console log OTP
        console.log(`
        =================================
        PHONE: ${phoneNumber}
        OTP: ${otp}
        =================================
`);
       

        res.json({
            success: true,
            message: "OTP generated successfully",
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
});

app.post("/verify-otp", async (req, res) => {
    try {
        const { phoneNumber, password , otp } = req.body;

        console.log(phoneNumber, otp, "-------")

        if (!phoneNumber || !otp) {
            return res.status(400).json({
                success: false,
                message: "Missing fields",
            });
        }

        // Get OTP from Firestore
        const doc = await db.collection("otps").doc(phoneNumber).get();

        if (!doc.exists) {
            return res.status(400).json({
                success: false,
                message: "OTP not found",
            });
        }

        const data = doc.data();

        // Compare OTP
        if (data.otp !== otp) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP",
            });
        }

        // Create Firebase Auth user if not exists
        let user;

        try {
            user = await admin.auth().getUser(phoneNumber);
        } catch {

            user = await admin.auth().createUser({
                uid: phoneNumber,
            });
        }

        // Create custom token
        const customToken = await admin.auth().createCustomToken(user.uid);

        // Delete OTP after success
        await db.collection("otps").doc(phoneNumber).delete();

        await createUser(phoneNumber , password)

        res.json({
            success: true,
            message: "Login successful",
            customToken,
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



/* app.listen(PORT, "0.0.0.0", () => {
    const networkInterfaces = os.networkInterfaces();

    let localIp = "localhost";

    for (const interfaceName in networkInterfaces) {
        for (const network of networkInterfaces[interfaceName]) {
            if (network.family === "IPv4" && !network.internal) {
                localIp = network.address;
            }
        }
    }

    console.log(`
Server running 🚀

Local:   http://localhost:${PORT}
Network: http://${localIp}:${PORT}
  `);
}); */