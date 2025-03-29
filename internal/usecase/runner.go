package usecase

import (
	"fmt"
	"log"
	"sadabot/internal/entity"
	"time"
)

type MessageSender interface {
	Send(message, number string)
}

type TenantRepository interface {
	GetAllTenants() []entity.Tenant
}

type Runner struct {
	messageSender    MessageSender
	tenantRepository TenantRepository
}

func NewRunner(messageSender MessageSender, tenantRepository TenantRepository) *Runner {
	return &Runner{
		messageSender:    messageSender,
		tenantRepository: tenantRepository,
	}
}

func (r *Runner) Run() {
	tenants := r.tenantRepository.GetAllTenants()

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

			r.messageSender.Send(message, tenant.Phone)
		}
	}
}

func isNotificationDate(expirationDate time.Time) bool {
	today := time.Now().Truncate(24 * time.Hour)
	daysRemaining := int(expirationDate.Sub(today).Hours() / 24)

	return daysRemaining == 7 || daysRemaining == 3 || daysRemaining == 1
}
