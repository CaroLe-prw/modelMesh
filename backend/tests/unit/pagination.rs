use super::{Page, Pagination};

#[test]
fn pagination_has_safe_bounds_and_page_index() {
    let pagination = Pagination::new(3, 20).expect("pagination should be valid");

    assert_eq!(pagination.page(), 3);
    assert_eq!(pagination.page_size(), 20);
    assert_eq!(pagination.page_index(), 2);
    assert_eq!(pagination.total_pages(41), 3);
    assert_eq!(Pagination::new(0, 20), None);
    assert_eq!(Pagination::new(1, 0), None);
    assert_eq!(Pagination::new(1, 101), None);
}

#[test]
fn page_keeps_items_request_and_total_together() {
    let pagination = Pagination::new(2, 20).expect("pagination should be valid");
    let page = Page::new(vec!["api-key"], pagination, 21);

    assert_eq!(page.items, vec!["api-key"]);
    assert_eq!(page.pagination, pagination);
    assert_eq!(page.total, 21);
}
