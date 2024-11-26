import crypto from 'crypto'

export function sign(
  publicKey: string,
  algorithm: string = 'rsa'
): { signature: string; signingAlgorithm: string } {
  let signingPrivateKey: crypto.KeyLike
  let signingAlgorithm = algorithm
  switch (algorithm) {
    case 'rsa':
      signingPrivateKey = generateRSAKeyPair(publicKey)
      signingAlgorithm = 'rsa'
      break
    case 'ecc':
      signingPrivateKey = generateECKeyPair(publicKey)
      signingAlgorithm = 'ecc'
      break
    default:
      signingPrivateKey = generateRSAKeyPair(publicKey)
      signingAlgorithm = 'rsa'
  }

  const sign = crypto.createSign('SHA256')
  sign.update(publicKey)
  sign.end()
  return { signature: sign.sign(signingPrivateKey, 'base64'), signingAlgorithm }
}

function generateRSAKeyPair(publicKey: string): crypto.KeyLike {
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  })
  return privateKey
}

function generateECKeyPair(publicKey: string): crypto.KeyLike {
  const { privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'P-256',
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  })
  return privateKey
}
