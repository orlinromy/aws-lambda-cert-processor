provider "aws" {
  region = "ap-southeast-1"
}

# S3
resource "aws_s3_bucket" "certificate_storage" {
  bucket = "terr-testing-cert"
}

resource "aws_s3_bucket_versioning" "versioning_example" {
  bucket = aws_s3_bucket.certificate_storage.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_object" "pem_file_upload" {
  bucket = aws_s3_bucket.certificate_storage.bucket
  key    = "public.pem"
  source = "../${path.module}/assets/public.pem"
}

# DynamoDB
resource "aws_dynamodb_table" "certificate_store_dynamodb" {
  name         = "TerrCertificateStore"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "CommonName"
  range_key    = "EncryptedKey"

  attribute {
    name = "CommonName"
    type = "S"
  }

  attribute {
    name = "EncryptedKey"
    type = "S"
  }

}

output "dynamodb_table_arn" {
  value = aws_dynamodb_table.certificate_store_dynamodb.arn
}

# Lambda
data "aws_iam_policy_document" "lambda_exec_assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}


resource "aws_iam_role" "exec_role_for_lambda" {
  name               = "TerrCertificateStoreLambdaExecRole"
  assume_role_policy = data.aws_iam_policy_document.lambda_exec_assume_role.json
}


resource "aws_lambda_function" "certificate_store_lambda" {
  function_name = "TerrCertificateStore"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 30
  memory_size   = 512
  role          = aws_iam_role.exec_role_for_lambda.arn
  filename      = "../${path.module}/dist/index.zip"
}

resource "aws_lambda_function_url" "certificate_store_lambda_function_url" {
  function_name      = aws_lambda_function.certificate_store_lambda.function_name
  authorization_type = "AWS_IAM"
}

output "lambda_function_url" {
    value = aws_lambda_function_url.certificate_store_lambda_function_url.function_url
}

# Permission settings
data "aws_iam_policy_document" "allow_s3_access_from_lambda" {
  statement {
    principals {
      type        = "AWS"
      identifiers = ["arn:aws:sts::724874195898:assumed-role/${aws_iam_role.exec_role_for_lambda.name}/${aws_lambda_function.certificate_store_lambda.function_name}"]
    }

    actions = [
      "s3:GetObject",
      "s3:ListBucket",
    ]

    resources = [
      "${aws_s3_bucket.certificate_storage.arn}/*",
    ]
  }
}

resource "aws_s3_bucket_policy" "allow_s3_access_from_lambda" {
  bucket = aws_s3_bucket.certificate_storage.id
  policy = data.aws_iam_policy_document.allow_s3_access_from_lambda.json
}

resource "aws_dynamodb_resource_policy" "allow_dynamodb_access_from_lambda" {
  resource_arn = aws_dynamodb_table.certificate_store_dynamodb.arn
  policy       = data.aws_iam_policy_document.allow_dynamodb_access_from_lambda.json
}

data "aws_iam_policy_document" "allow_dynamodb_access_from_lambda" {
  statement {
    principals {
      type        = "AWS"
      identifiers = ["arn:aws:sts::724874195898:assumed-role/${aws_iam_role.exec_role_for_lambda.name}/${aws_lambda_function.certificate_store_lambda.function_name}"]
    }
    actions   = ["dynamodb:PutItem"]
    resources = [aws_dynamodb_table.certificate_store_dynamodb.arn]

  }
}