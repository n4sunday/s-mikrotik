//! Trust-on-first-use certificate pinning.
//!
//! RouterOS ships with self-signed certificates, so normal CA validation would
//! always fail. Instead of disabling verification, we pin the SHA-256
//! fingerprint of the router's certificate the first time the user approves it
//! (like SSH host keys) and refuse to talk to any other certificate afterwards.
//! Handshake signatures are still verified, so an attacker can't replay the
//! router's certificate without its private key.

use std::sync::{Arc, Mutex};

use rustls::client::danger::{HandshakeSignatureValid, ServerCertVerified, ServerCertVerifier};
use rustls::crypto::{CryptoProvider, verify_tls12_signature, verify_tls13_signature};
use rustls::pki_types::{CertificateDer, ServerName, UnixTime};
use rustls::{ClientConfig, DigitallySignedStruct, Error, SignatureScheme};
use sha2::{Digest, Sha256};

/// Upper-case hex SHA-256 of a DER certificate, the same format RouterOS shows
/// in `/certificate print detail` (`fingerprint=`).
pub fn fingerprint(der: &[u8]) -> String {
    Sha256::digest(der).iter().map(|b| format!("{b:02X}")).collect()
}

pub fn normalize(fp: &str) -> String {
    fp.chars().filter(|c| c.is_ascii_hexdigit()).collect::<String>().to_ascii_uppercase()
}

#[derive(Debug)]
struct PinVerifier {
    pin: Option<String>,
    seen: Arc<Mutex<Option<String>>>,
    provider: Arc<CryptoProvider>,
}

impl ServerCertVerifier for PinVerifier {
    fn verify_server_cert(
        &self,
        end_entity: &CertificateDer<'_>,
        _intermediates: &[CertificateDer<'_>],
        _server_name: &ServerName<'_>,
        _ocsp_response: &[u8],
        _now: UnixTime,
    ) -> Result<ServerCertVerified, Error> {
        let fp = fingerprint(end_entity);
        *self.seen.lock().unwrap() = Some(fp.clone());
        match &self.pin {
            Some(pin) if *pin == fp => Ok(ServerCertVerified::assertion()),
            _ => Err(Error::General("router certificate is not trusted".into())),
        }
    }

    fn verify_tls12_signature(
        &self,
        message: &[u8],
        cert: &CertificateDer<'_>,
        dss: &DigitallySignedStruct,
    ) -> Result<HandshakeSignatureValid, Error> {
        verify_tls12_signature(message, cert, dss, &self.provider.signature_verification_algorithms)
    }

    fn verify_tls13_signature(
        &self,
        message: &[u8],
        cert: &CertificateDer<'_>,
        dss: &DigitallySignedStruct,
    ) -> Result<HandshakeSignatureValid, Error> {
        verify_tls13_signature(message, cert, dss, &self.provider.signature_verification_algorithms)
    }

    fn supported_verify_schemes(&self) -> Vec<SignatureScheme> {
        self.provider.signature_verification_algorithms.supported_schemes()
    }
}

/// Builds a TLS config that only accepts the pinned certificate. `seen`
/// receives the fingerprint the server actually presented, so the UI can ask
/// the user to trust it.
pub fn client_config(pin: Option<&str>, seen: Arc<Mutex<Option<String>>>) -> Result<ClientConfig, String> {
    let provider = Arc::new(rustls::crypto::aws_lc_rs::default_provider());
    let verifier = PinVerifier { pin: pin.map(normalize), seen, provider: provider.clone() };
    let config = ClientConfig::builder_with_provider(provider)
        .with_safe_default_protocol_versions()
        .map_err(|e| e.to_string())?
        .dangerous()
        .with_custom_certificate_verifier(Arc::new(verifier))
        .with_no_client_auth();
    Ok(config)
}
