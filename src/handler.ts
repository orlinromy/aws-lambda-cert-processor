import { Handler } from 'aws-lambda'

import AWS from 'aws-sdk'
import crypto, { X509Certificate } from 'crypto'

const s3 = new AWS.S3()
const dynamoDB = new AWS.DynamoDB.DocumentClient({
  region: 'ap-southeast-1'
})

export const lambdaHandler: Handler = async (event, context): Promise<any> => {
  try {
    const bucketName = 'testing-cert'
    const objectKey = 'public.pem'
    const dynamoTableName = 'CertificateStore'

    console.log('reading certificate from S3...')
    const certificatePem = await getObjectFromS3(bucketName, objectKey)
    const cert = new X509Certificate(certificatePem)

    console.log('extracting public key...')
    const publicKey = cert.publicKey.toString()

    console.log('extracting common name...')
    const subject = cert.subject
    const commonNameMatch = subject.match(/CN=([^,]+)/)
    if (!commonNameMatch) {
      throw new Error('CommonName (CN) not found in certificate subject.')
    }
    const commonName = commonNameMatch[1]

    console.log('generating private key using RSA...')
    const { privateKey, publicKey: generatedPublicKey } =
      crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048
      })

    console.log('signing public key with private key...')
    const sign = crypto.createSign('SHA256')
    sign.update(publicKey)
    sign.end()
    const signature = sign.sign(privateKey, 'base64')

    console.log('writing data to dynamoDB...')
    const params: AWS.DynamoDB.DocumentClient.PutItemInput = {
      TableName: dynamoTableName,
      Item: {
        CommonName: commonName,
        EncryptedKey: signature
      }
    }
    await dynamoDB.put(params).promise()

    // bonus: generate private key using EC
    console.log('generating private key using EC...')
    const { privateKey: ecPrivateKey, publicKey: ecPublicKey } =
      crypto.generateKeyPairSync('ec', {
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

    console.log('signing public key with EC private key...')
    const shaSign = crypto.createSign('SHA256')
    shaSign.update(publicKey)
    shaSign.end()
    const ecSignature = shaSign.sign(ecPrivateKey, 'base64')

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Data written to DynamoDB successfully.'
      })
    }
  } catch (error: any) {
    console.error('Error processing certificate:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    }
  }
}

const getObjectFromS3 = async (
  bucketName: string,
  objectKey: string
): Promise<string> => {
  const params: AWS.S3.GetObjectRequest = { Bucket: bucketName, Key: objectKey }
  const data = await s3.getObject(params).promise()
  return data.Body!.toString('utf-8')
}
