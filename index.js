const core = require('@actions/core');
const { base64encodeJSON } = require('./utils');
const { createHash } = require('crypto');
const { DefaultAzureCredential } = require('@azure/identity');
const {
  CryptographyClient,
  KeyClient,
  KnownSignatureAlgorithms
} = require('@azure/keyvault-keys');

try {
  const credential = new DefaultAzureCredential();

  const githubAppClientId = core.getInput('gh-app-client-id');
  const keyVaultName = core.getInput('key-vault-name');
  const keyName = core.getInput('key-name');
  const tokenDuration = parseInt(core.getInput('token-duration'), 10);

  const now = Math.floor(Date.now() / 1000);
  const nowWithSafetyMargin = now - 30;
  const expiration = now + tokenDuration;

  const jwtHeader = base64encodeJSON({
    alg: 'RS256',
    typ: 'JWT'
  });

  const jwtPayload = base64encodeJSON({
    iss: githubAppClientId,
    iat: nowWithSafetyMargin,
    exp: expiration
  });

  const jwtData = `${jwtHeader}.${jwtPayload}`;
  const jwtDataDigest = createHash('sha256').update(jwtData).digest();

  const serviceClient = new KeyClient(
    `https://${keyVaultName}.vault.azure.net`,
    credential
  );

  serviceClient.getKey(keyName).then(async (keyVaultKey) => {
    if (keyVaultKey?.name) {
      const cryptoClient = new CryptographyClient(keyVaultKey, credential);
      const { result: signature } = await cryptoClient.sign(KnownSignatureAlgorithms.RS256, jwtDataDigest);
      const jwtSignature = urlBase64encode(signature);
  
      const ghToken = `${jwtData}.${jwtSignature}`;
      core.setSecret(ghToken);
      core.setOutput('gh_token', ghToken);
    }
  });
} catch (error) {
  core.setFailed(error.message);
}