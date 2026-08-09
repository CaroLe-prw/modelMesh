const MAX_PAGE_SIZE: u32 = 100;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Pagination {
    page: u32,
    page_size: u32,
}

#[derive(Debug)]
pub struct Page<T> {
    pub items: Vec<T>,
    pub pagination: Pagination,
    pub total: u64,
}

impl Pagination {
    pub fn new(page: u32, page_size: u32) -> Option<Self> {
        (page > 0 && (1..=MAX_PAGE_SIZE).contains(&page_size)).then_some(Self { page, page_size })
    }

    pub const fn page(self) -> u32 {
        self.page
    }

    pub const fn page_size(self) -> u32 {
        self.page_size
    }

    pub const fn page_index(self) -> u32 {
        self.page - 1
    }

    pub fn total_pages(self, total: u64) -> u64 {
        total.div_ceil(u64::from(self.page_size))
    }
}

impl<T> Page<T> {
    pub const fn new(items: Vec<T>, pagination: Pagination, total: u64) -> Self {
        Self {
            items,
            pagination,
            total,
        }
    }
}

#[cfg(test)]
#[path = "../../tests/unit/pagination.rs"]
mod tests;
