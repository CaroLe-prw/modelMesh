use axum::{Router, routing::get};

use crate::{
    handlers::merchant_profile::{
        create_settlement_account, current, delete_settlement_account,
        set_default_settlement_account, update,
    },
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/merchant/profile", get(current).put(update))
        .route(
            "/merchant/settlement-accounts",
            axum::routing::post(create_settlement_account),
        )
        .route(
            "/merchant/settlement-accounts/{account_id}/default",
            axum::routing::put(set_default_settlement_account),
        )
        .route(
            "/merchant/settlement-accounts/{account_id}",
            axum::routing::delete(delete_settlement_account),
        )
}
