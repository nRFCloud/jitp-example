module.exports = {
  template: ({ roleArn, stage, thingType, thingGroup }) => ({
    'templateBody': JSON.stringify({
      'Parameters': {
        'AWS::IoT::Certificate::DistinguishedNameQualifier': {
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
              thingType,
            },
            'ThingGroups': [thingGroup],
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
      },
    }),
    'roleArn': roleArn,
  }),
};
