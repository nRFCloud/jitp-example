const iot = require("aws-iot-device-sdk");

let device = iot.device({
  keyPath: "deviceCert.key",
  certPath: "deviceCertAndCACert.crt",
  caPath: "security/AmazonRootCA1.pem",
  // This does not have to be the Thing Id or Thing Name.
  clientId: "someUniqueId",
  // NOTE: using Nordic's ATS endpoint. See https://docs.aws.amazon.com/iot/latest/developerguide/managing-device-certs.html#server-authentication.
  // To find the ATS endpoint for a different account run `aws iot describe-endpoint --endpoint-type iot:Data-ATS`
  host: "a2n7tk1kp18wix-ats.iot.us-east-1.amazonaws.com"
});

device.on("connect", function() {
  console.log("connect");

  device.subscribe("jitp_test", function(err) {
    if (!err) {
      device.publish("jitp_test", JSON.stringify({ success: "JITP works!" }));
    }
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
