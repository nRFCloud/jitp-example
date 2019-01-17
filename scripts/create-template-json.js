const fs = require("fs");

let rawdata = fs.readFileSync("provisioning-template.js");
let template = JSON.parse(rawdata);

template.templateBody.Resources.policy.Properties.PolicyDocument = JSON.stringify(
  template.templateBody.Resources.policy.Properties.PolicyDocument
);
template.templateBody = JSON.stringify(template.templateBody);
fs.writeFileSync("provisioning-template.json", JSON.stringify(template));
