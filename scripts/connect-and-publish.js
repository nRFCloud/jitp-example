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
const deviceId = 'nrf-jitp-123456789012347-123456';
const shadowTopic = `$aws/things/${deviceId}/shadow`;
const messageTopic = `${stage}/${tenantId}/m/test/topic`;
const config = {
  keyPath: 'deviceCert.key',
  certPath: 'deviceCertAndCACert.crt',
  caPath: 'AmazonRootCA1.pem',
  // This does not have to be the Thing Id or Thing Name. It should just be a unique identifier.
  clientId: uuid(),
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
            pairing: {
              state: 'paired',
            },
          },
        },
      }),
    })
    .promise();

  const policyName = `dta-${uuid()}`;
  // See https://docs.aws.amazon.com/iot/latest/developerguide/pub-sub-policy.html and
  // https://docs.aws.amazon.com/iot/latest/developerguide/device-shadow-mqtt.html#get-accepted-pub-sub-topic
  // 
  // Note that attempting to subscribe (in the code above) to a topic that is not properly set in the iot:Subscribe
  // Resource section below will prevent the device from receiving *any* messages because an unauthorized 
  // subscription attempt causes the MQTT client to disconnect and attempt reconnect:
  // https://github.com/aws/aws-iot-device-sdk-js/issues/191
  const policy = {
    policyName,
    policyDocument: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: ['iot:UpdateThingShadow'],
          Resource: [`arn:aws:iot:*:*:$aws/things/${deviceId}/shadow/update`],
        },
        {
          Effect: 'Allow',
          Action: ['iot:Subscribe'],
          Resource: [
            `arn:aws:iot:*:*:topicfilter/$aws/things/${deviceId}/shadow/get/accepted`,
            `arn:aws:iot:*:*:topicfilter/$aws/things/${deviceId}/shadow/update/accepted`,
            `arn:aws:iot:*:*:topicfilter/$aws/things/${deviceId}/shadow/update/delta`,
            `arn:aws:iot:*:*:topicfilter/${stage}/${tenantId}/m/*`,
          ],
        },
        {
          Effect: 'Allow',
          Action: ['iot:Publish'],
          Resource: [
            `arn:aws:iot:*:*:topic/$aws/things/${deviceId}/shadow/get`,
            `arn:aws:iot:*:*:topic/$aws/things/${deviceId}/shadow/update`,
            `arn:aws:iot:*:*:topic/${stage}/${tenantId}/m/*`,
          ],
        },
        {
          Effect: 'Allow',
          Action: ['iot:Receive'],
          Resource: [
            `arn:aws:iot:*:*:topic/$aws/things/${deviceId}/shadow/get/accepted`,
            `arn:aws:iot:*:*:topic/$aws/things/${deviceId}/shadow/update/accepted`,
            `arn:aws:iot:*:*:topic/$aws/things/${deviceId}/shadow/update/delta`,
            `arn:aws:iot:*:*:topic/${stage}/${tenantId}/m/*`,
          ],
        },
      ],
    }),
  };

  await iot.createPolicy(policy).promise();

  const res = await iot
    .listThingPrincipals({
      thingName: deviceId,
    })
    .promise();

  console.log('attaching new policy to device cert', policy);
  await iot
    .attachPolicy({
      policyName,
      target: res.principals[0],
    })
    .promise();
};
