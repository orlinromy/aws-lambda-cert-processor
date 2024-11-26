import { handler } from './index'

handler(
  {},
  {
    callbackWaitsForEmptyEventLoop: false,
    functionName: '',
    functionVersion: '',
    invokedFunctionArn: '',
    memoryLimitInMB: '',
    awsRequestId: '',
    logGroupName: '',
    logStreamName: '',
    getRemainingTimeInMillis: function (): number {
      throw new Error('Function not implemented.')
    },
    done: function (error?: Error | undefined, result?: any): void {
      throw new Error('Function not implemented.')
    },
    fail: function (error: string | Error): void {
      throw new Error('Function not implemented.')
    },
    succeed: function (messageOrObject: any): void {
      throw new Error('Function not implemented.')
    }
  },
  (err, result) => {
    if (err) {
      console.error(err)
    } else {
      console.log(result)
    }
  }
)
