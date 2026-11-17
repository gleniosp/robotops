import { RemovalPolicy, aws_dynamodb as dynamodb, aws_s3 as s3, aws_iam as iam } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface StorageProps {
  readonly environment: "dev" | "production";
  readonly disposable?: boolean;
}

/** Stateful resources only; deployment and runtime adapters are separate concerns. */
export class Storage extends Construct {
  readonly table: dynamodb.Table;
  readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StorageProps) {
    super(scope, id);
    if (props.disposable && props.environment !== "dev") {
      throw new Error("Only Dev storage may be disposable");
    }
    const removalPolicy = props.disposable ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN;
    this.table = new dynamodb.Table(this, "Operational", {
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: "expiresAt",
      deletionProtection: !props.disposable,
      removalPolicy,
    });
    this.table.addGlobalSecondaryIndex({
      indexName: "WorkDue",
      partitionKey: { name: "workPK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "workSK", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.KEYS_ONLY,
    });
    this.bucket = new s3.Bucket(this, "Telemetry", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy,
    });
  }

  /** Explicit actions prevent accidental Scan grants; callers choose their operations. */
  tablePolicy(
    actions: readonly (
      | "GetItem"
      | "Query"
      | "PutItem"
      | "UpdateItem"
      | "DeleteItem"
      | "ConditionCheckItem"
    )[],
  ): iam.PolicyStatement {
    return new iam.PolicyStatement({
      actions: actions.map((action) => `dynamodb:${action}`),
      resources: [this.table.tableArn],
    });
  }

  workDuePolicy(): iam.PolicyStatement {
    return new iam.PolicyStatement({
      actions: ["dynamodb:Query"],
      resources: [`${this.table.tableArn}/index/WorkDue`],
    });
  }

  artifactPolicy(tenantId: string, action: "GetObject" | "PutObject"): iam.PolicyStatement {
    if (!/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/.test(tenantId)) throw new Error("Invalid tenant ID");
    return new iam.PolicyStatement({
      actions: [`s3:${action}`],
      resources: [this.bucket.arnForObjects(`tenants/${tenantId}/*`)],
    });
  }
}
