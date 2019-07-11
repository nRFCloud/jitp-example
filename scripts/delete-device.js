const AWS = require('aws-sdk');
const iot = new AWS.Iot();
const deviceId = process.env.DEVICE_ID;

(async () => {
  const { principals } = await iot
    .listThingPrincipals({
      thingName: deviceId,
    })
    .promise();

  if (principals) {
    for (const certARN of res.principals) {
      const certificateId = certARN.split('/')[1];
      const { policies } = await iot.listAttachedPolicies({ target: certARN }).promise();
      if (policies) {
        for (const p of policies) {
          const policyName = p.policyName || '';
          await iot.detachPolicy({ policyName, target: certARN }).promise();
        }
        await iot
          .detachThingPrincipal({ thingName: deviceId, principal: certARN })
          .promise();
        await iot
          .updateCertificate({ certificateId, newStatus: 'INACTIVE' })
          .promise();
        await iot.deleteCertificate({ certificateId }).promise();
      }
    }

    await iot.deleteThing({ thingName: deviceId }).promise();
  }
})();
