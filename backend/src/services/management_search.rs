use crate::domain::UserId;

const MAX_SEARCH_QUERY_LENGTH: usize = 256;

#[derive(Debug, Eq, PartialEq)]
pub(super) struct ManagementSearch {
    pub exact_user_id: Option<UserId>,
    pub pattern: Option<String>,
}

pub(super) fn management_search(query: Option<String>) -> Result<ManagementSearch, ()> {
    let Some(query) = query else {
        return Ok(ManagementSearch {
            exact_user_id: None,
            pattern: None,
        });
    };
    let query = query.trim();
    if query.is_empty() {
        return Ok(ManagementSearch {
            exact_user_id: None,
            pattern: None,
        });
    }
    if query.chars().count() > MAX_SEARCH_QUERY_LENGTH || query.chars().any(char::is_control) {
        return Err(());
    }

    let id_candidate = query
        .strip_prefix("merchant_")
        .or_else(|| query.strip_prefix("user_"))
        .unwrap_or(query);
    let exact_user_id = id_candidate
        .parse::<UserId>()
        .ok()
        .filter(|user_id| *user_id > 0);

    Ok(ManagementSearch {
        exact_user_id,
        pattern: Some(format!("%{}%", escape_like_pattern(query))),
    })
}

fn escape_like_pattern(value: &str) -> String {
    let mut escaped = String::with_capacity(value.len());
    for character in value.chars() {
        if matches!(character, '\\' | '%' | '_') {
            escaped.push('\\');
        }
        escaped.push(character);
    }
    escaped
}
