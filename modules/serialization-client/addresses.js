import { Address, Ed25519Signature, PublicKey, BaseAddress, RewardAddress, StakeCredential } from '@emurgo/cardano-serialization-lib-nodejs';
import { Buffer } from 'buffer';

class AddressHelper {

    _getStakeAddress(address, testnet) {
        const baseAddr = BaseAddress.from_address(address);

        // Extract stake credential               
        const stakeCred = baseAddr.stake_cred();

        // Build reward address (add 0xe1 prefix to 28 last bytes of stake credential one)
        let rewardAddrBytes = new Uint8Array(29);
        rewardAddrBytes.set(testnet ? [0xe0] : [0xe1], 0);
        rewardAddrBytes.set(stakeCred.to_bytes().slice(4, 32), 1);
        const rewardAddr = RewardAddress.from_address(Address.from_bytes(rewardAddrBytes));

        const stakeAddr = rewardAddr.to_address().to_bech32();
        return stakeAddr;
    }

    extractBech32(address) {
        const addr = Address.from_bech32(address);
        if (!addr) throw new Error('Invalid Bech32 address');
        const addrBytes = addr.to_bytes();

        // Byron addresses start with 1000
        if ((addrBytes[0] >> 4) === 0x08) {
            return {
                network: 'unknown', // TODO
                era: 'byron',
                walletAddress: address,
                paymentPart: { type: null },
                delegationPart: { type: null }
            };
        }

        const network = ((addrBytes[0] & 0x01) === 0x01) ? 'mainnet' : 'testnet';
        const headerType = (addrBytes[0] >> 4);

        let paymentPart = { type: null };
        let delegationPart = { type: null };
        // Stake address if applicable, otherwise provided address
        let walletAddress = address;
        if (headerType === 0x00) {
            paymentPart = { type: 'payment' };
            delegationPart = { type: 'stake' };
            walletAddress = this._getStakeAddress(addr, network === 'testnet');
        } else if (headerType === 0x01) {
            paymentPart = { type: 'script' };
            delegationPart = { type: 'stake' };
            walletAddress = this._getStakeAddress(addr, network === 'testnet');
        } else if (headerType === 0x02) {
            paymentPart = { type: 'payment' };
            delegationPart = { type: 'script' };
        } else if (headerType === 0x03) {
            paymentPart = { type: 'script' };
            delegationPart = { type: 'script' };
        } else if (headerType === 0x04) {
            paymentPart = { type: 'payment' };
            delegationPart = { type: 'pointer' };
        } else if (headerType === 0x05) {
            paymentPart = { type: 'script' };
            delegationPart = { type: 'pointer' };
        } else if (headerType === 0x06) {
            paymentPart = { type: 'payment' };
            delegationPart = { type: null };
        } else if (headerType === 0x07) {
            paymentPart = { type: 'script' };
            delegationPart = { type: null };
        } else if (headerType === 0x0e) {
            paymentPart = { type: null };
            delegationPart = { type: 'stake' };
        } else if (headerType === 0x0f) {
            paymentPart = { type: null };
            delegationPart = { type: 'script' };
        } else {
            throw new Error('Unknown address type');
        }

        return {
            network: network,
            era: 'shelley',
            walletAddress: walletAddress,
            paymentPart: paymentPart,
            delegationPart: delegationPart
        }
    }
};

// Stateless
export default new AddressHelper();



