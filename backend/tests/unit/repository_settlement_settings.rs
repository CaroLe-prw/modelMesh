use time::OffsetDateTime;

use crate::{
    domain::{MerchantSettlementMethod, MerchantSettlementNetwork},
    entity::{merchant_settlement_method_setting, merchant_settlement_network_setting},
};

use super::settings_from_models;

fn timestamp(seconds: i64) -> OffsetDateTime {
    OffsetDateTime::from_unix_timestamp(seconds).expect("timestamp should be valid")
}

#[test]
fn settings_models_keep_only_enabled_options_in_database_order() {
    let methods = ["bank", "alipay", "usdt"]
        .into_iter()
        .enumerate()
        .map(
            |(index, method)| merchant_settlement_method_setting::Model {
                method: method.to_owned(),
                is_enabled: matches!(method, "bank" | "usdt"),
                sort_order: (index as i16 + 1) * 10,
                updated_by: Some(1),
                updated_at: timestamp(1_788_140_000 + index as i64),
            },
        )
        .collect();
    let networks = ["TRC20", "ERC20", "BEP20", "POLYGON"]
        .into_iter()
        .enumerate()
        .map(
            |(index, network)| merchant_settlement_network_setting::Model {
                network: network.to_owned(),
                is_enabled: matches!(network, "TRC20" | "BEP20"),
                sort_order: (index as i16 + 1) * 10,
                updated_by: Some(1),
                updated_at: timestamp(1_788_140_010 + index as i64),
            },
        )
        .collect();

    let settings = settings_from_models(methods, networks).expect("settings should map");

    assert_eq!(
        settings.enabled_methods,
        [
            MerchantSettlementMethod::Bank,
            MerchantSettlementMethod::Usdt
        ]
    );
    assert_eq!(
        settings.enabled_networks,
        [
            MerchantSettlementNetwork::Trc20,
            MerchantSettlementNetwork::Bep20
        ]
    );
}
