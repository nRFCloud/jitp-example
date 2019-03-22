{
  "templateBody": {
    "Parameters": {
      "AWS::IoT::Certificate::DistinguishedNameQualifier": {
        "Type": "String"
      },
      "AWS::IoT::Certificate::OrganizationalUnit": {
        "Type": "String"
      },
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
          "ThingTypeName": {
            "Ref": "AWS::IoT::Certificate::OrganizationalUnit"
          },
          "ThingGroups": [{ "Ref": "AWS::IoT::Certificate::DistinguishedNameQualifier" }]
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
          "PolicyName": "IoTAccess"
        }
      }
    }
  },
  "roleArn": "YOUR_ROLE_ARN"
}
