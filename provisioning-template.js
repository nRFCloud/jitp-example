{
  "templateBody": {
    "Parameters": {
      "AWS::IoT::Certificate::CommonName": {
        "Type": "String"
      },
      "AWS::IoT::Certificate::Id": {
        "Type": "String"
      }
    },
    "Resources": {
      "thing": {
        "Type": "AWS::IoT::Thing",
        "Properties": {
          "ThingName": {
            "Ref": "AWS::IoT::Certificate::CommonName"
          },
          "AttributePayload": {
            "stage": "dev",
            "blocked": "0"
          }
        }
      },
      "certificate": {
        "Type": "AWS::IoT::Certificate",
        "Properties": {
          "CertificateId": {
            "Ref": "AWS::IoT::Certificate::Id"
          },
          "Status": "ACTIVE"
        }
      },
      "policy": {
        "Type": "AWS::IoT::Policy",
        "Properties": {
          "PolicyDocument": {
            "Version": "2012-10-17",
            "Statement": [
              {
                "Effect": "Allow",
                "Action": ["iot:Connect", "iot:Publish", "iot:Subscribe", "iot:Receive"],
                "Resource": ["*"]
              }
            ]
          }
        }
      }
    }
  },
  "roleArn": "arn:aws:iam::680502709288:role/JITPRole"
}
