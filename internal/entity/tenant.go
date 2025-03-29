package entity

type Tenant struct {
	Name                 string `json:"name"`
	Room                 int    `json:"room"`
	Phone                string `json:"phone"`
	RentalExpirationDate string `json:"rental_expiration_date"` // Format: YYYY-MM-DD
}
