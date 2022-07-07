import CardanoUtils from '@jshear/cardano-utils';
import BlockfrostClient from './modules/blockfrost-client/index.js';
import serializationClient from './modules/serialization-client/index.js';

const defaultLogger = {
    info: console.log,
    warn: console.log,
    error: console.log
};

const nullLogger = {
    info: () => {},
    warn: () => {},
    error: () => {}
};

const CardanoNodeUtils = (function(testnet, customLog) {

    // If customLog is null, logging is disabled -- if customLog is not provided, a default logger is used
    const log = (customLog === undefined) ? defaultLogger : (customLog ? customLog : nullLogger);

    const state = {};
    state.testnet = !!testnet;
    state.cardanoUtils = CardanoUtils(state.testnet, log);
    state.blockfrostClient = null;

    function enableBlockfrost(projectId) {
        state.blockfrostClient = new BlockfrostClient(state.cardanoUtils, projectId, state.testnet);
    }

    function validateSignedMessage(message, address, payload) {
        try {
            const handler = serializationClient.getSignedMessageHandler(message);
            handler.verify(address, payload);
        } catch(err) {
            log.error('Invalid signed message', err);
            return false;
        }

        return true;
    }

    function extractBech32(address) {
        try {
            return serializationClient.addressHelper.extractBech32(address);
        } catch(err) {
            log.error(`Invalid Bech32 address (${address}):`, err.message || err);
            return null;
        }
    }

    function getStakeAddress(address) {
        try {
            const wallet = extractBech32(address);
            if (wallet.delegationPart.type !== 'stake') throw new Error('Not a valid staking wallet');
            return wallet.walletAddress;
        } catch(err) {
            log.error('Unable to determine stake address', err);
            return null;
        }
    }

    async function getNFTAssetOwner(policyId, assetName) {
        if (!state.blockfrostClient) throw new Error('BlockFrost has not been enabled');
        return state.blockfrostClient.getNFTAssetOwner(policyId, assetName).catch(err => {
            log.error(`Unable to obtain NFT asset owner for ${policyId}.${assetName}`, err);
            return null;
        });
    }

    async function getAssetOwners(policyId, assetName) {
        if (!state.blockfrostClient) throw new Error('BlockFrost has not been enabled');
        return state.blockfrostClient.getAssetOwners(policyId, assetName).catch(err => {
            log.error(`Unable to obtain asset owners for ${policyId}.${assetName}`, err);
            return null;
        });
    }

    async function getOwnedAssets(address, policyId) {
        const stakeAddr = getStakeAddress(address);
        if (!state.blockfrostClient) throw new Error('BlockFrost has not been enabled');
        return state.blockfrostClient.getOwnedAssets(stakeAddr, policyId).catch(err => {
            log.error(`Unable to obtain owned assets for ${stakeAddr}.${policyId}`, err);
            return null;
        });
    }

    async function getPolicyAssets(policyId) {
        if (!state.blockfrostClient) throw new Error('BlockFrost has not been enabled');
        return state.blockfrostClient.getPolicyAssets(policyId).catch(err => {
            log.error(`Unable to obtain policy assets for ${policyId}`, err);
            return null;
        });
    }

    async function getAssetData(policyId, assetName) {
        if (!state.blockfrostClient) throw new Error('BlockFrost has not been enabled');
        return state.blockfrostClient.getAssetData(policyId, assetName).catch(err => {
            log.error(`Unable to obtain asset data for ${policyId}.${assetName}`, err);
            return null;
        });
    }

    // Public interface
    return {
        ...state.cardanoUtils,
        serialization: {
            validateSignedMessage: validateSignedMessage,
            getStakeAddress: getStakeAddress,
            extractBech32: extractBech32
        },
        blockfrost: {
            enable: enableBlockfrost,
            getNFTAssetOwner: getNFTAssetOwner,
            getAssetOwners: getAssetOwners,
            getOwnedAssets: getOwnedAssets,
            getPolicyAssets: getPolicyAssets,
            getAssetData: getAssetData
        }
    };
});

export default (testnet, customLog) => new CardanoNodeUtils(testnet, customLog);
