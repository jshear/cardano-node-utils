import fetch from 'node-fetch';

class BlockfrostClient {

    constructor(cardanoUtils, projectId, testnet) {
        if (!cardanoUtils) throw new Error('Utils not available, unexpected error');
        if (!projectId) throw new Error('Project ID is required for BlockFrost interaction');
        this.cardanoUtils = cardanoUtils;
        this.projectId = projectId;
        this.testnet = testnet;
        this.baseUrl = testnet ? 'https://cardano-testnet.blockfrost.io/api/v0' : 'https://cardano-mainnet.blockfrost.io/api/v0';
    }

    async getNFTAssetOwner(policyId, assetName) {
        return fetch(this._getAssetOwnersEndpoint(policyId, assetName, 1), {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'project_id': this.projectId
                }
            }).then(response => {
                if (!response.ok) throw new Error('Asset ownership data is unavailable for ' + policyId + '-' + assetName);

                return response.json();
            })
            .then(jsonData => {
                if (!jsonData || !Array.isArray(jsonData) || jsonData.length !== 1)
                    throw new Error('Invalid asset ownership data for ' + policyId + '-' + assetName);

                return jsonData[0].address;
            });
    }

    async getAssetOwners(policyId, assetName) {
        const owners = await this._getAllPages(this._getAssetOwnersEndpoint(policyId, assetName), {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'project_id': this.projectId
            }
        });

        return owners.sort((a, b) => {
            return parseInt(b.quantity) - parseInt(a.quantity);
        }).reduce((acc, ownerEntry) => {
            if (acc[ownerEntry.address]) throw new Error('Duplicate owner entry for ' + ownerEntry.address);
            acc[ownerEntry.address] = parseInt(ownerEntry.quantity);
            return acc;
        }, {});
    }

    async getOwnedAssets(stakeAddr, policyIds) {
        const policyProvided = !!policyIds;
        const assets = await this._getAllPages(this._getOwnedAssetsEndpoint(stakeAddr));
        return assets.filter(asset => {
            if (!policyProvided) return true;
            if (!Array.isArray(policyIds)) return asset.unit.includes(policyIds);
            for (const policyId of policyIds) {
                if (asset.unit.includes(policyId)) return true;
            }
            return false;
        }).reduce((acc, asset) => {
            const policyId = asset.unit.substring(0, 56);
            // Get asset name
            const assetName = this.cardanoUtils.core.stringFromHex(asset.unit.replace(policyId, ''));
            const quantity = parseFloat(asset.quantity);
            if (policyProvided && !Array.isArray(policyIds)) {
                acc[assetName] = quantity;
                return acc;
            }
            // If no policy was specified or multiple were specified, map by policy ID => Asset name
            if (!acc.hasOwnProperty(policyId)) acc[policyId] = {};
            acc[policyId][assetName] = quantity;
            return acc;
        }, {});
    }

    async getPolicyAssets(policyId) {
        const assets = await this._getAllPages(this._getAssetsForPolicyEndpoint(policyId));

        // There is a race condition between pages -- make sure there are no repeats
        const assetFingerprints = {};

        return assets.map(asset => {
            if (assetFingerprints[asset.asset]) throw new Error('Duplicate asset entry for ' + asset.asset);
            assetFingerprints[asset.asset] = true;
            return {
                name: this.cardanoUtils.core.stringFromHex(asset.asset.substr(policyId.length)),
                asset: asset.asset,
                quantity: asset.quantity
            };
        });
    }

    async getAssetData(policyId, assetName) {
        return await fetch(this._getAssetDataEndpoint(policyId, assetName), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'project_id': this.projectId
            }
        }).then(response => {
            if (!response.ok) throw new Error('Asset data is unavailable for ' + policyId + '.' + assetName);

            return response.json();
        }).then(asset => {
            const metadata = asset.onchain_metadata;
            const hasIpfsImage = metadata.image && metadata.image.startsWith('ipfs://');
            const standardAsset = {
                id: asset.fingerprint,
                policyId: asset.policy_id,
                assetName: this.cardanoUtils.core.stringFromHex(asset.asset_name),
                assetQuantity: parseInt(asset.quantity)
            };
            if (hasIpfsImage) standardAsset.imageUrl = 'https://ipfs.blockfrost.dev/ipfs/' + metadata.image.substr(7);
            standardAsset.metadata = metadata;
            return standardAsset;
        });
    }

    async _getAllPages(endpoint) {
        const vals = [];
        // Bootstrap with dummy entry
        let pageVals = [{}];
        let page = 0;
        while (pageVals.length !== 0) {
            ++page;
            pageVals = await fetch(endpoint + '?page=' + page + '&count=100&order=desc', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'project_id': this.projectId
                }
            }).then(response => {
                if (!response.ok) throw new Error('Blockfrost endpoint rejected request to ' + endpoint);

                return response.json();
            }).then(responseVals => {
                if (!Array.isArray(responseVals)) throw new Error('Page values requested for non-array response: ' + endpoint);
                return responseVals;
            });
            vals.push(...pageVals);
        }
        return vals;
    }

    _getAssetOwnersEndpoint(policyId, assetName) {
        return this.baseUrl + '/assets/' + policyId + this.cardanoUtils.core.stringToHex(assetName) + '/addresses';
    }

    _getOwnedAssetsEndpoint(stakeAddr) {
        return this.baseUrl + '/accounts/' + stakeAddr + '/addresses/assets';
    }

    _getAssetsForPolicyEndpoint(policyId, page) {
        return this.baseUrl + '/assets/policy/' + policyId;
    }

    _getAssetDataEndpoint(policyId, assetName) {
        return this.baseUrl + '/assets/' + policyId + this.cardanoUtils.core.stringToHex(assetName);
    }

    _getAddressDataEndpoint(address) {
        return this.baseUrl + '/addresses/' + address;
    }
}

export default BlockfrostClient;
