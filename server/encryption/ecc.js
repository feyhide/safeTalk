import crypto from 'crypto'

export const generateECCKeys = () => {
    return crypto.generateKeyPairSync('ec', { namedCurve: 'secp256k1' });
}

export const deriveKey = (password, salt) => {
    return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}

export const encryptPrivateKey = (privateKey, password) => {
    const salt = crypto.randomBytes(16); 
    const derivedKey = deriveKey(password, salt); 
    const iv = crypto.randomBytes(16); 
    const cipher = crypto.createCipheriv('aes-256-cbc', derivedKey, iv);
    let encrypted = cipher.update(privateKey, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return { encrypted, keyIv: iv.toString('base64'), keySalt: salt.toString('base64') };
}

export const decryptPrivateKey = (encrypted, password, iv, salt) => {
    const derivedKey = deriveKey(password, Buffer.from(salt, 'base64'));
    const decipher = crypto.createDecipheriv('aes-256-cbc', derivedKey, Buffer.from(iv, 'base64'));
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

export const encryptMessage = (message, sharedSecret) => {
    const iv = crypto.randomBytes(16); 
    const cipher = crypto.createCipheriv('aes-256-cbc', sharedSecret.slice(0, 32), iv);
    let encrypted = cipher.update(message, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return { encrypted, iv: iv.toString('base64') };
}

export const decryptMessage = (encrypted, sharedSecret, iv) => {
    const decipher = crypto.createDecipheriv('aes-256-cbc', sharedSecret.slice(0, 32), Buffer.from(iv, 'base64'));
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

export const deriveSharedSecret = (privateKey, publicKey) => {
    if (typeof privateKey === 'string') {
        privateKey = crypto.createPrivateKey(privateKey);  
    }

    if (typeof publicKey === 'string') {
        publicKey = crypto.createPublicKey(publicKey);
    }

    return crypto.diffieHellman({ privateKey, publicKey });
}