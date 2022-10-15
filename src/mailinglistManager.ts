import fs from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const mailfile = process.env.MAILFILE || 'mailfile.txt';
const ivfile = process.env.IVFILE || 'init.iv';
let password: string; // = crypto.randomBytes(32).toString("hex");
const algorithm = "aes-256-cbc";

const getMailinglist = () => {
    fs.readFile(mailfile, 'utf-8', function (err, data) {
        if (err) {
            console.log(err);
        }
        return data;
    });

}

const addMailAddress = (mail: string, pwd: string) => {

    if (bcrypt.compareSync(pwd, process.env.PASSWORDHASH || "")) {
        if (!password || password === "")
            password = pwd;
    }
    else { throw new Error("Wrong passowrd!!!") }

    const rawData = fs.existsSync(mailfile) ? fs.readFileSync(mailfile, 'utf-8') : "";
    const list: Array<string> = rawData.length > 0 ? JSON.parse(decrypt(rawData)) : new Array();
    if (!list.includes(mail)) list.push(mail);

    fs.writeFile(mailfile, encrypt(JSON.stringify(list)), 'utf-8', (err) => {
        if (err) {
            console.log(err);
            console.log(`error for address ${mail}`);
        }
    })
}

const removeMailAddress = (mail: string, pwd: string) => {
    if (bcrypt.compareSync(pwd, process.env.PASSWORDHASH || "")) {
        if (!password || password === "")
            password = pwd;
    }
    else { throw new Error("Wrong passowrd!!!") }

    const rawData = fs.existsSync(mailfile) ? fs.readFileSync(mailfile, 'utf-8') : "";
    const list: Array<string> = rawData.length > 0 ? JSON.parse(decrypt(rawData)) : new Array();
    if (list.includes(mail)) list.splice(list.indexOf(mail), 1);

    fs.writeFile(mailfile, encrypt(JSON.stringify(list)), 'utf-8', (err) => {
        if (err) {
            console.log(err);
            console.log(`error for address ${mail}`);
        }
    })
}

function createIV() {
    fs.writeFileSync(ivfile, crypto.randomBytes(16), "binary");

}

function getIV() {
    if (!fs.existsSync(ivfile))
        createIV();
    const iv = Buffer.from(fs.readFileSync(ivfile, "binary"), "binary");
    if (iv.length !== 16)
        throw new Error("IV of wrong length!!!")
    else return iv
}

function encrypt(data: string) {
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(password, "hex"), getIV());
    let encryptedData = cipher.update(data, "utf-8", "hex");
    encryptedData += cipher.final("hex");
    return encryptedData;
}

function decrypt(data: string, pwd = "") {
    if (pwd === "") pwd = password;
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(pwd, "hex"), getIV());
    let decryptedData = decipher.update(data, "hex", "utf-8");
    decryptedData += decipher.final("utf-8");
    return decryptedData;
}

export { password, getMailinglist, addMailAddress, decrypt, encrypt, removeMailAddress }