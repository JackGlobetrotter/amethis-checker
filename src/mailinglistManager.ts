import crypto from 'crypto';
import bcrypt from 'bcrypt';
import AWS from "aws-sdk";
const s3 = new AWS.S3()

const mailfile = process.env.MAILFILE || 'mailfile.txt';
const ivfile = process.env.IVFILE || 'init.iv';
let password: string; // = crypto.randomBytes(32).toString("hex");
const algorithm = "aes-256-cbc";

const getMailinglist = async ():Promise<Array<string>> => {

    let rawData = await fileExists(mailfile) ? (await s3.getObject({
        Bucket: process.env.BUCKET as string,
        Key: mailfile,
    }).promise()).Body!.toString() : JSON?.stringify([])
    const data = JSON.parse(await decrypt(rawData));
    return data;

}

const addMailAddress = async (mail: string, pwd: string) => {
 
    if (bcrypt.compareSync(pwd, process.env.PASSWORDHASH || "")) {
        if (!password || password === "")
            password = pwd;
    }
    else { throw new Error("Wrong passowrd!!!") }

    const file = await fileExists(mailfile) ? await s3.getObject({
        Bucket: process.env.BUCKET as string,
        Key: mailfile,
    }).promise() : undefined;
    const rawData = file && file.Body ? file.Body.toString() : "";
    const list: Array<string> = rawData.length > 0 ? JSON.parse(await decrypt(rawData)) : new Array();
    if (!list.includes(mail)) list.push(mail);

    await s3.putObject({
        Bucket: process.env.BUCKET as string,
        Key: mailfile,
        Body: await encrypt(JSON.stringify(list))
    }).promise()
}

const removeMailAddress = async (mail: string, pwd: string) => {
    if (bcrypt.compareSync(pwd, process.env.PASSWORDHASH || "")) {
        if (!password || password === "")
            password = pwd;
    }
    else { throw new Error("Wrong passowrd!!!") }

    const file = await fileExists(mailfile) ? await s3.getObject({
        Bucket: process.env.BUCKET as string,
        Key: mailfile,
    }).promise() : undefined;
    const rawData = file && file.Body ? file.Body.toString() : "";

    const list: Array<string> = rawData.length > 0 ? JSON.parse(await decrypt(rawData)) : new Array();
    if (list.includes(mail)) list.splice(list.indexOf(mail), 1);

    await s3.putObject({
        Bucket: process.env.BUCKET as string,
        Key: mailfile,
        Body: await encrypt(JSON.stringify(list))
    }).promise()
}

async function fileExists(file: string) {
    return await s3.headObject({
        Bucket: process.env.BUCKET as string,
        Key: file,
    }).promise()
        .then(
            () => true,
            err => {
                if (err.code === 'NotFound') {
                    return false;
                }
                throw err;
            }
        );
}

async function createIV() {
    await s3.putObject({
        Body: crypto.randomBytes(16).toString('hex'),
        Bucket: process.env.BUCKET as string,
        Key: ivfile,

    }).promise()
}

async function getIV() {
    if (!await fileExists(ivfile))
        await createIV();
    const iv = Buffer.from((await s3.getObject({
        Bucket: process.env.BUCKET as string,
        Key: ivfile,
    }).promise()).Body!.toString(), "hex");
    if (iv.length !== 16)
        throw new Error("IV of wrong length!!!")
    else return iv
}

async function encrypt(data: string) {
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(password, "hex"), await getIV());
    let encryptedData = cipher.update(data, "utf-8", "hex");
    encryptedData += cipher.final("hex");
    return encryptedData;
}

async function decrypt(data: string, pwd = "") {
    if (pwd === "") pwd = password;
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(pwd, "hex"), await getIV());
    let decryptedData = decipher.update(data, "hex", "utf-8");
    decryptedData += decipher.final("utf-8");
    return decryptedData;
}

export { password, getMailinglist, addMailAddress, decrypt, encrypt, removeMailAddress }