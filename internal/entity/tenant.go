package entity

type Tenant struct {
	ID               string  `json:"ID"`
	Name             string  `json:"name"`
	Room             int     `json:"room"`
	Phone            string  `json:"phone"`
	DueDate          string  `json:"rental_expiration_date"` // Format: YYYY-MM-DD
	ClaimedHavePaid  string  `json:"claimed_have_paid"`
	PaymentConfirmed string  `json:"payment_confirmed"`
	AmountPaid       float64 `json:"amount_paid"`
}
