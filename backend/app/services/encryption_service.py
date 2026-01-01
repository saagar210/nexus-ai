"""Encryption service for data at rest"""
import os
import base64
import hashlib
import secrets
from pathlib import Path
from typing import Optional, Tuple
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from ..core.config import settings


class EncryptionService:
    """Service for encrypting and decrypting data at rest"""

    def __init__(self):
        self._key: Optional[bytes] = None
        self._fernet: Optional[Fernet] = None
        self._key_file = settings.DATA_DIR / ".encryption_key"
        self._salt_file = settings.DATA_DIR / ".encryption_salt"

    def _derive_key(self, password: str, salt: bytes) -> bytes:
        """Derive encryption key from password using PBKDF2"""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=480000,  # OWASP recommended minimum
        )
        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        return key

    def initialize(self, password: Optional[str] = None) -> bool:
        """Initialize encryption with password or existing key"""
        try:
            if self._key_file.exists() and self._salt_file.exists():
                # Load existing key
                if password:
                    salt = self._salt_file.read_bytes()
                    self._key = self._derive_key(password, salt)
                else:
                    # Use stored key (for development/auto-start)
                    self._key = self._key_file.read_bytes()
                self._fernet = Fernet(self._key)
                return True
            elif password:
                # Create new key
                salt = secrets.token_bytes(16)
                self._salt_file.write_bytes(salt)
                self._key = self._derive_key(password, salt)
                self._key_file.write_bytes(self._key)
                # Secure file permissions
                os.chmod(self._key_file, 0o600)
                os.chmod(self._salt_file, 0o600)
                self._fernet = Fernet(self._key)
                return True
            else:
                # Generate random key for first run (no password)
                self._key = Fernet.generate_key()
                self._key_file.write_bytes(self._key)
                salt = secrets.token_bytes(16)
                self._salt_file.write_bytes(salt)
                os.chmod(self._key_file, 0o600)
                os.chmod(self._salt_file, 0o600)
                self._fernet = Fernet(self._key)
                return True
        except Exception as e:
            print(f"Encryption initialization failed: {e}")
            return False

    def is_initialized(self) -> bool:
        """Check if encryption is initialized"""
        return self._fernet is not None

    def encrypt(self, data: str) -> str:
        """Encrypt a string and return base64 encoded result"""
        if not self._fernet:
            self.initialize()
        if not self._fernet:
            raise RuntimeError("Encryption not initialized")

        encrypted = self._fernet.encrypt(data.encode())
        return base64.urlsafe_b64encode(encrypted).decode()

    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt base64 encoded encrypted string"""
        if not self._fernet:
            self.initialize()
        if not self._fernet:
            raise RuntimeError("Encryption not initialized")

        try:
            encrypted = base64.urlsafe_b64decode(encrypted_data.encode())
            decrypted = self._fernet.decrypt(encrypted)
            return decrypted.decode()
        except Exception as e:
            raise ValueError(f"Decryption failed: {e}")

    def encrypt_bytes(self, data: bytes) -> bytes:
        """Encrypt bytes"""
        if not self._fernet:
            self.initialize()
        if not self._fernet:
            raise RuntimeError("Encryption not initialized")

        return self._fernet.encrypt(data)

    def decrypt_bytes(self, encrypted_data: bytes) -> bytes:
        """Decrypt bytes"""
        if not self._fernet:
            self.initialize()
        if not self._fernet:
            raise RuntimeError("Encryption not initialized")

        return self._fernet.decrypt(encrypted_data)

    def encrypt_file(self, input_path: Path, output_path: Optional[Path] = None) -> Path:
        """Encrypt a file"""
        if not self._fernet:
            self.initialize()
        if not self._fernet:
            raise RuntimeError("Encryption not initialized")

        output_path = output_path or input_path.with_suffix(input_path.suffix + ".encrypted")

        data = input_path.read_bytes()
        encrypted = self._fernet.encrypt(data)
        output_path.write_bytes(encrypted)

        return output_path

    def decrypt_file(self, input_path: Path, output_path: Optional[Path] = None) -> Path:
        """Decrypt a file"""
        if not self._fernet:
            self.initialize()
        if not self._fernet:
            raise RuntimeError("Encryption not initialized")

        suffix = input_path.suffix
        if suffix == ".encrypted":
            output_path = output_path or input_path.with_suffix("")
        else:
            output_path = output_path or input_path.with_name(f"decrypted_{input_path.name}")

        encrypted = input_path.read_bytes()
        decrypted = self._fernet.decrypt(encrypted)
        output_path.write_bytes(decrypted)

        return output_path

    def hash_data(self, data: str) -> str:
        """Create a secure hash of data"""
        return hashlib.sha256(data.encode()).hexdigest()

    def generate_token(self, length: int = 32) -> str:
        """Generate a secure random token"""
        return secrets.token_urlsafe(length)

    def change_password(self, old_password: str, new_password: str) -> bool:
        """Change the encryption password"""
        try:
            if not self._salt_file.exists():
                return False

            salt = self._salt_file.read_bytes()
            old_key = self._derive_key(old_password, salt)

            # Verify old password
            if self._key_file.exists():
                stored_key = self._key_file.read_bytes()
                if old_key != stored_key:
                    return False

            # Generate new salt and key
            new_salt = secrets.token_bytes(16)
            new_key = self._derive_key(new_password, new_salt)

            # Update files
            self._salt_file.write_bytes(new_salt)
            self._key_file.write_bytes(new_key)

            self._key = new_key
            self._fernet = Fernet(self._key)

            return True
        except Exception as e:
            print(f"Password change failed: {e}")
            return False


# Singleton instance
encryption_service = EncryptionService()
