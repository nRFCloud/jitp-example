module.exports = {
  template: ({ policyName, roleArn, stage }) => ({
    'templateBody': JSON.stringify({
      'Parameters': {
        'AWS::IoT::Certificate::DistinguishedNameQualifier': {
          'Type': 'String',
        },
        'AWS::IoT::Certificate::OrganizationalUnit': {
          'Type': 'String',
        },
        'AWS::IoT::Certificate::CommonName': {
          'Type': 'String',
        },
        'AWS::IoT::Certificate::Id': {
          'Type': 'String',
        },
      },
      'Resources': {
        'thing': {
          'Type': 'AWS::IoT::Thing',
          'Properties': {
            'ThingName': {
              'Ref': 'AWS::IoT::Certificate::CommonName',
            },
            'AttributePayload': {
              stage,
            },
            'ThingGroups': [{ 'Ref': 'AWS::IoT::Certificate::OrganizationalUnit' }],
          },
        },
        'certificate': {
          'Type': 'AWS::IoT::Certificate',
          'Properties': {
            'CertificateId': {
              'Ref': 'AWS::IoT::Certificate::Id',
            },
            'Status': 'ACTIVE',
          },
        },
        'policy': {
          'Type': 'AWS::IoT::Policy',
          'Properties': {
            'PolicyName': policyName,
          },
        },
      },
    }),
    'roleArn': roleArn,
  }),
};
