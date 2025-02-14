package main

import (
	"fmt"
	"log"
	"time"
)

// WhatsApp Business API credentials
// Replace with your permanent or test token
const (
	AccessToken   string = "YOUR_ACCESS_TOKEN"
	PhoneNumberID string = "YOUR_PHONE_NUMBER_ID"
)

type Tenant struct {
	Name                 string `json:"name"`
	Room                 int    `json:"room"`
	Phone                string `json:"phone"`
	RentalExpirationDate string `json:"rental_expiration_date"` // Format: YYYY-MM-DD
}

func isNotificationDate(expirationDate time.Time) bool {
	today := time.Now().Truncate(24 * time.Hour)
	daysRemaining := int(expirationDate.Sub(today).Hours() / 24)

	return daysRemaining == 7 || daysRemaining == 3 || daysRemaining == 1
}

func readGoogleSheets() []Tenant {
	return []Tenant{
		{
			Name:                 "John Doe",
			Room:                 101,
			Phone:                "1234567890",
			RentalExpirationDate: "2025-02-21",
		},
		{
			Name:                 "Jane Smith",
			Room:                 102,
			Phone:                "0987654321",
			RentalExpirationDate: "2025-02-20",
		},
	}
}

func main() {
	tenants := readGoogleSheets()

	for _, tenant := range tenants {
		expirationDate, err := time.Parse("2006-01-02", tenant.RentalExpirationDate)
		if err != nil {
			log.Printf("Error parsing date for %s: %v", tenant.Name, err)
			continue
		}

		if isNotificationDate(expirationDate) {
			message := fmt.Sprintf(
				"Hi %s,\n\n"+
					"This is a reminder that your rental for Room %d "+
					"is expiring on %s. "+
					"Please ensure you take necessary actions.\n\n"+
					"Thank you!",
				tenant.Name,
				tenant.Room,
				tenant.RentalExpirationDate,
			)
			// recipientNumber := "62" + tenant.Phone
			fmt.Println(message)
		}
	}
}
