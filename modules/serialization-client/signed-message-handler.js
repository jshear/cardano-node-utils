import { COSESign1, Label } from '../../node_modules_external/@emurgo/message-signing';
import { Address, Ed25519Signature, PublicKey, BaseAddress, StakeCredential } from '@emurgo/cardano-serialization-lib-nodejs';
import { Buffer } from 'buffer';

class SignedMessageHandler {

    constructor(signedMessage) {
        const message = COSESign1.from_bytes(Buffer.from(Buffer.from(signedMessage, 'hex'), 'hex'));
        const headermap = message.headers().protected().deserialized_headers();
        this.headers = {
            algorithmId: headermap.algorithm_id().as_int().as_i32(),
            address: Address.from_bytes(headermap.header(Label.new_text('address')).as_bytes()),
            publicKey: PublicKey.from_bytes(headermap.key_id())
        };
        this.payload = message.payload();
        this.signature = Ed25519Signature.from_bytes(message.signature());
        this.data = message.signed_data().to_bytes();
    }

    verify(address, payload) {
        if (!this._verifyPayload(payload)) throw new Error('Payload does not match');
        if (!this._verifyAddress(address)) throw new Error('Address does not match');
        if (!this.headers.publicKey.verify(this.data, this.signature)) throw new Error('Signature is invalid');
    };

    _verifyPayload(payload) {
        return Buffer.from(this.payload, 'hex').compare(Buffer.from(payload, 'hex'));
    }

    _verifyAddress(address) {
        const checkAddress = Address.from_bech32(address);
        if (this.headers.address.to_bech32() !== checkAddress.to_bech32()) return false;
        const baseAddress = BaseAddress.from_address(this.headers.address);

        // Reconstruct address
        const paymentKeyHash = this.headers.publicKey.hash();
        const stakeKeyHash = baseAddress.stake_cred().to_keyhash();
        const reconstructedAddress = BaseAddress.new(
            checkAddress.network_id(),
            StakeCredential.from_keyhash(paymentKeyHash),
            StakeCredential.from_keyhash(stakeKeyHash)
        );
        return checkAddress.to_bech32() === reconstructedAddress.to_address().to_bech32();      
    };
}

export default SignedMessageHandler;
