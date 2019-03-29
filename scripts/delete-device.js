const AWS = require('aws-sdk');
const iot = new AWS.Iot();
const tenantId = 'jitp-test-tenant';
const deviceId = 'nrf-jitp-123456789012347-123456';

(async () => {
  const res = await iot
    .listThingPrincipals({
      thingName: deviceId,
    })
    .promise();

  if (res.principals) {
    for (const certARN of res.principals) {
      const certificateId = certARN.split('/')[1];
      const res = await iot.listAttachedPolicies({ target: certARN }).promise();
      if (res.policies) {
        for (const p of res.policies) {
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
