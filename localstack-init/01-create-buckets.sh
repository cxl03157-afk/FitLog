#!/bin/bash
set -e

if awslocal s3api head-bucket --bucket fitlog 2>/dev/null; then
  echo "S3 bucket 'fitlog' already exists."
else
  awslocal s3 mb s3://fitlog --region ap-northeast-1
  echo "S3 bucket 'fitlog' created."
fi
