import { Handler } from 'aws-lambda'

import AWS from 'aws-sdk'
import { X509Certificate } from 'crypto'
import { sign } from './helper/sign'

const s3 = new AWS.S3()
const dynamoDB = new AWS.DynamoDB.DocumentClient({
  region: 'ap-southeast-1'
})

export const lambdaHandler: Handler = async (event, context): Promise<any> => {
  const requestBody = event.body
  let algorithm = 'rsa'
  if (requestBody) {
    const parsedRequestBody = JSON.parse(requestBody)
    if (parsedRequestBody.algorithm) {
      algorithm = parsedRequestBody.algorithm
    }
  }
  try {
    const bucketName = 'terr-testing-cert'
    const objectKey = 'public.pem'
    const dynamoTableName = 'TerrCertificateStore'

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

    console.log(`signing public key...`)
    const { signature, signingAlgorithm } = sign(publicKey, algorithm)
    console.log(
      `signed with ${signingAlgorithm} and signature starts with ${signature.slice(
        0,
        5
      )}`
    )

    console.log('writing data to dynamoDB...')
    const params: AWS.DynamoDB.DocumentClient.PutItemInput = {
      TableName: dynamoTableName,
      Item: {
        CommonName: commonName,
        EncryptedKey: signature,
        Algorithm: signingAlgorithm
      }
    }
    await dynamoDB.put(params).promise()

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
