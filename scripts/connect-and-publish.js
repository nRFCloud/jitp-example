const iot = require("aws-iot-device-sdk");
const deviceId = process.env.DEVICE_ID;
if (!deviceId) { console.log("Please set a DeviceId env variable to the device id you used when creating the device certs."); return; }

const config = {
  keyPath: "deviceCert.key",
  certPath: "deviceCertAndCACert.crt",
  caPath: "AmazonRootCA1.pem",
  // This does not have to be the Thing Id or Thing Name.
  clientId: deviceId,
  // To find the ATS endpoint for your account run `aws iot describe-endpoint --endpoint-type iot:Data-ATS`
  host: process.env.MQTT_ENDPOINT
};
console.log(config);
let device = iot.device(config);

device.on("connect", function() {
  console.log("connect");
  const shadowUpdateTopic = `$aws/things/${deviceId}/shadow/update`;

  device.subscribe(deviceId, function(err) {
    if (!err) {
      device.publish(deviceId, JSON.stringify({ success: "Hello from my computer-cum-IoT-device!" }));
    };
  });

  // This demonstrates how to update the shadow during JITP in order to prep
  // a device for pairing with an nRFCloud.com account.
  device.subscribe(`${shadowUpdateTopic}/rejected`);
  device.subscribe(`${shadowUpdateTopic}/accepted`, function(err) {
    if (!err) {
      device.publish(shadowUpdateTopic, JSON.stringify({
        state: {
          'desired': {
              stage: 'dev',
              'pairing': {
                  'state': 'initiate'
              }
            }
          }
        })
      )
    };
  });  
});

device.on("message", function(topic, payload) {
  console.log("message", topic, payload.toString());
});

device.on("error", function(err) {
  console.log("error", err);
});

device.on("reconnect", function() {
  console.log("reconnect event fired");
});

device.on("disconnect", function() {
  console.log("disconnect");
});

device.on("close", function() {
  console.log("close event fired");
});
