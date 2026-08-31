use std::{net::IpAddr, time::Duration};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(super) enum UpstreamHttpError {
    InvalidBaseUrl,
    PrivateEndpoint,
    RequestFailed,
}

pub(super) struct PreparedUpstreamEndpoint {
    pub client: reqwest::Client,
    pub endpoint_path: String,
    pub host: String,
    pub port: u16,
    pub url: reqwest::Url,
}

pub(super) fn endpoint_url(
    base_url: &str,
    endpoint: &str,
) -> Result<reqwest::Url, UpstreamHttpError> {
    let mut url = reqwest::Url::parse(base_url).map_err(|_| UpstreamHttpError::InvalidBaseUrl)?;
    if url.scheme() != "https"
        || url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.query().is_some()
        || url.fragment().is_some()
    {
        return Err(UpstreamHttpError::InvalidBaseUrl);
    }
    let path = format!(
        "{}/{}",
        url.path().trim_end_matches('/'),
        endpoint.trim_start_matches('/')
    );
    url.set_path(&path);
    Ok(url)
}

pub(super) async fn prepare_endpoint(
    url: reqwest::Url,
    provider_id: &str,
    operation: &'static str,
    connect_timeout: Duration,
    request_timeout: Duration,
) -> Result<PreparedUpstreamEndpoint, UpstreamHttpError> {
    let host = url
        .host_str()
        .ok_or(UpstreamHttpError::InvalidBaseUrl)?
        .to_owned();
    let port = url
        .port_or_known_default()
        .ok_or(UpstreamHttpError::InvalidBaseUrl)?;
    let endpoint_path = url.path().to_owned();
    let addresses = tokio::net::lookup_host((host.as_str(), port))
        .await
        .map_err(|error| {
            tracing::warn!(
                provider_id,
                upstream_host = host,
                upstream_port = port,
                endpoint_path,
                operation,
                error = %error,
                error_kind = "dns_lookup_failed",
                "upstream DNS lookup failed"
            );
            UpstreamHttpError::RequestFailed
        })?
        .collect::<Vec<_>>();
    if addresses.is_empty() {
        tracing::warn!(
            provider_id,
            upstream_host = host,
            upstream_port = port,
            endpoint_path,
            operation,
            error_kind = "dns_no_addresses",
            "upstream DNS lookup returned no addresses"
        );
        return Err(UpstreamHttpError::RequestFailed);
    }
    if let Some((blocked_address, blocked_address_kind)) = addresses
        .iter()
        .find_map(|address| non_public_address_kind(address.ip()).map(|kind| (address.ip(), kind)))
    {
        tracing::warn!(
            provider_id,
            upstream_host = host,
            upstream_port = port,
            endpoint_path,
            operation,
            resolved_address_count = addresses.len(),
            blocked_address = %blocked_address,
            blocked_address_kind,
            error_kind = "private_endpoint",
            "upstream endpoint was blocked by address safety checks"
        );
        return Err(UpstreamHttpError::PrivateEndpoint);
    }

    let client = reqwest::Client::builder()
        .connect_timeout(connect_timeout)
        .timeout(request_timeout)
        .redirect(reqwest::redirect::Policy::none())
        .resolve_to_addrs(&host, &addresses)
        .user_agent(concat!("ModelMesh/", env!("CARGO_PKG_VERSION")))
        .build()
        .map_err(|error| {
            tracing::warn!(
                provider_id,
                upstream_host = host,
                upstream_port = port,
                endpoint_path,
                operation,
                error = %error,
                error_kind = "client_build_failed",
                "upstream HTTP client creation failed"
            );
            UpstreamHttpError::RequestFailed
        })?;

    Ok(PreparedUpstreamEndpoint {
        client,
        endpoint_path,
        host,
        port,
        url,
    })
}

#[cfg(test)]
pub(super) fn is_public_upstream_ip(address: IpAddr) -> bool {
    non_public_address_kind(address).is_none()
}

pub(super) fn non_public_address_kind(address: IpAddr) -> Option<&'static str> {
    match address {
        IpAddr::V4(address) => {
            let [first, second, third, _] = address.octets();
            if first == 0 {
                Some("current_network")
            } else if first == 10
                || (first == 172 && (16..=31).contains(&second))
                || (first == 192 && second == 168)
            {
                Some("private")
            } else if first == 127 {
                Some("loopback")
            } else if first >= 224 {
                Some("multicast_or_reserved")
            } else if first == 100 && (64..=127).contains(&second) {
                Some("shared_address_space")
            } else if first == 169 && second == 254 {
                Some("link_local")
            } else if first == 198 && (second == 18 || second == 19) {
                Some("benchmarking")
            } else if (first == 192 && second == 0 && (third == 0 || third == 2))
                || (first == 198 && second == 51 && third == 100)
                || (first == 203 && second == 0 && third == 113)
            {
                Some("documentation")
            } else {
                None
            }
        }
        IpAddr::V6(address) => {
            let segments = address.segments();
            if segments[0] & 0xe000 != 0x2000 {
                Some("non_global_unicast")
            } else if segments[0] == 0x2001 && segments[1] == 0x0db8 {
                Some("documentation")
            } else {
                None
            }
        }
    }
}
