# Sign GitHub App token with Azure action

This action allows signing a GitHub App token using a key stored in Azure Key Vault.

## Usage

### Pre-requisites

* Azure subscription
* GitHub App
* Key Vault

Create a private key and upload it to Azure Key Vault.

### Inputs

* `gh-app-client-id` - The Client ID of the GitHub App to sign the token for.
* `key-vault-name` - The name of the Azure Key Vault resource that holds the GitHub App private key.
* `key-name` - The name of the key in the Azure Key Vault resource that holds the GitHub App private key.
* `token-duration` - The duration in seconds for which the token will be valid. Default: `300`

### Outputs

* `gh_token` - The resulting GitHub token, signed with the key stored in Azure Key Vault.

### Example workflow

```yaml
name: Sign GitHub App token with Azure

on: push

permissions:
  id-token: write
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - name: Azure login
      uses: azure/login@v2
      with:
        client-id: ${{ secrets.AZURE_CLIENT_ID }}
        tenant-id: ${{ secrets.AZURE_TENANT_ID }}
        subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

    - name: Sign GitHub App token with Azure
      id: sign_token
      uses: bcc-code/az-keyvault-sign-token@v1
      with:
        gh-app-client-id: ${{ vars.GITHUB_APP_CLIENT_ID }}
        key-vault-name: ${{ vars.AZURE_KEY_VAULT_NAME }}
        key-name: 'gh-app-pem'
    
    - name: Use the signed token
      run: |
        echo "Signed token: ${{ steps.sign_token.outputs.gh_token }}"
```

## License

The scripts and documentation in this project are released under the [Apache License 2.0](LICENSE)
