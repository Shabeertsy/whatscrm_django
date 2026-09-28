"""
Meta WhatsApp Flows — RSA + AES-GCM Encryption Utilities

  1. Decrypt the AES key using your RSA private key
  2. Decrypt the flow data using AES-GCM
  3. Re-encrypt your response using a flipped IV

"""

import base64
import json
import logging
from django.conf import settings


logger = logging.getLogger(__name__)



def _load_private_key():
    """Load RSA private key from settings (PEM string from .env)."""
    from cryptography.hazmat.primitives import serialization

    pem = getattr(settings, "FLOW_PRIVATE_KEY", "").strip()
    if not pem:
        raise ValueError(
            "FLOW_PRIVATE_KEY is not set in settings/.env. "
            "Generate with: openssl genrsa -out flow_private_key.pem 2048"
        )
    # Support \\n (literal backslash-n) in env strings
    pem = pem.replace("\\n", "\n")
    return serialization.load_pem_private_key(pem.encode(), password=None)


def decrypt_flow_request(body: dict) -> tuple[dict, bytes, bytes]:
    """
    Decrypt an incoming encrypted Flow payload from Meta.
    """
    from cryptography.hazmat.primitives.asymmetric import padding
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    from cryptography.hazmat.backends import default_backend

    private_key = _load_private_key()

    encrypted_aes_key   = base64.b64decode(body["encrypted_aes_key"])
    encrypted_flow_data = base64.b64decode(body["encrypted_flow_data"])
    initial_vector      = base64.b64decode(body["initial_vector"])

    # Decrypt the AES-256 key with RSA OAEP
    aes_key = private_key.decrypt(
        encrypted_aes_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        ),
    )

    # Decrypt the flow payload with AES-128-GCM
    # The last 16 bytes of the ciphertext are the GCM authentication tag
    tag        = encrypted_flow_data[-16:]
    ciphertext = encrypted_flow_data[:-16]

    decryptor = Cipher(
        algorithms.AES(aes_key),
        modes.GCM(initial_vector, tag),
        backend=default_backend(),
    ).decryptor()

    plaintext = decryptor.update(ciphertext) + decryptor.finalize()
    return json.loads(plaintext), aes_key, initial_vector


def encrypt_flow_response(data: dict, aes_key: bytes, initial_vector: bytes) -> str:
    """
    Encrypt a response dict to send back to Meta.

    Meta requires the IV to be bit-flipped (XOR 0xFF each byte).
    Returns a base64-encoded string.
    """
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    from cryptography.hazmat.backends import default_backend

    flipped_iv = bytes(b ^ 0xFF for b in initial_vector)
    plaintext  = json.dumps(data).encode("utf-8")

    encryptor = Cipher(
        algorithms.AES(aes_key),
        modes.GCM(flipped_iv),
        backend=default_backend(),
    ).encryptor()

    ciphertext = encryptor.update(plaintext) + encryptor.finalize()
    tag = encryptor.tag

    return base64.b64encode(ciphertext + tag).decode("utf-8")
