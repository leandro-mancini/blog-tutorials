import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import path = require('path');

export class AwsCdkS3CloudfrontRoute53Stack extends cdk.Stack {
  private cfnOutCloudFrontUrl: cdk.CfnOutput;
  private cfnOutDistributionId: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const idName = 'ManciniAwsS3CloudfrontRoute53';

    const bucket = new s3.Bucket(this, `${idName}Bucket`, {
      bucketName: 'mancinidev-aws-cdk-s3-cloudfront-route53',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      publicReadAccess: false
    });

    const hostedZone = route53.HostedZone.fromLookup(this, `${idName}HostedZone`, {
      domainName: 'mancinidev.me'
    });

    const certificate = new certificatemanager.Certificate(this, `${idName}Certificate`, {
      domainName: 'aws-cdk-s3-cloudfront-route53.mancinidev.me',
      subjectAlternativeNames: ['*.mancinidev.me'],
      validation: certificatemanager.CertificateValidation.fromDns(hostedZone),
    });

    const distribution = new cloudfront.Distribution(this, `${idName}Distribution`, {
      defaultBehavior: {
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        compress: true,
        origin: new cloudfrontOrigins.S3Origin(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responsePagePath: '/index.html',
          responseHttpStatus: 200,
        }
      ],
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      domainNames: ['aws-cdk-s3-cloudfront-route53.mancinidev.me'],
      certificate: certificate,
    });

    new route53.ARecord(this, `${idName}AliasRecord`, {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(new route53Targets.CloudFrontTarget(distribution)),
      recordName: 'aws-cdk-s3-cloudfront-route53'
    })

    new s3Deploy.BucketDeployment(this, `${idName}BucketDeployment`, {
      sources: [s3Deploy.Source.asset(path.join(__dirname, '../website/dist'))],
      destinationBucket: bucket,
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
