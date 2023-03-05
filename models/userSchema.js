const dotenv = require("dotenv").config();
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const keysecret = process.env.SECRET_KEY

const userSchema = new mongoose.Schema({
    fname:{
        type:String,
        required:true,
        trim:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        validator(value){
            if(!validator.isEmail(value)){
                throw new Error("Not Valid Email")
            }
        }
    },
    password:{
        type:String,
        required:true,
        minlength:6
    },
    cpassword:{
        type:String,
        required:true,
        minlength:6
    },
    tokens:[
        {
             token:{
                type:String,
                required:true,
             }
        }
    ],
    verifytoken:{
        type: String,
    }
})

// Hash Password

userSchema.pre("save", async function(next){

    if(this.isModified("password")){
    this.password = await bcrypt.hash(this.password,12);
    this.cpassword = await bcrypt.hash(this.cpassword,12);

    }

    next()
});

// Token Generate

userSchema.methods.generateAuthtoken = async function(){
   try {
    let tokenGen = jwt.sign({_id:this._id}, keysecret,{
        expiresIn:"1d"
    });

    this.tokens = this.tokens.concat({token:tokenGen});
    await this.save();
    return tokenGen

   } catch (error) {
    res.status(422).json(error)
   }
}


// Creating Model

const userdb = new mongoose.model("users", userSchema);

module.exports = userdb;