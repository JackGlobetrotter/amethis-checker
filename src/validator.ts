import { body } from "express-validator";
import express from 'express'
import {  validationResult } from 'express-validator';

const validatePassword = [

    body('password')
        .not()
        .isEmpty(),
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const errors = validationResult(req);
        if (!errors.isEmpty())
            return res.status(422).json({ errors: errors.array() });
        next();
    },
];

const validateMail = [
    body('email')
        .trim()
        .escape()
        .normalizeEmail()
        .not()
        .isEmpty()
        .withMessage('Mail name can not be empty!')
        .bail()
        .isLength({ min: 3 })
        .withMessage('Minimum 3 characters required!')
        .bail(),

    (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const errors = validationResult(req);
        if (!errors.isEmpty())
            return res.status(422).json({ errors: errors.array() });
        next();
    },
];

export { validateMail, validatePassword }