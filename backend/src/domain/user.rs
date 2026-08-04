pub type UserId = i64;

#[derive(Debug, Clone)]
pub struct User {
    pub id: UserId,
    pub email: String,
}
