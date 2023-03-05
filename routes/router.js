
const express = require("express");
const router = new express.Router();
const userdb = require("../models/userSchema");
const bcrypt = require("bcryptjs");
const authenticate = require("../middleware/authenticate");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const keysecret = process.env.SECRET_KEY



//// Email Config

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "nodemaileraccess@gmail.com",
        pass: process.env.PASS
    }
})


/// for user registration

router.post("/register", async (req, res) => {

    const { fname, email, password, cpassword } = req.body;

    if (!fname || !email || !password || !cpassword) {

        res.status(422).json({ error: "Please Fill all the details" })
    }

    try {

        const preuser = await userdb.findOne({ email: email });

        if (preuser) {
            res.status(422).json({ error: "This Email is Already Exist" })
        } else if (password !== cpassword) {
            res.status(422).json({ error: "Password and Confirm Password Not Match" })
        } else {
            const finalUser = new userdb({
                fname, email, password, cpassword
            });

            //// Here Password Hashing

            const storeData = await finalUser.save();
            console.log(storeData);

            res.status(201).json({ status: 201, storeData })
        }

    } catch (error) {
        res.status(422).json(error);
        console.log("catch block error");

    }
});


// User Login

router.post("/login", async (req, res) => {

    //// console.log(req.body);

    const { email, password } = req.body;

    if (!email || !password) {

        res.status(422).json({ error: "Please Fill all the details" })
    }
    try {

        const userValid = await userdb.findOne({ email: email });

        if (userValid) {
            const isMatch = await bcrypt.compare(password, userValid.password);

            if (!isMatch) {
                res.status(422).json({ error: "Invalid Details" })
            } else {

                //// Token Generate
                const token = await userValid.generateAuthtoken()

                //// Cookie-Generate
                res.cookie("usercookie", token, {
                    expires: new Date(Date.now() + 9000000),
                    httpOnly: true
                });

                const result = {
                    userValid,
                    token
                }
                res.status(201).json({ status: 201, result })

            }

        } else {
            res.json({
                message: "Password was incorrect!!",
            });

        }

    } catch (error) {

    }
});


/// User Valid

router.get("/validuser", authenticate, async (req, res) => {

    try {

        const ValidUserOne = await userdb.findOne({ _id: req.userId });

        res.status(201).json({ status: 201, ValidUserOne });
    } catch (error) {
        res.status(201).json({ status: 401, error });
    }

})


// User Log-Out

router.get("/logout", authenticate, async (req, res) => {
    try {
        req.rootUser.tokens = req.rootUser.tokens.filter((curelem) => {
            return curelem.token !== req.token
        })

        res.clearCookie("usercookie", { path: "/" });

        req.rootUser.save();

        res.status(201).json({ status: 201 })
    } catch (error) {
        res.status(201).json({ status: 401, error })
    }
})


/// Send Email Link for Reset Password

router.post("/sendpasswordlink", async (req, res) => {
    console.log(req.body)

    const { email } = req.body;

    if (!email) {
        res.status(401).json({ status: 401, message: "Enter Your Email" })
    }

    try {
        const userfind = await userdb.findOne({ email: email });

        //// Token generate for Reset Password

        const token = jwt.sign({ _id: userfind._id }, keysecret, {
            expiresIn: "300s"
        });

        const setusertoken = await userdb.findByIdAndUpdate({ _id: userfind._id }, { verifytoken: token }, { new: true });

        if (setusertoken) {
            const mailOptions = {
                from: "nodemaileraccess@gmail.com",
                to: email,
                subject: "Send Email for Password Reset",
                text: `This Link Valid 5 minutes http://localhost:3000/forgotpassword/${userfind.id}/${setusertoken.verifytoken}`
            }

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log("Error :", error);
                    res.status(401).json({ status: 401, message: "Email not Send" })
                } else {
                    console.log("Email Sent :", info.response);
                    res.status(201).json({ status: 201, message: "Email has been send Successfully" })

                }
            })
        }

    } catch (error) {
        res.status(401).json({ status: 401, message: "Invalid User" })
    }

});

//// Verify User for Forgot Password Time

router.get("/forgotpassword/:id/:token", async (req, res) => {
    const { id, token } = req.params;

    try {
        const validuser = await userdb.findOne({ _id: id, verifytoken: token });

        const verifyToken = jwt.verify(token, keysecret);

        console.log(verifyToken)

        if (validuser && verifyToken._id) {

            res.status(201).json({ status: 201, validuser })

        } else {

            res.status(401).json({ status: 401, message: "User not Exist" })
        }

    } catch (error) {
        res.status(401).json({ status: 401, error })
    }

})


//// Change the New Password

router.post("/:id/:token", async (req, res) => {
    const { id, token } = req.params;

    const { password } = req.body;

    try {
        const validuser = await userdb.findOne({ _id: id, verifytoken: token });

        const verifyToken = jwt.verify(token, keysecret);

        console.log(verifyToken)

        if (validuser && verifyToken._id) {
            const newpassword = await bcrypt.hash(password, 12);

            const setnewuserpass = await userdb.findByIdAndUpdate({ _id: id }, { password: newpassword });

            setnewuserpass.save()

            res.status(201).json({ status: 201, setnewuserpass })

        } else {

            res.status(401).json({ status: 401, message: "User not Exist" })
        }

    } catch (error) {
        res.status(401).json({ status: 401, error })
    }
})


module.exports = router;