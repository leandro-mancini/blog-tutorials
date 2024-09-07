import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';
import path = require('path');

export class AwsCdkStaticWebsiteStack extends cdk.Stack {
  private cfnOutCloudFrontUrl: cdk.CfnOutput;
  private cfnOutDistributionId: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 'ManciniWebsiteBucket', {
      bucketName: 'mancini-website',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      publicReadAccess: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const distribution = new cloudfront.Distribution(this, 'ManciniWebsiteDistribution', {
      defaultBehavior: {
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        compress: true,
        origin: new cloudfrontOrigins.S3Origin(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 403,
          responsePagePath: 'error.html',
          ttl: cdk.Duration.minutes(30)
        }
      ],
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2019
    });

    new s3Deploy.BucketDeployment(this, 'ManciniWebsiteBucketDeployment', {
      sources: [
        s3Deploy.Source.asset(path.join(__dirname, '../website/dist'))
      ],
      destinationBucket: bucket
    });

    this.cfnOutCloudFrontUrl = new cdk.CfnOutput(this, 'CfnOutCloudFrontUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'URL CloudFront'
    });

    this.cfnOutDistributionId = new cdk.CfnOutput(this, 'CfnOutDistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront Distribution Id'
    });
  }
}
