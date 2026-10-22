//! Thin proxy between the UI and the RouterOS v7 REST API (`/rest/...`).
//!
//! Requests go through Rust instead of the webview so that we are not subject
//! to CORS, credentials never live in JavaScript-accessible storage, and the
//! router's self-signed certificate can be pinned (see `pinning`).

mod pinning;

use std::sync::{Arc, Mutex};
use std::time::Duration;

use reqwest::{Client, Method, redirect};
use serde::Deserialize;
use serde_json::Value;
use tauri_plugin_dialog::DialogExt;
use tokio::sync::RwLock;

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionConfig {
    pub host: String,
    pub port: Option<u16>,
    pub username: String,
    pub password: String,
    /// Use `https` (www-ssl service). Falls back to `http` (www service) when false.
    pub https: bool,
    /// SHA-256 fingerprint of the router certificate the user trusted.
    pub fingerprint: Option<String>,
}

/// Debug without the password, so it can't end up in logs.
impl std::fmt::Debug for ConnectionConfig {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("ConnectionConfig")
            .field("host", &self.host)
            .field("port", &self.port)
            .field("username", &self.username)
            .field("https", &self.https)
            .finish_non_exhaustive()
    }
}

struct Session {
    config: ConnectionConfig,
    client: Client,
}

impl Session {
    fn base_url(&self) -> String {
        let scheme = if self.config.https { "https" } else { "http" };
        match self.config.port {
            Some(port) => format!("{scheme}://{}:{port}/rest", self.config.host),
            None => format!("{scheme}://{}/rest", self.config.host),
        }
    }
}

#[derive(Default)]
struct AppState {
    session: RwLock<Option<Session>>,
}

/// Host must be a bare hostname or IP, so it can't smuggle a different
/// authority (`evil@router`), a path or a query into the URL.
fn validate_host(host: &str) -> Result<String, String> {
    let host = host.trim();
    let ok = !host.is_empty()
        && host.len() <= 253
        && host.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | ':' | '[' | ']'));
    if ok { Ok(host.to_string()) } else { Err("Invalid router address".into()) }
}

/// Only plain RouterOS menu paths, e.g. `ip/firewall/filter/*1A`.
fn validate_path(path: &str) -> Result<&str, String> {
    let path = path.trim_start_matches('/');
    let ok = !path.is_empty()
        && !path.contains("..")
        && path.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '/' | '-' | '_' | '.' | '*'));
    if ok { Ok(path) } else { Err(format!("Invalid path: {path}")) }
}

fn validate_method(method: &str) -> Result<Method, String> {
    match method.to_ascii_uppercase().as_str() {
        "GET" => Ok(Method::GET),
        "PUT" => Ok(Method::PUT),
        "PATCH" => Ok(Method::PATCH),
        "DELETE" => Ok(Method::DELETE),
        "POST" => Ok(Method::POST),
        other => Err(format!("Method not allowed: {other}")),
    }
}

fn build_client(config: &ConnectionConfig, seen: Arc<Mutex<Option<String>>>) -> Result<Client, String> {
    let mut builder = Client::builder()
        .timeout(Duration::from_secs(15))
        .connect_timeout(Duration::from_secs(5))
        // Never follow redirects with credentials attached.
        .redirect(redirect::Policy::none());
    if config.https {
        let tls = pinning::client_config(config.fingerprint.as_deref(), seen)?;
        builder = builder.tls_backend_preconfigured(tls);
    }
    builder.build().map_err(|e| e.to_string())
}

async fn send(session: &Session, method: Method, path: &str, body: Option<Value>) -> Result<Value, String> {
    let url = format!("{}/{}", session.base_url(), validate_path(path)?);

    let mut req = session
        .client
        .request(method, &url)
        .basic_auth(&session.config.username, Some(&session.config.password));
    if let Some(body) = body {
        req = req.json(&body);
    }

    let res = req.send().await.map_err(|e| {
        if e.is_timeout() {
            "Request timed out".to_string()
        } else if e.is_connect() {
            "Unable to reach router".to_string()
        } else {
            e.to_string()
        }
    })?;

    let status = res.status();
    if status.is_redirection() {
        return Err(format!("Unexpected redirect (HTTP {})", status.as_u16()));
    }
    let text = res.text().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        // RouterOS returns `{"error":400,"message":"Bad Request","detail":"..."}`
        if let Ok(err) = serde_json::from_str::<Value>(&text) {
            let message = err.get("message").and_then(Value::as_str).unwrap_or("Error");
            let detail = err.get("detail").and_then(Value::as_str).unwrap_or("");
            return Err(if detail.is_empty() {
                format!("{} {}", status.as_u16(), message)
            } else {
                format!("{message}: {detail}")
            });
        }
        return Err(format!("HTTP {}", status.as_u16()));
    }

    if text.trim().is_empty() {
        return Ok(Value::Null);
    }
    serde_json::from_str(&text).map_err(|e| format!("Invalid response: {e}"))
}

/// Validate credentials against the router and keep the session if they work.
///
/// Over HTTPS, an unknown certificate fails with `CERT_UNTRUSTED:<fingerprint>`
/// and a changed one with `CERT_CHANGED:<fingerprint>`, so the UI can ask the
/// user before retrying with the fingerprint pinned.
#[tauri::command]
async fn ros_connect(state: tauri::State<'_, AppState>, mut config: ConnectionConfig) -> Result<Value, String> {
    config.host = validate_host(&config.host)?;
    let seen = Arc::new(Mutex::new(None));
    let session = Session { client: build_client(&config, seen.clone())?, config };

    let resource = match send(&session, Method::GET, "system/resource", None).await {
        Ok(v) => v,
        Err(e) => {
            let presented = seen.lock().unwrap().clone();
            let pinned = session.config.fingerprint.as_deref().map(pinning::normalize);
            return Err(match (presented, pinned) {
                (Some(fp), None) => format!("CERT_UNTRUSTED:{fp}"),
                (Some(fp), Some(pin)) if fp != pin => format!("CERT_CHANGED:{fp}"),
                _ => e,
            });
        }
    };
    *state.session.write().await = Some(session);
    Ok(resource)
}

#[tauri::command]
async fn ros_disconnect(state: tauri::State<'_, AppState>) -> Result<(), String> {
    *state.session.write().await = None;
    Ok(())
}

/// Generic REST call. `method` is one of GET, PUT (create), PATCH (update),
/// DELETE (remove) or POST (run a console command).
#[tauri::command]
async fn ros_request(
    state: tauri::State<'_, AppState>,
    method: String,
    path: String,
    body: Option<Value>,
) -> Result<Value, String> {
    let method = validate_method(&method)?;
    let guard = state.session.read().await;
    let session = guard.as_ref().ok_or("Not connected")?;
    send(session, method, &path, body).await
}

/// Generate a WireGuard key pair locally so the client's private key never
/// has to be stored on the router.
#[tauri::command]
fn wg_generate_keypair() -> Result<(String, String), String> {
    use base64::{Engine, engine::general_purpose::STANDARD};

    let mut secret = [0u8; 32];
    getrandom::getrandom(&mut secret).map_err(|e| e.to_string())?;
    // Clamp as described in RFC 7748.
    secret[0] &= 248;
    secret[31] &= 127;
    secret[31] |= 64;
    let public = x25519_dalek::x25519(secret, x25519_dalek::X25519_BASEPOINT_BYTES);
    Ok((STANDARD.encode(secret), STANDARD.encode(public)))
}

/// Save text (config exports, WireGuard client configs) to a file. The path
/// always comes from a native save dialog shown here, never from the webview,
/// so web content can't write to arbitrary locations.
#[tauri::command]
async fn save_text_file(app: tauri::AppHandle, default_name: String, contents: String) -> Result<bool, String> {
    // Keep only a plain file name as the suggestion.
    let name: String = default_name
        .rsplit(['/', '\\'])
        .next()
        .unwrap_or("export.txt")
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_'))
        .collect();

    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog().file().set_file_name(&name).save_file(move |path| {
        let _ = tx.send(path);
    });
    let Some(path) = rx.await.map_err(|e| e.to_string())? else {
        return Ok(false);
    };
    let path = path.into_path().map_err(|e| e.to_string())?;
    std::fs::write(path, contents).map_err(|e| e.to_string())?;
    Ok(true)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            ros_connect,
            ros_disconnect,
            ros_request,
            wg_generate_keypair,
            save_text_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_url_tricks_in_host() {
        assert!(validate_host("192.168.88.1").is_ok());
        assert!(validate_host("router.lan").is_ok());
        assert!(validate_host("[fe80::1]").is_ok());
        assert!(validate_host("evil.com@192.168.88.1").is_err());
        assert!(validate_host("192.168.88.1/x?").is_err());
        assert!(validate_host("a b").is_err());
    }

    #[test]
    fn rejects_paths_outside_rest() {
        assert!(validate_path("ip/firewall/filter/*1A").is_ok());
        assert!(validate_path("/system/resource").is_ok());
        assert!(validate_path("../webfig").is_err());
        assert!(validate_path("ip/address?x=1").is_err());
        assert!(validate_path("").is_err());
    }

    #[test]
    fn only_rest_methods() {
        assert!(validate_method("get").is_ok());
        assert!(validate_method("TRACE").is_err());
        assert!(validate_method("CONNECT").is_err());
    }

    #[test]
    fn fingerprint_format() {
        assert_eq!(
            pinning::fingerprint(b"abc"),
            "BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD"
        );
        assert_eq!(pinning::normalize("ba:78:16"), "BA7816");
    }
}

/// End-to-end pinning check against a live HTTPS server. Run with e.g.
/// `PIN_TEST_PORT=18443 PIN_TEST_FP=<sha256> cargo test pinning_live -- --ignored`.
#[cfg(test)]
mod live {
    use super::*;

    fn config(fp: Option<&str>) -> ConnectionConfig {
        ConnectionConfig {
            host: "127.0.0.1".into(),
            port: std::env::var("PIN_TEST_PORT").ok().and_then(|p| p.parse().ok()),
            username: "admin".into(),
            password: "x".into(),
            https: true,
            fingerprint: fp.map(String::from),
        }
    }

    async fn connect(fp: Option<&str>) -> (Result<Value, String>, Option<String>) {
        let seen = Arc::new(Mutex::new(None));
        let cfg = config(fp);
        let session = Session { client: build_client(&cfg, seen.clone()).unwrap(), config: cfg };
        let res = send(&session, Method::GET, "system/resource", None).await;
        let presented = seen.lock().unwrap().clone();
        (res, presented)
    }

    #[tokio::test]
    #[ignore]
    async fn pinning_live() {
        let expected = std::env::var("PIN_TEST_FP").unwrap();
        let (res, seen) = connect(None).await;
        assert!(res.is_err(), "unpinned connection must fail");
        assert_eq!(seen.as_deref(), Some(expected.as_str()), "fingerprint is reported");

        let (res, _) = connect(Some(&expected)).await;
        assert!(res.is_ok(), "pinned connection works: {res:?}");

        let wrong = "00".repeat(32);
        let (res, _) = connect(Some(&wrong)).await;
        assert!(res.is_err(), "wrong pin must fail");
    }
}
