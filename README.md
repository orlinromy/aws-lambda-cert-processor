# aws-lambda-cert-processor

## Local setup

### Clone the repo

```
git clone https://github.com/orlinromy/aws-lambda-cert-processor.git
```

### Install dependencies

```
cd aws-lambda-cert-processor
npm i
```

### Configure AWS credentials

- Copy `.env.example` file and rename it to `.env`
- Input your `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in `.env` file
- Run `source .env` in your dev terminal to use the credentials in your dev environment

### Run locally

Run the script by executing the following command

```
npm run dev
```

## Manual Deployment

Build

```
npm run build
```

Update lambda function code

```
aws lambda update-function-code --function-name \<lambda function name\> --zip-file "fileb://dist/index.zip"
```

## Invoking Lambda Function

- Go to Postman
- Configure the following:
  - method: GET
  - URL: \<Lambda Function URL\>
  - Authorization: select **AWS Signature** from the **Type** dropdown and fill in the required field
- Click **Send**
