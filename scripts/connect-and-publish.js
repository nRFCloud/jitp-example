const AWS = require('aws-sdk');
const iotSDK = require('aws-iot-device-sdk');
const uuid = require('uuid');
const stage = process.env.STAGE || 'dev';
const tenantId = 'jitp-test-tenant';
const mqttEndpoint = process.env.MQTT_ENDPOINT;
const iot = new AWS.Iot();
const iotData = new AWS.IotData({
  endpoint: mqttEndpoint,
  region: process.env.REGION || 'us-east-1',
});
const deviceId = process.env.DEVICE_ID;
const shadowTopic = `$aws/things/${deviceId}/shadow`;
const messageTopic = `${stage}/${tenantId}/m/test/topic`;
const config = {
  keyPath: 'deviceCert.key',
  certPath: 'deviceCertAndCACert.crt',
  caPath: 'AmazonRootCA1.pem',
  // This does not have to be the Thing Id or Thing Name unless you 
  // are using a policy statement for iot:Connect (as we are), which 
  // requires the MQTT client id to match either:
  //
  // 1) the id of the device that is holding the certificate used to 
  // establish the TLS connection. This is the meaning of the Condition, 
  // below: that the ClientId of the MQTT resource connecting to AWS 
  // matches the Thing to which the certificate used for connection is 
  // attached:
  //
  // "arn:aws:iot:*:*:client/${iot:Certificate.Subject.CommonName}"
  // {
  //   "Effect": "Allow",
  //   "Action": [
  //     "iot:Connect"
  //   ],
  //   "Resource": "arn:aws:iot:*:*:client/${iot:ClientId}",
  //   "Condition": {
  //     "Bool": {
  //       "iot:Connection.Thing.IsAttached": [
  //         true
  //       ]
  //     }
  //   }
  // } 
  //  
  // 2) a value contained in the cert. This is a more terse way of 
  // requiring that the MQTT client id must match something about the 
  // certificate holder. This is what this project uses, for we store
  // the device id (ThingName) in the cert's subject CommonName (CN)
  // field. Thus we use this simpler policy statement instead:
  //
  // {
  //   "Effect": "Allow",
  //   "Action": [
  //     "iot:Connect"
  //   ],
  //   "Resource": "arn:aws:iot:*:*:client/${iot:Certificate.Subject.CommonName}"
  // } 
  // 
  // Try changing this to a value other than deviceId and you'll see that 
  // you cannot connect.
  clientId: deviceId, 
  host: mqttEndpoint,
};

console.log(`iotSDK.device config for device ${deviceId}:\n`, config);
let device = iotSDK.device(config);
device.on('connect', async () => {
  console.log('connect event fired');

  await associateDeviceWithTenant();

  device.subscribe(`${shadowTopic}/get/accepted`, (topic, payload) => {
    console.log('subscribed to', `${shadowTopic}/get/accepted`);
    console.log('publishing empty message to retrieve shadow');
    device.publish(`${shadowTopic}/get`, JSON.stringify({}));
  });

  device.subscribe(messageTopic, () => {
    console.log('subscribed to', messageTopic);
    console.log('publishing hello message');
    device.publish(
      messageTopic,
      JSON.stringify({
        device: deviceId,
        success: 'Hello from my computer-cum-IoT-device!',
        timestamp: Date.now(),
      }),
    );
  });
});

device.on('message', (topic, payload) => {
  console.log(`message received on ${topic}:`);
  console.log(JSON.parse(payload.toString()));
});

device.on('error', err => {
  console.log('error', err);
});

device.on('reconnect', () => {
  console.log('reconnect event fired');
});

device.on('disconnect', () => {
  console.log('disconnect');
});

device.on('close', () => {
  console.log('close event fired');
});

const associateDeviceWithTenant = async () => {
  // Device association only needs to happen once. You can check for an existing association in
  // various ways, but here we'll just do it by checking the thing attributes for a tenantId.
  const deviceDescription = await iot
    .describeThing({
      thingName: deviceId,
    })
    .promise();

  if (
    deviceDescription.attributes &&
    deviceDescription.attributes['tenantId']
  ) {
    console.log("device is already associated", tenantId);
    return;
  }

  console.log("setting device's tenantId attribute to", tenantId);
  await iot
    .updateThing({
      thingName: deviceId,
      attributePayload: {
        attributes: {
          tenantId: `${tenantId}`,
        },
        merge: true,
      },
    })
    .promise();

  console.log("creating the device's shadow with its initial state");
  await iotData
    .updateThingShadow({
      thingName: deviceId,
      payload: JSON.stringify({
        state: {
          reported: {
            nrfcloud_mqtt_topic_prefix: `${stage}/${tenantId}/m`,
          },
        },
      }),
    })
    .promise();

  console.log("adding the thing to the ASSOCIATED_THING_GROUP so that the updated policy granting increased permissions is attached");
  await iot
    .addThingToThingGroup({
      thingName: deviceId,
      thingGroupName: process.env.ASSOCIATED_THING_GROUP,
    })
    .promise();    
};
