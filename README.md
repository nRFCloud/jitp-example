# Just-in-Time Provisioning (JITP) of AWS IoT Things (Devices)

This repo contains a working example of JITP. Note that this is different than JITR, which is explained in [this article](https://aws.amazon.com/blogs/iot/setting-up-just-in-time-provisioning-with-aws-iot-core/). The steps used to create the files in this repo were also based on the same article.

The example that follows focuses on the steps that begin with generating an intermediate CA (i.e., a CA cert for Nordic Semiconductor instead of using AWS's root CA), as well as the certs for a device.

If you want to try all this out on your own AWS account it's probably best that you work through the entire [aforementioned article](https://aws.amazon.com/blogs/iot/setting-up-just-in-time-provisioning-with-aws-iot-core/) so that you set up the required IAM role and other items.

It's important to realize that the JITP process merely connects a device to AWS IoT. It does not associate a device with a tenant or user, nor does it assign a ThingType or ThingGroup, all of which can be done during the downstream device association process.

## To Try It Out

```
npm i
node scripts/create-template-json.js
```

This script generates the JSON for a [provisioning template](https://docs.aws.amazon.com/iot/latest/developerguide/provision-template.html) from a more readable JSON format. I could have included the final JSON file that AWS expects, but it's hard to read and modify because it's stringified twice.

Now run:

```
aws iot register-ca-certificate --ca-certificate file://security/nordicRootCA.pem --verification-cert file://security/verificationCert.pem --set-as-active --allow-auto-registration --registration-config file://provisioning-template.json
```

There's a good chance you will get a `ResourceAlreadyExistsException` because the CA already exists. That's fine. At least the above AWS CLI command shows you how it's done.

If you want to see details about the CA cert, including its associated JITP template, run the following (substitute your CA cert id if different):

```
aws iot describe-ca-certificate --certificate-id 08e2b95c05656320767287f69ce12b48b7b5043f85d1c5fa6b8736e4190a7c5e
```

Now it's time to generate some certs for your new device in order to test that it gets provisioned "just in time" on AWS IoT. Generating certs for a device could be done during the manufacturing / production process, or by a third-party that buys the nRF91 chips and uses their own CA. The certs would then be flashed onto the device before shipping.

Here's how it's done using openssl from your terminal:

```
openssl genrsa -out deviceCert.key 2048
openssl req -new -key deviceCert.key -out deviceCert.csr
```

When prompted type (in this order): US, Oregon, Portland, Nordic Semiconductor, R&D and then a device id of your choosing (must be unique in our AWS IoT fleet), e.g., `nrf-jitp-123456789012347` (expect an error if you use that one). This value will be used as the `ThingName` during provisioning.

```
openssl x509 -req -in deviceCert.csr -CA security/NordicRootCA.pem -CAkey security/NordicRootCA.key -CAcreateserial -out deviceCert.crt -days 365 -sha256
cat deviceCert.crt security/nordicRootCA.pem > deviceCertAndCACert.crt
```

The required device certs are now ready. It's time to try connecting your device to AWS IoT, which should provision it and then publish to an MQTT topic:

```
node scripts/connect-and-publish.js
```

You should see the following in your terminal:

```
close event fired
reconnect event fired
connect
message jitp_test {"success":"JITP works!"}
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

### External

- https://docs.aws.amazon.com/iot/latest/developerguide/iot-provision.html
- https://docs.aws.amazon.com/iot/latest/developerguide/managing-device-certs.html#server-authentication
- https://github.com/aws/aws-iot-device-sdk-js#certificates
- https://docs.aws.amazon.com/iot/latest/developerguide/iot-device-sdk-node.html
- https://github.com/aws-samples/aws-iot-jitp-sample-scripts

### Internal

- https://projecttools.nordicsemi.no/confluence/display/IRIS/JITR+research (Note: this is JITR research, not JITP)
- https://projecttools.nordicsemi.no/confluence/display/IRIS/Certificate+Provisioning+Server+Requirements
- https://projecttools.nordicsemi.no/confluence/display/IRIS/Credential+Server?src=contextnavpagetreemode
