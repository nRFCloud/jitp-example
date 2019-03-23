# Just-in-Time Provisioning (JITP) of AWS IoT Things (Devices)

This repo contains a working example of JITP. Note that this is different than JITR, which is explained in [this article](https://aws.amazon.com/blogs/iot/setting-up-just-in-time-provisioning-with-aws-iot-core/). The steps used to create the files in this repo were also based on the same article. [This slide deck](http://aws-de-media.s3.amazonaws.com/images/AWS_Summit_2018/June6/Lowflyinghawk/Device%20Provisioning%20Options%20with%20AWS%20IoT.pdf) also provides a good overview of JITR and JITP.

The example that follows focuses on the steps that begin with generating an intermediate CA (i.e., a CA cert for Nordic Semiconductor instead of using AWS's root CA), as well as the certs for a device.

It's important to realize that the JITP process merely connects a device to AWS IoT. It does not do DUA (device user association).

## To Try It Out

Install the dependencies and create the AWS resources needed to support JITP:

```
npm i
STAGE=dev
aws cloudformation create-stack --stack-name jitp --template-body file://./cloudformation.yml \
    --parameters ParameterKey=Stage,ParameterValue=$STAGE \
    --capabilities CAPABILITY_NAMED_IAM
```

This next script generates the JSON for a [provisioning template](https://docs.aws.amazon.com/iot/latest/developerguide/provision-template.html) from a more readable JSON format. We could have included the final JSON file that AWS expects, but it's hard to read and modify because it's stringified twice. The provisioning template references both the `IoTJITProvisioning` *role* (used by the entire JITP process) and the `IoTAccess` *policy* (which gets attached to each device certificate during provisioning) that are defined in [the CloudFormation template](https://github.com/nRFCloud/jitp-example/blob/master/cloudformation.yml).

Set the `JITP_ROLE_ARN` environment variable to the IotProvisioningRole value in your jitp stack's Outputs tab.

```
JITP_ROLE_ARN=YOUR_STACK_OUTPUT_VALUE STAGE=$STAGE node scripts/create-template-json.js
```

## Generate an Intermediate CA Cert and Register it with AWS IoT

The steps that follow in this section are reproduced with some modification from [this article](https://aws.amazon.com/blogs/iot/setting-up-just-in-time-provisioning-with-aws-iot-core/).

For your AWS account get a registration code from AWS IoT Core and set it to the `REGISTRATION_CODE` environment variable. This code will be used as the Common Name of the private key verification certificate:

```
aws iot get-registration-code
REGISTRATION_CODE=YOUR_GENERATED_CODE
```

When running `openssl` you'll want to provide the full path to this project on your local computer:

```
PATH_TO_PROJECT=my/path/to/this/project
CA_FILE_NAME=NordicCA

openssl genrsa -out $PATH_TO_PROJECT/$CA_FILE_NAME.key 2048
openssl req -x509 -new -nodes -key $CA_FILE_NAME.key -sha256 -days 1024 -out $CA_FILE_NAME.pem \
    -subj "/C=US/ST=Oregon/L=Portland/O=Nordic Semiconductor/OU=R&D"
openssl genrsa -out $PATH_TO_PROJECT/verificationCert.key 2048
openssl req -new -key $PATH_TO_PROJECT/verificationCert.key -out $PATH_TO_PROJECT/verificationCert.csr \
    -subj "/C=US/ST=Oregon/L=Portland/O=Nordic Semiconductor/OU=R&D/CN=$REGISTRATION_CODE"
openssl x509 -req -in $PATH_TO_PROJECT/verificationCert.csr -CA $PATH_TO_PROJECT/$CA_FILE_NAME.pem \
    -CAkey $PATH_TO_PROJECT/$CA_FILE_NAME.key -CAcreateserial -out $PATH_TO_PROJECT/verificationCert.pem -days 500 -sha256
```

You should now have 6 new files: a .key, .pem and .srl named after `CA_FILE_NAME`, as well as verificationCert.csr, verificationCert.key and verificationCert.pem.

Run the following to register the CA cert with AWS IoT:

```
aws iot register-ca-certificate --ca-certificate file://$CA_FILE_NAME.pem --verification-cert file://verificationCert.pem --set-as-active --allow-auto-registration --registration-config file://provisioning-template.json
```

If you want to see details about the CA cert, including its associated JITP template, run the following:

```
aws iot describe-ca-certificate --certificate-id YOUR_CERTIFICATE_ID_FROM_REGISTRATION
```

## Generate a Certificate for Your Device

Now it's time to generate some certs for your computer (soon to be acting as an IoT device) in order to test that it gets provisioned "just in time" on AWS IoT. Generating certs for a device could be done during the manufacturing / production process, or by a third-party that buys the nRF91 chips and uses their own CA. The certs would then be flashed onto the device before shipping.

We use the `-subj` argument to pass in values declared in the [provisioning template](https://github.com/nRFCloud/jitp-example/blob/master/provisioning-template.js). The parameters supported by AWS are [listed here](https://docs.aws.amazon.com/iot/latest/developerguide/jit-provisioning.html). 

In our case, `OU` is the value for the `ThingTypeName` parameter, `CN` is the value for the `ThingName` (device Id) parameter, and `dnQualifier` is the value for the `ThingGroupName` parameter. `WARNING`: you can only use a `ThingType` or `ThingGroup` name that is registered with AWS IoT. Otherwise, JITP will fail, and rather silently.

```
DEVICE_ID=nrf-jitp-123456789012347-123456

openssl genrsa -out $PATH_TO_PROJECT/deviceCert.key 2048
openssl req -new -key $PATH_TO_PROJECT/deviceCert.key -out $PATH_TO_PROJECT/deviceCert.csr \
    -subj "/C=US/ST=Oregon/L=Portland/O=Nordic Semiconductor/OU=nordic-jitp-demo/CN=$DEVICE_ID/dnQualifier=nordic-jitp"
openssl x509 -req -in $PATH_TO_PROJECT/deviceCert.csr -CA $PATH_TO_PROJECT/$CA_FILE_NAME.pem \
    -CAkey $PATH_TO_PROJECT/$CA_FILE_NAME.key -CAcreateserial -out $PATH_TO_PROJECT/deviceCert.crt -days 365 -sha256
cat deviceCert.crt $CA_FILE_NAME.pem > deviceCertAndCACert.crt
```

You should now have four new files: deviceCert.crt, deviceCert.csr, deviceCert.key and deviceCertAndCACert.crt.

## Connect Your Device to AWS IoT

It's time to try connecting your device to AWS IoT, which should provision it and then publish to an MQTT topic:

```
MQTT_ENDPOINT=$(aws iot describe-endpoint --endpoint-type iot:Data-ATS | grep endpointAddress | awk '{ print  $2; }' | tr -d '"');
MQTT_ENDPOINT=$MQTT_ENDPOINT DEVICE_ID=$DEVICE_ID node scripts/connect-and-publish.js
```

You should see something like the following in your terminal:

```
close event fired
reconnect event fired
connect
message $aws/things/nrf-jitp-123456789012347/shadow/update/accepted {"state":{"desired":{"stage":"dev","pairing":{"state":"initiate"}}},"metadata":{"desired":{"stage":{"timestamp":1547857567},"pairing":{"state":{"timestamp":1547857567}}}},"version":7,"timestamp":1547857567}
message nrf-jitp-123456789012347 {"success":"Hello from my computer-cum-IoT-device!"}
```

_Note_: this script uses the [ATS endpoint](https://docs.aws.amazon.com/iot/latest/developerguide/managing-device-certs.html#server-authentication) for Nordic Semiconductor's main AWS account. If you want to try this script on a different account, replace the `host` in the script with `endpointAddress` returned by this CLI command:

```
aws iot describe-endpoint --endpoint-type iot:Data-ATS
```

You should also be able to go to the [AWS IoT Manage Things](https://console.aws.amazon.com/iot/home?region=us-east-1#/thinghub) page and see your device there.

You might also be interested to know that the contents of the deviceCert.crt file you generated is now stored on AWS IoT. You can verify this by running the following, substituting `your-device-certificate-id` with your device's cert id, which you can get from your Thing's page on AWS IoT (click its Security menu item, then click the certificate):

```
aws iot describe-certificate --certificate-id <your-device-certificate-id>
```

Note that running `node scripts/connect-and-publish.js` again will not re-provision it, so the JITP process is essentially idempotent.

## Additional Resources

- [AWS Summit Slide Deck: Device Provisioning Options with AWS IoT](http://aws-de-media.s3.amazonaws.com/images/AWS_Summit_2018/June6/Lowflyinghawk/Device%20Provisioning%20Options%20with%20AWS%20IoT.pdf)
- [AWS Docs: Device Provisioning](https://docs.aws.amazon.com/iot/latest/developerguide/iot-provision.html)
- [AWS Docs: X.509 Certificates and AWS IoT](https://docs.aws.amazon.com/iot/latest/developerguide/managing-device-certs.html#server-authentication)
- [AWS Iot SDK: Cert Provisioning](https://github.com/aws/aws-iot-device-sdk-js#certificates)
- [Using the AWS IoT Device SDK for JavaScript](https://docs.aws.amazon.com/iot/latest/developerguide/iot-device-sdk-node.html)
- [AWS IoT Just In Time Provisioning Sample Scripts](https://github.com/aws-samples/aws-iot-jitp-sample-scripts)
