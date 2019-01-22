const iot = require("aws-iot-device-sdk");
const deviceId = process.env.DeviceId;
if (!deviceId) { console.log("Please set a DeviceId env variable to the device id you used when creating the device certs."); return; }

let device = iot.device({
  keyPath: "deviceCert.key",
  certPath: "deviceCertAndCACert.crt",
  caPath: "security/AmazonRootCA1.pem",
  // This does not have to be the Thing Id or Thing Name.
  clientId: deviceId,
  // NOTE: using Nordic's ATS endpoint. See https://docs.aws.amazon.com/iot/latest/developerguide/managing-device-certs.html#server-authentication.
  // To find the ATS endpoint for a different account run `aws iot describe-endpoint --endpoint-type iot:Data-ATS`
  host: "a2n7tk1kp18wix-ats.iot.us-east-1.amazonaws.com"
});

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
