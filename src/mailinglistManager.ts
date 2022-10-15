import crypto from 'crypto';
import bcrypt from 'bcrypt';
import AWS from "aws-sdk";
import { mail } from './mail';
import { ERROR } from './constants';
const s3 = new AWS.S3()

const mailfile = process.env.MAILFILE || 'mailfile.txt';
const ivfile = process.env.IVFILE || 'init.iv';
let auth_password = process.env.PASSWORDHASH || ''; // = crypto.randomBytes(32).toString("hex");
let file_password = process.env.FILEPASSWORD || ''; // = crypto.randomBytes(32).toString("hex");
const algorithm = "aes-256-cbc";

const getMailinglist = async (): Promise<Array<string>> => {
    const mailFileExists = await fileExists(mailfile);
    if (mailFileExists) {
        const rawData = (await s3.getObject({
            Bucket: process.env.BUCKET as string,
            Key: mailfile,
        }).promise()).Body!.toString()
        const data = JSON.parse(await decrypt(rawData));
        return data;
    } else
        return []

}

const addMailAddress = async (mail: string, pwd: string) => {

    if (!bcrypt.compareSync(pwd, auth_password)) return ERROR.WRONG_PASSWORD;

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

    await sendCustomMessage("Your address was successfully added to amethis-checker", "You were added to amethis-checker", mail);
    return ERROR.NONE;
}

const removeMailAddress = async (mail: string, pwd: string) => {
    if (!bcrypt.compareSync(pwd, auth_password)) return ERROR.WRONG_PASSWORD;

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

    await sendCustomMessage("Your address was successfully removed from amethis-checker", "Your address has been removed from amethis-checker", mail);
    return ERROR.NONE;
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
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(file_password, "hex"), await getIV());
    let encryptedData = cipher.update(data, "utf-8", "hex");
    encryptedData += cipher.final("hex");
    return encryptedData;
}

async function decrypt(data: string, pwd = "") {
    if (pwd === "") pwd = file_password;
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(pwd, "hex"), await getIV());
    let decryptedData = decipher.update(data, "hex", "utf-8");
    decryptedData += decipher.final("utf-8");
    return decryptedData;
}

async function sendCustomMessage(message: string, title: string, address: string) {

    await mail.sendMail({
        from: process.env.MAILADDRESS||"",
        to: address,
        subject: title,
        text: message,
        html: `<p>${message}</p>`
    }).then(() => console.log('custom mails sucessfully send')).catch(() => console.log('error sending custom mails'))

}

async function clearAll(pwd: string) {
    if (!bcrypt.compareSync(pwd, auth_password)) return ERROR.WRONG_PASSWORD

    await s3.deleteObject({
        Bucket: process.env.BUCKET as string,
        Key: ivfile,
    }).promise()
    await s3.deleteObject({
        Bucket: process.env.BUCKET as string,
        Key: mailfile,
    }).promise()

    return ERROR.NONE;


}

export { file_password, getMailinglist, addMailAddress, decrypt, encrypt, removeMailAddress, sendCustomMessage, clearAll }